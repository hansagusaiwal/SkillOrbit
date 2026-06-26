import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copilotQuery, copilotSuggestions } from "../../api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function FloatingCopilot() {
  const [open, setOpen] = useState(false);
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

  function handleReset() {
    setMessages([]);
  }

  function handleClose() {
    setOpen(false);
    setMessages([]);
    setInput("");
  }

  return (
    <>
      <div className="fixed bottom-5 right-6 z-[9999]">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full bg-[#008096] px-5 py-3 text-white shadow-2xl shadow-cyan-900/25 transition-all hover:scale-105 hover:bg-[#006577] active:scale-95"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5 text-white" />
          </span>
          <span className="text-sm font-extrabold text-white">
            Recruiter Copilot
          </span>
        </button>
      </div>

      {open && (
        <div className="fixed bottom-20 right-6 z-[10000] flex h-[460px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[#c7c4d7] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between bg-[#008096] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold">SkillOrbit Copilot</p>
                <p className="text-[10px] text-white/75">AI recruiter assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="rounded-full p-1 text-[10px] text-white/75 transition hover:bg-white/15 hover:text-white"
                  title="New conversation"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="rounded-full p-1 transition hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <>
                <div className="rounded-2xl bg-[#f6f2ff] p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-[#006577]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <p className="text-[10px] font-extrabold uppercase tracking-widest">AI Suggestion</p>
                  </div>
                  <p className="text-xs leading-5 text-[#464554]">
                    Ask me about candidate rankings, hidden gems, recruitability signals, shortlist exports, or why a candidate is recommended.
                  </p>
                </div>

                <div className="space-y-2">
                  {suggestions.slice(0, 6).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="block w-full rounded-xl border border-[#e3dfff] bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#181445] transition hover:border-[#4648d4] hover:bg-[#f6f2ff]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-[#008096] text-white"
                      : "bg-[#f6f2ff] text-[#464554]"
                  }`}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 border-t border-white/10 pt-1.5 text-[10px] text-white/60">
                      <span className="font-bold">Sources:</span>
                      {msg.sources.slice(0, 3).map((s) => (
                        <span key={s} className="rounded bg-white/10 px-1 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[#464554]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#008096] border-t-transparent" />
                <span className="text-[11px]">Thinking...</span>
              </div>
            )}

            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="flex flex-shrink-0 items-center gap-2 border-t border-[#e3dfff] bg-white p-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#c7c4d7] bg-[#fcf8ff] px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#464554]/50"
                placeholder="Ask SkillOrbit Copilot..."
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-[#4648d4] p-2 text-white transition hover:bg-[#3730a3] disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
