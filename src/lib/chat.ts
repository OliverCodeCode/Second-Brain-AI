/**
 * AI Chat system for Second Brain AI.
 * In-memory conversation store with stub AI responses.
 *
 * When OPENAI_API_KEY is set: uses gpt-4o-mini with memory context injection.
 * When not set: returns friendly stub response.
 */
import { randomUUID } from "node:crypto";
import { saveMemory, getRelevantMemories } from "./memory";

// ─── Types ──────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  memoriesReferenced: string[];
  createdAt: string;
}

// ─── In-memory stores ───────────────────────────────────────────

const conversationsById = new Map<string, Conversation>();
const messagesById = new Map<string, Message>();
const messageIdsByConversation = new Map<string, string[]>(); // convId → msg IDs
const conversationIdsByUser = new Map<string, string[]>(); // userId → conv IDs

// ─── Public API ─────────────────────────────────────────────────

export async function sendMessage(
  userId: string,
  conversationId: string,
  content: string,
): Promise<{ userMessage: Message; assistantMessage: Message }> {
  // Ensure conversation exists
  let conv = conversationsById.get(conversationId);
  if (!conv) {
    conv = {
      id: conversationId,
      userId,
      title: content.slice(0, 60) + (content.length > 60 ? "…" : ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    conversationsById.set(conv.id, conv);

    const userConvs = conversationIdsByUser.get(userId) ?? [];
    userConvs.unshift(conv.id);
    conversationIdsByUser.set(userId, userConvs);
  } else {
    conv.updatedAt = new Date().toISOString();
  }

  // Save user message
  const userMsg: Message = {
    id: randomUUID(),
    conversationId,
    role: "user",
    content,
    memoriesReferenced: [],
    createdAt: new Date().toISOString(),
  };
  messagesById.set(userMsg.id, userMsg);
  addMessageToConversation(conversationId, userMsg.id);

  // Save user message to persistent memory
  saveMemory(userId, content, "chat", {
    conversationId,
    messageId: userMsg.id,
    role: "user",
  }).catch(() => {}); // fire-and-forget so chat feels fast

  // Retrieve relevant past memories for AI context
  let relevantMemories = await getRelevantMemories(userId, content, 5);

  // Build conversation history for context
  const history = getConversationHistory(conversationId)
    .slice(-10) // last 10 messages for context window
    .map((m) => ({ role: m.role, content: m.content }));

  // Call AI (or stub)
  const isAIEnabled = Boolean(process.env.OPENAI_API_KEY);
  let aiContent: string;
  let memoryIds: string[] = [];

  if (isAIEnabled) {
    const result = await callOpenAI(userId, history, content, relevantMemories);
    aiContent = result.content;
    memoryIds = result.memoryIds;
  } else {
    aiContent = getStubResponse(content);
    memoryIds = relevantMemories.map((m) => m.id);
  }

  // Save assistant message
  const assistantMsg: Message = {
    id: randomUUID(),
    conversationId,
    role: "assistant",
    content: aiContent,
    memoriesReferenced: memoryIds,
    createdAt: new Date().toISOString(),
  };
  messagesById.set(assistantMsg.id, assistantMsg);
  addMessageToConversation(conversationId, assistantMsg.id);

  // Save assistant response to memory
  saveMemory(userId, aiContent, "chat", {
    conversationId,
    messageId: assistantMsg.id,
    role: "assistant",
    memoriesReferenced: memoryIds,
  }).catch(() => {});

  // Update conversation title from first exchange if still generic
  if (conv.title === content.slice(0, 60) + (content.length > 60 ? "…" : "")) {
    // Try to generate a better title from first exchange
    conv.title = generateTitle(content, aiContent);
  }

  return { userMessage: userMsg, assistantMessage: assistantMsg };
}

export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  const ids = conversationIdsByUser.get(userId) ?? [];
  return ids
    .map((id) => conversationsById.get(id)!)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  return conversationsById.get(conversationId) ?? null;
}

export async function getMessages(
  conversationId: string,
): Promise<Message[]> {
  const ids = messageIdsByConversation.get(conversationId) ?? [];
  return ids.map((id) => messagesById.get(id)!).filter(Boolean);
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  const conv = conversationsById.get(conversationId);
  if (!conv || conv.userId !== userId) return;

  // Delete messages
  const msgIds = messageIdsByConversation.get(conversationId) ?? [];
  for (const id of msgIds) {
    messagesById.delete(id);
  }
  messageIdsByConversation.delete(conversationId);
  conversationsById.delete(conversationId);

  // Remove from user list
  const userConvs = conversationIdsByUser.get(userId) ?? [];
  conversationIdsByUser.set(
    userId,
    userConvs.filter((id) => id !== conversationId),
  );
}

// ─── Internal helpers ───────────────────────────────────────────

function addMessageToConversation(
  conversationId: string,
  messageId: string,
): void {
  const ids = messageIdsByConversation.get(conversationId) ?? [];
  ids.push(messageId);
  messageIdsByConversation.set(conversationId, ids);
}

function getConversationHistory(conversationId: string): Message[] {
  const ids = messageIdsByConversation.get(conversationId) ?? [];
  return ids.map((id) => messagesById.get(id)!).filter(Boolean);
}

function generateTitle(userContent: string, aiContent: string): string {
  // Simple title generation: take first sentence or truncate
  const text = userContent.replace(/\n/g, " ").trim();
  const firstSentence = text.split(/[.!?]/)[0] ?? text;
  return firstSentence.slice(0, 50) + (firstSentence.length > 50 ? "…" : "");
}

// ─── Stub AI responses ──────────────────────────────────────────

const STUB_RESPONSES = [
  "I'm Second Brain AI! I'll remember everything you tell me. I'm designed to be your personal memory assistant — every conversation we have builds your second brain. (AI connection pending — connect OpenAI to unlock full responses.)",
  "Great question! As your personal memory assistant, I'm here to help you capture thoughts, recall past conversations, and stay organized. Right now I'm running in stub mode — connect an OpenAI key to unlock my full capabilities.",
  "I hear you! Once connected to OpenAI, I'll be able to reference our past conversations and all your stored memories to give you truly contextual responses. For now, I'm keeping things simple, but I'm still saving everything you tell me.",
  "Thanks for sharing that with me. I'm saving it to your memory now. When OpenAI is connected, I'll be able to cross-reference this with other memories and give you smarter, more personalized responses.",
  "That's interesting! Your second brain is growing with every message. Right now I can save everything, but with OpenAI connected, I'll also be able to analyze patterns across your memories and surface insights you might have forgotten.",
];

let stubCounter = 0;

function getStubResponse(userMessage: string): string {
  // Vary the stub response based on message content for a more natural feel
  const lower = userMessage.toLowerCase();
  const idx = stubCounter++ % STUB_RESPONSES.length;

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello! 👋 I'm Second Brain AI, your personal memory assistant. I'll remember everything you tell me and surface it whenever you need it. (AI connection pending — connect OpenAI to unlock full responses.)`;
  }

  if (lower.includes("?")) {
    return STUB_RESPONSES[idx];
  }

  return `Got it! I'm saving this to your second brain. Every note, thought, and conversation builds your personal AI memory. Once OpenAI is connected, I'll be able to give you truly contextual, intelligent responses that draw from everything we've discussed. (Connect OPENAI_API_KEY to unlock.)`;
}

// ─── OpenAI integration ─────────────────────────────────────────

interface OpenAICallResult {
  content: string;
  memoryIds: string[];
}

async function callOpenAI(
  userId: string,
  history: { role: string; content: string }[],
  userMessage: string,
  relevantMemories: Awaited<ReturnType<typeof getRelevantMemories>>,
): Promise<OpenAICallResult> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const memoryContext =
    relevantMemories.length > 0
      ? `\n\nRelevant past memories:\n${relevantMemories
          .map(
            (m, i) =>
              `[${i + 1}] ${new Date(m.createdAt).toLocaleDateString()} — ${m.content.slice(0, 200)}`,
          )
          .join("\n")}`
      : "";

  const systemPrompt = `You are Second Brain AI, a personal memory assistant. You have access to the user's saved memories, notes, conversations, and documents. You help them recall information, plan tasks, and stay organized.

Key behaviors:
- Reference past memories naturally in conversation (e.g., "Based on what you mentioned earlier about...")
- Be concise and helpful — users are often on mobile
- If the user asks about something you don't have in memory, be honest
- Proactively suggest capturing important information
- Use a warm, professional tone — like a smart personal assistant${memoryContext}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8), // last 8 for context
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content ?? "I'm not sure how to respond to that.";

  return {
    content,
    memoryIds: relevantMemories.map((m) => m.id),
  };
}
