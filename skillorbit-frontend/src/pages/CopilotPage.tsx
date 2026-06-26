import { useState, useEffect, useRef } from "react";
import AppLayout from "../components/layout/AppLayout";
import { copilotQuery, copilotReset, copilotSuggestions } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  intent?: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    copilotSuggestions()
      .then((data) => setSuggestions(data.questions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(message?: string) {
    const text = (message || input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await copilotQuery(text, 8);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          intent: data.intent,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that request. Make sure the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    try {
      await copilotReset();
      setMessages([]);
    } catch {}
  }

  return (
    <AppLayout
      title="AI Recruiter Copilot"
      searchPlaceholder="Search candidates, jobs, or intelligence reports..."
    >
      <div className="flex h-[calc(100vh-140px)] flex-col pb-2xl">
        <div className="mb-md flex items-center justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              AI Recruiter Copilot
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Ask questions about candidates, rankings, and insights.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-lg py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container"
          >
            New Conversation
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
          <div className="flex-1 overflow-y-auto p-lg">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-lg">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-4xl">smart_toy</span>
                </div>
                <div className="max-w-md text-center">
                  <h3 className="mb-2 font-headline-md text-on-surface">
                    How can I help you?
                  </h3>
                  <p className="font-body-md text-on-surface-variant">
                    Ask me about candidate rankings, hidden gems, behavioral signals, or market insights.
                  </p>
                </div>
                <div className="mt-4 grid max-w-2xl grid-cols-1 gap-2 md:grid-cols-2">
                  {suggestions.slice(0, 6).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-left text-sm text-on-surface-variant transition-all hover:border-primary hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`mb-lg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-lg py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-surface-container text-on-surface"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-body-md">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2 text-xs text-on-surface-variant">
                      <span className="font-bold">Sources:</span>
                      {msg.sources.slice(0, 5).map((s) => (
                        <span key={s} className="rounded bg-white/10 px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="border-t border-outline-variant bg-white p-md">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about candidates, rankings, or insights..."
                className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-lg py-3 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-lg py-3 font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}