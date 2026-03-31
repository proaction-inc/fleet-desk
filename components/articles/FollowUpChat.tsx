"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatMessage(text: string): string {
  if (!text) return "";
  let html = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^###\s+(.+)$/gm, '<h4 class="font-bold text-sm mt-3 mb-1">$1</h4>');
  html = html.replace(/^##\s+(.+)$/gm, '<h4 class="font-bold text-sm mt-3 mb-1">$1</h4>');

  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<h4") || trimmed.startsWith("<h3")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(trimmed);
      continue;
    }
    const isBullet = /^[-•*]\s/.test(trimmed);
    if (isBullet) {
      if (!inList) { result.push('<ul class="list-disc pl-5 my-2 space-y-1">'); inList = true; }
      result.push(`<li>${trimmed.replace(/^[-•*]\s/, "")}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      if (trimmed === "") result.push("<br/>");
      else result.push(`<p class="mb-2">${trimmed}</p>`);
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
  const [open, setOpen] = useState(false);
  const sessionIdRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { sessionIdRef.current = crypto.randomUUID(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Lock body scroll when modal is open (fixes mobile scroll-through)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [open]);

  function closeModal() {
    if (!isStreaming) {
      setOpen(false);
      setExpanded(false);
    }
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      if (!open) setOpen(true);

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setIsStreaming(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, sessionId: sessionIdRef.current, message: trimmed }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
            return u;
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
            const t = line.trim();
            if (!t.startsWith("data: ")) continue;
            const data = t.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  const u = [...prev];
                  const last = u[u.length - 1];
                  u[u.length - 1] = { ...last, content: last.content + parsed.text };
                  return u;
                });
              }
            } catch {}
          }
        }
      } catch {
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
          return u;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, articleId, open]
  );

  return (
    <>
      {/* Backdrop — click to close */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={closeModal}
        />
      )}

      {/* Modal card */}
      <div
        className="fixed z-50 bottom-0 left-0 right-0 flex justify-center pointer-events-none"
        style={{ padding: "0 1rem" }}
      >
        <div
          className={`pointer-events-auto w-full bg-white shadow-2xl border border-border border-b-0 flex flex-col transition-all duration-300 ease-out ${
            open
              ? `rounded-t-2xl ${expanded ? "max-h-[85vh]" : "max-h-[50vh]"}`
              : "rounded-t-2xl"
          }`}
          style={{ maxWidth: 672 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: expand (left), handle, close (right) */}
          {open && messages.length > 0 && (
            <div className="flex items-center px-4 pt-3 pb-2 shrink-0">
              {/* Expand button — left side */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
                aria-label={expanded ? "Shrink" : "Expand"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {expanded ? (
                    <path d="M17 14l-5 5-5-5" />
                  ) : (
                    <path d="M7 10l5-5 5 5" />
                  )}
                </svg>
              </button>

              {/* Center handle */}
              <div className="flex-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Close button — right side */}
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
                aria-label="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Messages */}
          {open && messages.length > 0 && (
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-5 pb-2 space-y-3 overscroll-contain"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-white max-w-[80%]"
                        : "bg-surface text-foreground max-w-[90%]"
                    }`}
                  >
                    {msg.content ? (
                      msg.role === "assistant" ? (
                        <div
                          className="[&_strong]:font-bold [&_ul]:my-2 [&_ul]:space-y-1 [&_li]:text-sm [&_p]:mb-2 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                      ) : msg.content
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" />
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className={`px-4 sm:px-5 py-3 bg-white shrink-0 ${open && messages.length > 0 ? "border-t border-border" : ""}`}>
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up about this article..."
                disabled={isStreaming}
                className="w-full h-11 pl-4 pr-12 rounded-full border border-border bg-surface text-base text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:opacity-60 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-light disabled:opacity-40 transition-colors"
                aria-label="Send"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
