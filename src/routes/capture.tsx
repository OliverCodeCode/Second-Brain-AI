import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";
import { saveMemory } from "~/lib/memory";
import { transcribeAudio } from "~/lib/transcription";
import { useState, useRef, useCallback, useEffect } from "react";

// ─── Server Functions ─────────────────────────────────────────────

const transcribeAction = createServerFn({ method: "POST" })
  .validator((input: { userId: string; audioBase64: string }) => input)
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) throw new Error("Not authenticated");

    const text = await transcribeAudio(user.id, data.audioBase64);
    return { text };
  });

const saveMemoryAction = createServerFn({ method: "POST" })
  .validator(
    (input: { userId: string; content: string; metadata?: Record<string, unknown> }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) throw new Error("Not authenticated");

    const memory = await saveMemory(user.id, data.content, "voice", data.metadata ?? {});
    return { id: memory.id, createdAt: memory.createdAt };
  });

// ─── Route ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/capture")({
  loader: () => getAuth(),
  component: CapturePage,
});

function CapturePage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to capture
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You need an account to capture thoughts and memories.
        </p>
        <a
          href="/login"
          className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Log in
        </a>
      </div>
    );
  }

  return <CaptureInterface userId={user.id} />;
}

// ─── Capture Interface ────────────────────────────────────────────

type CaptureState = "idle" | "recording" | "reviewing";

function CaptureInterface({ userId }: { userId: string }) {
  const [state, setState] = useState<CaptureState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  // ─── Start Recording ──────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        // Transcribe
        setIsTranscribing(true);
        setState("reviewing");

        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType,
          });
          const base64 = await blobToBase64(blob);
          const result = await transcribeAction({
            userId,
            audioBase64: base64,
          });
          setTranscript(result.text);
        } catch (err) {
          console.error("Transcription error:", err);
          setTranscript(
            "Voice note captured. Transcription is currently unavailable — you can type your note below.",
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setState("recording");
      setElapsed(0);
      setSaved(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      setError(
        "Could not access the microphone. Please check your browser permissions.",
      );
    }
  }, [userId]);

  // ─── Stop Recording ───────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  // ─── Save ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const content = transcript.trim();
    if (!content || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveMemoryAction({
        userId,
        content,
        metadata: { capturedVia: "voice", durationSec: elapsed },
      });
      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [transcript, userId, elapsed, isSaving]);

  // ─── Reset ────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setState("idle");
    setElapsed(0);
    setTranscript("");
    setSaved(false);
    setError(null);
    setIsTranscribing(false);
    setIsSaving(false);
  }, []);

  // ─── Format elapsed time ──────────────────────────────────────

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Capture
          </h1>
          {state === "reviewing" && !saved && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Discard
            </button>
          )}
          {saved && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              New recording
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-24">
        {error && (
          <div className="mb-6 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Idle State ──────────────────────────────────────── */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={startRecording}
              className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-95"
              aria-label="Start recording"
            >
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Tap to record a thought
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Speak your mind — we'll transcribe and save it
            </p>
          </div>
        )}

        {/* ── Recording State ─────────────────────────────────── */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={stopRecording}
              className="group relative flex h-28 w-28 items-center justify-center"
              aria-label="Stop recording"
            >
              {/* Outer pulsing ring */}
              <span className="absolute inset-0 animate-ping rounded-full border-4 border-red-400/60" />
              {/* Solid red ring */}
              <span className="absolute inset-0 rounded-full border-4 border-red-500" />
              {/* Inner button */}
              <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform active:scale-95">
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </span>
            </button>
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-3xl font-semibold tabular-nums text-red-500">
                {formatTime(elapsed)}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Recording — tap to stop
              </span>
            </div>
          </div>
        )}

        {/* ── Reviewing State ─────────────────────────────────── */}
        {state === "reviewing" && (
          <div className="flex w-full flex-col gap-4">
            {saved ? (
              /* Saved confirmation */
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg
                    className="h-10 w-10 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Saved to memory
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your voice note has been saved and is now searchable.
                </p>
                <a
                  href="/memory"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View in Memory →
                </a>
              </div>
            ) : (
              <>
                {/* Duration badge */}
                <div className="flex items-center gap-2 self-start rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatTime(elapsed)}
                </div>

                {/* Transcription textarea */}
                <div className="relative">
                  {isTranscribing && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/80 pt-8 dark:bg-gray-900/80">
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                        <span className="ml-1">Transcribing...</span>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Transcription will appear here..."
                    rows={6}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                  />
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!transcript.trim() || isSaving || isTranscribing}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                        />
                      </svg>
                      Save to memory
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </main>

      <BottomNav currentPath="/capture" />
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Strip "data:audio/webm;base64," prefix
        const base64 = reader.result.split(",")[1];
        resolve(base64 ?? "");
      } else {
        reject(new Error("Failed to read blob as base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
