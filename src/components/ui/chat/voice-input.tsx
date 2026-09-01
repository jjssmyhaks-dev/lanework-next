/**
 * VoiceInput — Web Speech API component for hands-free chat.
 *
 * Shows a mic button. When clicked:
 * - Starts recording (visual pulse animation)
 * - Transcribes speech to text in real-time
 * - Supports Hindi and English (Hinglish-friendly)
 * - On stop, calls onTranscript(text) so the parent can send it
 *
 * Requires browser support for SpeechRecognition (webkitSpeechRecognition).
 * Falls back to a disabled state if unsupported.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Check browser support
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}

export default function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Indian English — works well with Hinglish
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) setInterimText(interim);
      if (final) {
        onTranscript(final.trim());
        setInterimText("");
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      // If we have interim text but no final, use the interim
      if (interimText) {
        onTranscript(interimText.trim());
        setInterimText("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, disabled, onTranscript, interimText]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return (
      <button
        disabled
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-300 cursor-not-allowed",
          className
        )}
        title="Voice input not supported in this browser"
        aria-label="Voice input not available"
      >
        <MicOff className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-all duration-200",
          isListening
            ? "border-red-300 bg-red-50 text-red-600 animate-pulse shadow-lg shadow-red-100"
            : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        title={isListening ? "Stop listening" : "Start voice input"}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
      >
        {isListening ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Interim transcript bubble */}
      {isListening && interimText && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap max-w-[200px] truncate shadow-lg">
          {interimText}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
}
