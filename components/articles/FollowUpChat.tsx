"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Simple markdown-to-HTML for chat messages:
 * - **bold** → <strong>
 * - Bullet lines (- or •) → <li> inside <ul>
 * - Newlines → <br> or paragraph breaks
 */
function formatMessage(text: string): string {
  if (!text) return "";

  // Bold
  let html = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Process lines
  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isBullet = /^[-•*]\s/.test(trimmed);

    if (isBullet) {
      if (!inList) {
        result.push('<ul class="list-disc pl-5 my-2 space-y-1">');
        inList = true;
      }
      result.push(`<li>${trimmed.replace(/^[-•*]\s/, "")}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        result.push("<br/>");
      } else {
        result.push(`<p class="mb-2">${trimmed}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");

  return result.join("");
}

export default function FollowUpChat({ articleId }: { articleId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sessionIdRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-expand when first message is sent
  useEffect(() => {
    if (messages.length > 0 && !expanded) {
      setExpanded(true);
    }
  }, [messages.length, expanded]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);

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

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            const data = trimmedLine.slice(6);
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
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg transition-all duration-300 ${
        expanded ? "top-24" : ""
      }`}
    >
      {/* Header bar with expand/collapse */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-border bg-surface max-w-2xl mx-auto">
          <span className="text-xs font-medium text-muted">
            {messages.filter((m) => m.role === "user").length} questions asked
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white transition-colors"
            aria-label={expanded ? "Collapse chat" : "Expand chat"}
          >
            {expanded ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 14l5-5 5 5" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 10l5 5 5-5" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Chat messages area */}
      {messages.length > 0 && (
        <div
          className={`max-w-2xl mx-auto px-4 sm:px-6 overflow-y-auto py-4 space-y-4 ${
            expanded ? "flex-1 h-[calc(100%-7rem)]" : "max-h-72"
          }`}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white max-w-[80%]"
                    : "bg-surface text-foreground max-w-[90%]"
                }`}
              >
                {msg.content ? (
                  msg.role === "assistant" ? (
                    <div
                      className="prose-chat [&_strong]:font-bold [&_ul]:my-2 [&_ul]:space-y-1 [&_li]:text-sm [&_p]:mb-2 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.content),
                      }}
                    />
                  ) : (
                    msg.content
                  )
                ) : (
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 bg-white">
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
