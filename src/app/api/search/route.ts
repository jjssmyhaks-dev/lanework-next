import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const sql = neon(process.env.DATABASE_URL!);

type SearchType = "shipments" | "inventory" | "customers";

interface SearchResult {
  type: SearchType;
  id: string;
  title: string;
  description: string;
  href: string;
  relevance: number;
}

const MAX_RESULTS = 20;

/** Sanitise a raw user query for PostgreSQL to_tsquery — prefix-match on each word */
function sanitiseQuery(raw: string): string {
  return raw
    .replace(/[^\w\s-]/g, " ") // strip special chars
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");
}

export async function POST(request: Request) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const rl = rateLimit(request, { maxRequests: 30, windowMs: 60_000, group: "search" });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded. Try again shortly.", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const query: string = (body.query || "").trim();
    const types: SearchType[] | undefined = body.types;

    // ── Empty query ───────────────────────────────────────────────────────
    if (!query) {
      return NextResponse.json({ results: [], message: "Enter a search term to begin.", query: "" });
    }

    const tsQuery = sanitiseQuery(query);
    if (!tsQuery) {
      return NextResponse.json({ results: [], message: "Enter a search term to begin.", query });
    }

    // Determine which types to search
    const searchAll = !types || types.length === 0;
    const searchShipments = searchAll || types.includes("shipments");
    const searchInventory = searchAll || types.includes("inventory");
    const searchCustomers = searchAll || types.includes("customers");

    // ── Execute searches in parallel ──────────────────────────────────────
    const promises: Promise<SearchResult[]>[] = [];

    if (searchShipments) {
      promises.push(
        sql`
          SELECT
            'shipments' AS type,
            s.id,
            s.tracking_number,
            s.carrier,
            s.status,
            s.destination,
            s.customer_name,
            ts_rank(
              to_tsvector('english',
                COALESCE(s.tracking_number, '') || ' ' ||
                COALESCE(s.carrier, '') || ' ' ||
                COALESCE(s.status, '') || ' ' ||
                COALESCE(s.destination, '') || ' ' ||
                COALESCE(s.customer_name, '')
              ),
              to_tsquery('english', ${tsQuery})
            ) AS relevance
          FROM shipments s
          WHERE
            to_tsvector('english',
              COALESCE(s.tracking_number, '') || ' ' ||
              COALESCE(s.carrier, '') || ' ' ||
              COALESCE(s.status, '') || ' ' ||
              COALESCE(s.destination, '') || ' ' ||
              COALESCE(s.customer_name, '')
            ) @@ to_tsquery('english', ${tsQuery})
          ORDER BY relevance DESC
          LIMIT ${MAX_RESULTS}
        `.then((rows: any[]) =>
          rows.map((r) => ({
            type: "shipments" as SearchType,
            id: r.id,
            title: r.tracking_number,
            description: `${r.carrier || "—"} · ${r.status} · ${r.destination || r.customer_name || "—"}`,
            href: `/shipment`,
            relevance: Number(r.relevance),
          }))
        )
      );
    }

    if (searchInventory) {
      promises.push(
        sql`
          SELECT
            'inventory' AS type,
            i.id,
            i.sku,
            i.name,
            i.warehouse,
            i.location,
            ts_rank(
              to_tsvector('english',
                COALESCE(i.sku, '') || ' ' ||
                COALESCE(i.name, '') || ' ' ||
                COALESCE(i.warehouse, '') || ' ' ||
                COALESCE(i.location, '')
              ),
              to_tsquery('english', ${tsQuery})
            ) AS relevance
          FROM inventory i
          WHERE
            to_tsvector('english',
              COALESCE(i.sku, '') || ' ' ||
              COALESCE(i.name, '') || ' ' ||
              COALESCE(i.warehouse, '') || ' ' ||
              COALESCE(i.location, '')
            ) @@ to_tsquery('english', ${tsQuery})
          ORDER BY relevance DESC
          LIMIT ${MAX_RESULTS}
        `.then((rows: any[]) =>
          rows.map((r) => ({
            type: "inventory" as SearchType,
            id: r.id,
            title: r.name,
            description: `SKU: ${r.sku}${r.warehouse ? ` · ${r.warehouse}` : ""}${r.location ? ` · ${r.location}` : ""}`,
            href: `/inventory`,
            relevance: Number(r.relevance),
          }))
        )
      );
    }

    if (searchCustomers) {
      promises.push(
        sql`
          SELECT
            'customers' AS type,
            c.id,
            c.name,
            c.phone,
            c.email,
            c.address,
            ts_rank(
              to_tsvector('english',
                COALESCE(c.name, '') || ' ' ||
                COALESCE(c.phone, '') || ' ' ||
                COALESCE(c.email, '') || ' ' ||
                COALESCE(c.address, '')
              ),
              to_tsquery('english', ${tsQuery})
            ) AS relevance
          FROM customers c
          WHERE
            to_tsvector('english',
              COALESCE(c.name, '') || ' ' ||
              COALESCE(c.phone, '') || ' ' ||
              COALESCE(c.email, '') || ' ' ||
              COALESCE(c.address, '')
            ) @@ to_tsquery('english', ${tsQuery})
          ORDER BY relevance DESC
          LIMIT ${MAX_RESULTS}
        `.then((rows: any[]) =>
          rows.map((r) => ({
            type: "customers" as SearchType,
            id: r.id,
            title: r.name,
            description: [r.phone, r.email, r.address].filter(Boolean).join(" · ") || "—",
            href: `/customer`,
            relevance: Number(r.relevance),
          }))
        )
      );
    }

    const settledResults = await Promise.allSettled(promises);
    const allResults: SearchResult[] = [];
    const errors: string[] = [];
    for (const r of settledResults) {
      if (r.status === "fulfilled") {
        allResults.push(...r.value);
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error("Search sub-query failed:", msg);
        errors.push(msg);
      }
    }

    // ── Rank across all types, limit to MAX_RESULTS ───────────────────────
    const ranked = allResults
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, MAX_RESULTS);

    // ── No results ────────────────────────────────────────────────────────
    if (ranked.length === 0) {
      return NextResponse.json({
        results: [],
        message: `No results found for '${query}'`,
        query,
      });
    }

    return NextResponse.json({ results: ranked, message: null, query });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Search API error:", message);
    return NextResponse.json(
      { error: "Search failed", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
