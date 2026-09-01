/**
 * POST /api/voice/transcribe — Deepgram speech-to-text endpoint.
 *
 * Receives audio blob from the client, sends to Deepgram for transcription,
 * and returns the transcribed text. Supports Hindi and English.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "voice-transcribe" });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

export const POST = withAuth(async (request) => {
  try {
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 503 }
      );
    }

    const audioBlob = await request.blob();

    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json(
        { error: "No audio data received" },
        { status: 400 }
      );
    }

    // Call Deepgram API
    const url = new URL(DEEPGRAM_URL);
    url.searchParams.set("model", "nova-2");
    url.searchParams.set("language", "en-IN");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("diarize", "false");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("profanity_filter", "false");
    url.searchParams.set("redact", "false");
    url.searchParams.set("utterances", "false");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: audioBlob,
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error({ status: response.status, err: errText }, "Deepgram API error");
      return NextResponse.json(
        { error: `Transcription failed: ${response.status}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (!transcript.trim()) {
      return NextResponse.json({ text: "", confidence: 0 });
    }

    const confidence =
      result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    log.info({ transcript: transcript.slice(0, 50), confidence }, "Transcription complete");

    return NextResponse.json({ text: transcript.trim(), confidence });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: msg }, "Transcription failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
