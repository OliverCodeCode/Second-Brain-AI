import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";
import { sendMessage, getConversations, getMessages, deleteConversation } from "~/lib/chat";
import type { Message as MessageType } from "~/lib/chat";
import { useState, useEffect, useRef, useCallback } from "react";

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Server Functions ───────────────────────────────────────────

const chatAction = createServerFn({ method: "POST" })
  .validator((input: { conversationId: string; message: string }) => input)
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) throw new Error("Not authenticated");

    const result = await sendMessage(user.id, data.conversationId, data.message);
    return {
      userMessage: {
        ...result.userMessage,
        createdAt: result.userMessage.createdAt,
      },
      assistantMessage: {
        ...result.assistantMessage,
        createdAt: result.assistantMessage.createdAt,
      },
    };
  });

const loadConversations = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) return [];

    const convs = await getConversations(user.id);
    return convs.map((c) => ({ ...c }));
  },
);

const loadMessages = createServerFn({ method: "GET" })
  .validator((input: { conversationId: string }) => input)
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) return [];

    const msgs = await getMessages(data.conversationId);
    return msgs.map((m) => ({ ...m }));
  });

const deleteConversationAction = createServerFn({ method: "POST" })
  .validator((input: { conversationId: string }) => input)
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) throw new Error("Not authenticated");

    await deleteConversation(user.id, data.conversationId);
    return { success: true };
  });

// ─── Route ──────────────────────────────────────────────────────

export const Route = createFileRoute("/chat")({
  loader: () => getAuth(),
  component: ChatPage,
});

// ─── Component ──────────────────────────────────────────────────

function ChatPage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">💬</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to chat
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your AI memory assistant is ready to help.
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

  return <ChatInterface userId={user.id} />;
}

// ─── Chat Interface ─────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function ChatInterface({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations().then(setConversations);
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    loadMessages({ conversationId: activeConvId }).then((msgs) => {
      setMessages(msgs);
      // If the last message is an assistant message that just arrived,
      // animate it
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role === "assistant") {
        setTypingMessageId(lastMsg.id);
      }
    });
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingMessageId]);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConvId]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    setIsLoading(true);

    // Generate a conversation ID if needed
    const convId = activeConvId || generateId();
    if (!activeConvId) {
      setActiveConvId(convId);
    }

    // Optimistically add user message
    const optimisticUser: MessageType = {
      id: generateId(),
      conversationId: convId,
      role: "user",
      content: text,
      memoriesReferenced: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const result = await chatAction({
        conversationId: convId,
        message: text,
      });

      // Replace optimistic message with real one and add AI response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticUser.id);
        return [
          ...filtered,
          { ...result.userMessage, id: result.userMessage.id },
          { ...result.assistantMessage, id: result.assistantMessage.id },
        ];
      });

      // Start typing animation for new AI message
      setTypingMessageId(result.assistantMessage.id);

      // Refresh conversation list
      loadConversations().then(setConversations);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, activeConvId]);

  const handleNewChat = useCallback(() => {
    setActiveConvId("");
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      await deleteConversationAction({ conversationId: convId });
      if (activeConvId === convId) {
        setActiveConvId("");
        setMessages([]);
      }
      loadConversations().then(setConversations);
    },
    [activeConvId],
  );

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-3 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle conversations"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title ??
                  "Chat"
                : "New Chat"}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
            aria-label="New chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Conversations
              </h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* New Chat button */}
            <div className="p-3">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 p-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-indigo-950"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                New Chat
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  No conversations yet. Start chatting!
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center border-b border-gray-50 dark:border-gray-800/50 ${
                      activeConvId === conv.id
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setSidebarOpen(false);
                      }}
                      className="flex-1 px-4 py-3 text-left"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                        {conv.title}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(conv.updatedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="mr-2 hidden rounded p-1 text-gray-300 hover:text-red-500 group-hover:block dark:text-gray-600 dark:hover:text-red-400"
                      aria-label="Delete conversation"
                    >
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
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !activeConvId ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
              <span className="text-3xl">🧠</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Second Brain
            </h2>
            <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Ask me anything, capture thoughts, or just chat. I'll remember
              everything.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "What can you help with?",
                "Remember that I have a meeting tomorrow",
                "Summarize our conversation",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setInputValue(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isTyping={typingMessageId === msg.id}
                onTypingComplete={() => setTypingMessageId(null)}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mx-auto flex max-w-lg items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message your Second Brain..."
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>

      <BottomNav currentPath="/chat" />
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────

function MessageBubble({
  message,
  isTyping,
  onTypingComplete,
}: {
  message: MessageType;
  isTyping: boolean;
  onTypingComplete: () => void;
}) {
  const isUser = message.role === "user";
  const fullContent = message.content;
  const [displayedContent, setDisplayedContent] = useState(
    isUser ? fullContent : "",
  );
  const [isTypingAnim, setIsTypingAnim] = useState(isTyping && !isUser);

  useEffect(() => {
    if (!isTypingAnim || isUser) return;

    const words = fullContent.split(" ");
    let wordIndex = 0;
    const interval = setInterval(() => {
      wordIndex++;
      if (wordIndex >= words.length) {
        setDisplayedContent(fullContent);
        setIsTypingAnim(false);
        onTypingComplete();
        clearInterval(interval);
      } else {
        setDisplayedContent(words.slice(0, wordIndex + 1).join(" "));
      }
    }, 35);

    return () => clearInterval(interval);
  }, [isTypingAnim, isUser, fullContent, onTypingComplete]);

  const content = isTypingAnim ? displayedContent : fullContent;

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-md bg-indigo-600 text-white"
              : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
          {isTypingAnim && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-gray-400" />
          )}
        </div>

        {/* Memory references indicator */}
        {!isUser &&
          message.memoriesReferenced &&
          message.memoriesReferenced.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 px-1">
              <svg
                className="h-3 w-3 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">
                {message.memoriesReferenced.length} memory reference
                {message.memoriesReferenced.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
