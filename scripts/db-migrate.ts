/**
 * DB Migration Script — Dry-run / SQL generator
 *
 * Reads prisma/schema.prisma and prints the SQL that would be generated
 * to create all tables. This is a DRY-RUN only: does NOT execute any SQL.
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/db-migrate.ts
 *    or: npx tsx scripts/db-migrate.ts
 */

import * as fs from "fs";
import * as path from "path";

interface Column {
  name: string;
  type: string;
  constraints: string[];
  defaultValue?: string;
}

interface Table {
  name: string;
  columns: Column[];
  uniques: string[];
}

/**
 * Parse a Prisma schema file and extract model definitions as SQL-ready tables.
 * This is a simplified parser that handles the Prisma file format.
 */
function parsePrismaSchema(schemaPath: string): Table[] {
  const content = fs.readFileSync(schemaPath, "utf-8");
  const tables: Table[] = [];

  // Match model blocks: model Name { ... }
  const modelRegex = /model\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  let modelMatch: RegExpExecArray | null;

  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const body = modelMatch[2];
    const columns: Column[] = [];
    const uniques: string[] = [];

    // Parse field lines
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Skip comment-only lines and decorator-only lines (e.g. @@map, @@unique)
      if (line.startsWith("//")) continue;

      const uniqueMatch = line.match(/@@unique\(\[(.+?)\]\)/);
      if (uniqueMatch) {
        const cols = uniqueMatch[1].split(",").map((c) => c.trim());
        uniques.push(`UNIQUE(${cols.join(", ")})`);
        continue;
      }

      const mapMatch = line.match(/@@map\("(.+?)"\)/);
      if (mapMatch) continue; // handled elsewhere

      // Parse field: name Type constraints? @map("db_name")?
      const fieldMatch = line.match(
        /^(\w+)\s+(\w+(?:\([^)]*\))?)(\?)?\s*(.*?)$/
      );
      if (!fieldMatch) continue;

      const [, fieldName, rawType, isOptional, rest] = fieldMatch;

      // Skip relation fields for now (they reference other models)
      // Only include scalar types
      const scalarTypes = [
        "String",
        "Int",
        "Float",
        "Boolean",
        "DateTime",
        "Json",
        "Bytes",
        "BigInt",
        "Decimal",
      ];
      if (!scalarTypes.includes(rawType.replace(/\(.*\)/, ""))) continue;

      // Extract @map("db_column_name")
      let dbName = fieldName;
      const dbMapMatch = rest.match(/@map\("(.+?)"\)/);
      if (dbMapMatch) dbName = dbMapMatch[1];

      // Map Prisma type → PostgreSQL type
      const pgType = prismaToPostgres(rawType);

      // Constraints
      const constraints: string[] = [];
      let defaultValue: string | undefined;

      if (rest.includes("@id")) constraints.push("PRIMARY KEY");
      if (rest.includes("@unique")) constraints.push("UNIQUE");
      if (rest.includes("@default(now())"))
        defaultValue = "NOW()";
      else if (rest.includes("@default(autoincrement())"))
        defaultValue = undefined; // SERIAL type handles this
      else {
        const defaultMatch = rest.match(
          /@default\(([^)]+)\)/
        );
        if (defaultMatch) {
          const val = defaultMatch[1];
          if (val.startsWith('"') || val.startsWith("'")) {
            defaultValue = val.slice(1, -1);
          } else if (val === "true" || val === "false") {
            defaultValue = val.toUpperCase();
          } else if (!isNaN(Number(val))) {
            defaultValue = val;
          } else {
            defaultValue = val;
          }
        }
      }

      if (!isOptional && !constraints.includes("PRIMARY KEY")) {
        constraints.push("NOT NULL");
      }
      // For primary key columns, NOT NULL is implicit

      columns.push({
        name: dbName,
        type: pgType,
        constraints,
        defaultValue,
      });
    }

    tables.push({ name: modelName, columns, uniques });
  }

  return tables;
}

function prismaToPostgres(prismaType: string): string {
  const clean = prismaType.replace(/\(.*\)/, "");
  switch (clean) {
    case "String":
      return "TEXT";
    case "Int":
      return "INTEGER";
    case "Float":
      return "REAL";
    case "Boolean":
      return "BOOLEAN";
    case "DateTime":
      return "TIMESTAMP";
    case "Json":
      return "JSONB";
    case "BigInt":
      return "BIGINT";
    case "Decimal":
      return "DECIMAL";
    default:
      return "TEXT";
  }
}

function resolveTableName(tables: Table[], modelName: string): string {
  // By default Prisma maps to model name; we use @@map for actual names
  // For now, return the model name as-is (Prisma would handle mapping)
  return modelName;
}

function generateCreateTableSQL(tables: Table[]): string {
  const statements: string[] = [];

  for (const table of tables) {
    const colDefs = table.columns.map((col) => {
      const parts: string[] = [`  "${col.name}" ${col.type}`];
      parts.push(...col.constraints);
      if (col.defaultValue) {
        parts.push(`DEFAULT ${col.defaultValue}`);
      }
      return parts.join(" ");
    });

    // Add unique constraints from @@unique directives
    if (table.uniques.length > 0) {
      colDefs.push(...table.uniques.map((u) => `  ${u}`));
    }

    // Use snake_case table name matching Prisma's default convention
    const tableName = table.name.charAt(0).toLowerCase() + table.name.slice(1).replace(/([A-Z])/g, "_$1").toLowerCase();

    statements.push(
      `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs.join(",\n")}\n);`
    );
  }

  return statements.join("\n\n");
}

// ── Main ──

function main() {
  const schemaPath = path.resolve(__dirname, "..", "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    console.error("❌ schema.prisma not found at", schemaPath);
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Lanework DB Migration — Dry Run (SQL)      ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const tables = parsePrismaSchema(schemaPath);

  console.log(`📊 Found ${tables.length} models in schema.prisma\n`);

  // Print each table summary
  for (const table of tables) {
    const colCount = table.columns.length;
    const pks = table.columns
      .filter((c) => c.constraints.includes("PRIMARY KEY"))
      .map((c) => c.name);
    console.log(
      `  • ${table.name} (${colCount} columns, PK: ${pks.join(", ") || "none"})`
    );
  }

  console.log("\n" + "─".repeat(60));
  console.log("📝 Generated SQL (CREATE TABLE statements):\n");

  const sql = generateCreateTableSQL(tables);
  console.log(sql);

  console.log(
    "\n" + "─".repeat(60)
  );
  console.log(
    "✅ Dry-run complete. No SQL was executed against the database."
  );
  console.log(
    "   The schema is designed to map to your EXISTING database tables."
  );
  console.log(
    "   To generate the Prisma client: npx prisma generate"
  );
  console.log(
    "   To create a migration (when ready): npx prisma migrate dev --name init"
  );
}

main();
