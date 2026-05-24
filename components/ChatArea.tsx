"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput, type Attachment } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { UserMessage } from "./UserMessage";
import { AIMessage, type AIMessageData } from "./AIMessage";
import { scriptFor } from "@/lib/demo-script";
import { countTokens } from "./StreamingText";
import { Share2, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useKeys } from "@/lib/use-keys";
import { attachmentsToApi, streamChat, type ChatMessage } from "@/lib/chat-client";
import type { Source } from "./SourceChip";

interface UserMsg {
  kind: "user";
  id: string;
  text: string;
  attachments?: Attachment[];
}

interface AIMsg {
  kind: "ai";
  id: string;
  data: AIMessageData;
}

type Msg = UserMsg | AIMsg;

interface ChatAreaProps {
  onToggleSidebar?: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
}

const HISTORY_KEY = "lumiere.chat_history";

export function ChatArea({ onToggleSidebar, sidebarOpen, onOpenSettings }: ChatAreaProps) {
  const keys = useKeys();
  const isLive = !!keys.llm;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore conversation from localStorage on first mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Msg[];
      // Only restore if all AI messages were marked done (avoid restoring a half-streaming turn)
      if (Array.isArray(parsed) && parsed.every((m) => m.kind === "user" || (m.kind === "ai" && m.data.done))) {
        setMessages(parsed);
      }
    } catch {}
  }, []);

  // Persist whenever we're idle and have content
  useEffect(() => {
    if (isGenerating) return;
    if (messages.length === 0) {
      window.localStorage.removeItem(HISTORY_KEY);
      return;
    }
    const serializable = messages.map((m) => {
      if (m.kind === "user") {
        // strip blob: preview URLs since they don't survive reload
        return { ...m, attachments: m.attachments?.map((a) => ({ ...a, preview: undefined })) };
      }
      return m;
    });
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(serializable));
    } catch {}
  }, [messages, isGenerating]);

  const stopAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setMessages((cur) =>
      cur.map((m) =>
        m.kind === "ai" && !m.data.done ? { ...m, data: { ...m.data, state: null, done: true } } : m,
      ),
    );
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  };

  const updateAI = (id: string, updater: (d: AIMessageData) => AIMessageData) => {
    setMessages((cur) =>
      cur.map((m) => (m.kind === "ai" && m.id === id ? { ...m, data: updater(m.data) } : m)),
    );
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ----------------- MOCK PATH (no LLM key) -----------------
  const runMock = (userId: string, aiId: string, text: string) => {
    const script = scriptFor(text);
    const hasSearch = script.sources.length > 0;
    const totalTokens = countTokens(script.response);

    const initialAI: AIMessageData = {
      id: aiId,
      state: { kind: "thinking" },
      reasoning: { thoughts: script.reasoning, visibleCount: 0, durationSec: null },
      toolCall: hasSearch
        ? { query: script.toolQuery, sources: script.sources, status: "running", visibleCount: 0 }
        : undefined,
      response: { text: script.response, revealedTokens: 0 },
      done: false,
    };

    setMessages((cur) => cur.map((m) => (m.kind === "ai" && m.id === aiId ? { ...m, data: initialAI } : m)));
    setIsGenerating(true);

    const startedAt = Date.now();
    let t = 600;
    script.reasoning.forEach((_, i) => {
      t += 800;
      schedule(() => updateAI(aiId, (d) => ({ ...d, reasoning: { ...d.reasoning!, visibleCount: i + 1 } })), t);
    });

    if (hasSearch) {
      t += 700;
      schedule(() => updateAI(aiId, (d) => ({ ...d, state: { kind: "searching", query: script.toolQuery } })), t);
      t += 900;
      script.sources.forEach((_, i) => {
        schedule(
          () =>
            updateAI(aiId, (d) => ({
              ...d,
              toolCall: d.toolCall ? { ...d.toolCall, visibleCount: i + 1 } : d.toolCall,
              state: { kind: "reading", count: i + 1 },
            })),
          t + i * 280,
        );
      });
      t += script.sources.length * 280 + 400;
      schedule(
        () =>
          updateAI(aiId, (d) => ({
            ...d,
            toolCall: d.toolCall ? { ...d.toolCall, status: "done" } : d.toolCall,
            state: { kind: "synthesizing" },
          })),
        t,
      );
      t += 1000;
    }

    schedule(() => {
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      updateAI(aiId, (d) => ({
        ...d,
        reasoning: d.reasoning ? { ...d.reasoning, durationSec: elapsed } : d.reasoning,
        state: { kind: "writing" },
      }));
    }, t);
    t += 600;

    schedule(() => updateAI(aiId, (d) => ({ ...d, state: null })), t);

    const INTERVAL = 22;
    for (let i = 1; i <= totalTokens; i++) {
      schedule(
        () =>
          updateAI(aiId, (d) => ({
            ...d,
            response: d.response ? { ...d.response, revealedTokens: i } : d.response,
          })),
        t + i * INTERVAL,
      );
    }
    t += totalTokens * INTERVAL + 200;

    schedule(() => {
      updateAI(aiId, (d) => ({ ...d, done: true }));
      setIsGenerating(false);
    }, t);
  };

  // ----------------- LIVE PATH (real API) -----------------
  const runLive = async (aiId: string, history: Msg[], userText: string, userAttachments: Attachment[]) => {
    setIsGenerating(true);

    const initialAI: AIMessageData = {
      id: aiId,
      state: { kind: "thinking" },
      reasoning: { thoughts: [], visibleCount: 0, durationSec: null },
      response: { text: "", revealedTokens: 0 },
      done: false,
    };
    setMessages((cur) => cur.map((m) => (m.kind === "ai" && m.id === aiId ? { ...m, data: initialAI } : m)));

    // Build API history from prior messages (exclude the current AI placeholder)
    const apiMessages: ChatMessage[] = [];
    for (const m of history) {
      if (m.kind === "user") {
        const atts = m.attachments ? await attachmentsToApi(m.attachments) : undefined;
        apiMessages.push({ role: "user", content: m.text, attachments: atts });
      } else if (m.kind === "ai" && m.data.done && m.data.response?.text) {
        apiMessages.push({ role: "assistant", content: m.data.response.text });
      }
    }
    const currentAtts = userAttachments.length ? await attachmentsToApi(userAttachments) : undefined;
    apiMessages.push({ role: "user", content: userText, attachments: currentAtts });

    const startedAt = Date.now();
    let reasoningBuffer = "";
    let textBuffer = "";
    let toolQuery = "";

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      for await (const ev of streamChat(apiMessages, { signal: ctrl.signal })) {
        if (ev.type === "state") {
          if (ev.value === "thinking") {
            updateAI(aiId, (d) => ({ ...d, state: { kind: "thinking" } }));
          } else if (ev.value === "searching") {
            toolQuery = ev.query || "";
            updateAI(aiId, (d) => ({
              ...d,
              state: { kind: "searching", query: toolQuery },
              toolCall: d.toolCall
                ? { ...d.toolCall, query: toolQuery, status: "running" }
                : { query: toolQuery, sources: [], status: "running", visibleCount: 0 },
            }));
          } else if (ev.value === "reading") {
            updateAI(aiId, (d) => ({ ...d, state: { kind: "reading", count: ev.count || 0 } }));
          } else if (ev.value === "synthesizing") {
            updateAI(aiId, (d) => ({
              ...d,
              state: { kind: "synthesizing" },
              toolCall: d.toolCall ? { ...d.toolCall, status: "done" } : d.toolCall,
            }));
          } else if (ev.value === "writing") {
            updateAI(aiId, (d) => ({ ...d, state: { kind: "writing" } }));
          } else if (ev.value === null) {
            const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
            updateAI(aiId, (d) => ({
              ...d,
              state: null,
              reasoning: d.reasoning ? { ...d.reasoning, durationSec: elapsed } : d.reasoning,
            }));
          }
        } else if (ev.type === "reasoning_delta") {
          reasoningBuffer += ev.text;
          // Split on double-newlines to get separate paragraphs in the panel.
          const thoughts = reasoningBuffer
            .split(/\n\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
          updateAI(aiId, (d) => ({
            ...d,
            reasoning: { thoughts, visibleCount: thoughts.length, durationSec: d.reasoning?.durationSec ?? null },
          }));
        } else if (ev.type === "tool_start") {
          toolQuery = ev.query;
          updateAI(aiId, (d) => ({
            ...d,
            toolCall: { query: ev.query, sources: d.toolCall?.sources ?? [], status: "running", visibleCount: d.toolCall?.sources.length ?? 0 },
          }));
        } else if (ev.type === "sources") {
          const items: Source[] = ev.items;
          updateAI(aiId, (d) => ({
            ...d,
            toolCall: d.toolCall
              ? { ...d.toolCall, sources: items, visibleCount: items.length }
              : { query: toolQuery, sources: items, status: "running", visibleCount: items.length },
          }));
        } else if (ev.type === "text_delta") {
          textBuffer += ev.text;
          updateAI(aiId, (d) => ({
            ...d,
            response: { text: textBuffer, revealedTokens: countTokens(textBuffer) },
          }));
        } else if (ev.type === "error") {
          updateAI(aiId, (d) => ({
            ...d,
            state: null,
            response: { text: `> **Error:** ${ev.message}`, revealedTokens: countTokens(`> **Error:** ${ev.message}`) },
            done: true,
          }));
        } else if (ev.type === "done") {
          const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          updateAI(aiId, (d) => ({
            ...d,
            state: null,
            reasoning: d.reasoning ? { ...d.reasoning, durationSec: elapsed } : d.reasoning,
            done: true,
          }));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateAI(aiId, (d) => ({
        ...d,
        state: null,
        response: { text: `> **Stream error:** ${msg}`, revealedTokens: countTokens(`> **Stream error:** ${msg}`) },
        done: true,
      }));
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const submit = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (isGenerating) return;
      const userId = `u-${Date.now()}`;
      const aiId = `a-${Date.now() + 1}`;

      const placeholderAI: AIMessageData = {
        id: aiId,
        state: { kind: "thinking" },
        reasoning: { thoughts: [], visibleCount: 0, durationSec: null },
        response: { text: "", revealedTokens: 0 },
        done: false,
      };

      const history = messages;
      const userMsg: UserMsg = { kind: "user", id: userId, text, attachments };
      const aiMsg: AIMsg = { kind: "ai", id: aiId, data: placeholderAI };
      setMessages((cur) => [...cur, userMsg, aiMsg]);

      if (isLive) {
        await runLive(aiId, history, text, attachments);
      } else {
        runMock(userId, aiId, text);
      }
    },
    [isGenerating, isLive, messages],
  );

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
    abortRef.current?.abort();
  }, []);

  const isEmpty = messages.length === 0;

  const newConversation = () => {
    stopAll();
    setMessages([]);
    window.localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <main className="flex h-screen flex-1 flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-bg/80 px-5 backdrop-blur-xl">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="-ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-elevated hover:text-ink"
        >
          {sidebarOpen ? <PanelLeftClose size={15} strokeWidth={1.8} /> : <PanelLeftOpen size={15} strokeWidth={1.8} />}
        </button>
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[13.5px] font-medium text-ink">{isEmpty ? "Untitled" : "Conversation"}</h2>
          <span className="text-[11.5px] text-ink-muted">
            {isLive ? "live · Gemini 2.5 Flash" : "demo · scripted"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {!isEmpty && (
            <button
              onClick={newConversation}
              className="rounded-lg px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:bg-elevated hover:text-ink"
            >
              New
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-elevated hover:text-ink"
            aria-label="Settings"
          >
            <Settings size={15} strokeWidth={1.8} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-elevated hover:text-ink">
            <Share2 size={14} strokeWidth={1.8} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-elevated hover:text-ink">
            <MoreHorizontal size={15} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex min-h-full flex-col">
            <EmptyState onSuggest={(p) => submit(p, [])} />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-6">
            {messages.map((m) =>
              m.kind === "user" ? (
                <UserMessage key={m.id} text={m.text} attachments={m.attachments} />
              ) : (
                <AIMessage key={m.id} data={m.data} />
              ),
            )}
            <div className="h-8" />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSubmit={(t, a) => submit(t, a)} isGenerating={isGenerating} onStop={stopAll} />
    </main>
  );
}
