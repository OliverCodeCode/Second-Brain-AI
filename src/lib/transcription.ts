/**
 * Audio transcription using OpenAI Whisper.
 *
 * When OPENAI_API_KEY is set: calls the Whisper API to transcribe audio.
 * When not set: returns a friendly stub message.
 *
 * This module is server-only — it accesses process.env and calls the
 * OpenAI API. Wrap calls in a server function before exposing to the client.
 */

export async function transcribeAudio(
  userId: string,
  audioBase64: string,
): Promise<string> {
  const isAIEnabled = Boolean(process.env.OPENAI_API_KEY);

  if (!isAIEnabled) {
    return getStubTranscription();
  }

  return callWhisper(audioBase64);
}

// ─── Whisper API ──────────────────────────────────────────────────

async function callWhisper(audioBase64: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;

  // Convert base64 to a Buffer, then to a Blob for FormData
  const audioBuffer = Buffer.from(audioBase64, "base64");

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/webm" }),
    "recording.webm",
  );
  formData.append("model", "whisper-1");
  formData.append("response_format", "text");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${err}`);
  }

  const text = await response.text();
  return text.trim() || "[No speech detected]";
}

// ─── Stub ─────────────────────────────────────────────────────────

const STUB_TRANSCRIPTIONS = [
  "Voice transcription will be available once OpenAI is connected. In the meantime, you can type or edit this placeholder text.",
  "Your voice note was captured! To enable automatic transcription, connect an OpenAI API key in your environment settings.",
  "Audio recorded successfully. Transcription requires an OpenAI API key — connect one to turn speech into text automatically.",
];

let stubCounter = 0;

function getStubTranscription(): string {
  const idx = stubCounter++ % STUB_TRANSCRIPTIONS.length;
  return STUB_TRANSCRIPTIONS[idx];
}
