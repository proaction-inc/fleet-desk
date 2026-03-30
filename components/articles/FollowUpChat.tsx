"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function FollowUpChat({ articleId }: { articleId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionIdRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId,
            sessionId: sessionIdRef.current,
            message: trimmed,
          }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            };
            return updated;
          });
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore malformed lines
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, articleId]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
      {/* Chat messages area */}
      {messages.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 max-h-72 overflow-y-auto py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-surface text-foreground"
                }`}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up about this article..."
            disabled={isStreaming}
            className="w-full h-11 pl-4 pr-12 rounded-full border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:opacity-60 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-light disabled:opacity-40 disabled:hover:bg-accent transition-colors"
            aria-label="Send message"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
