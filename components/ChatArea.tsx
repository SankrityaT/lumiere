"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput, type Attachment } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { UserMessage } from "./UserMessage";
import { AIMessage, type AIMessageData } from "./AIMessage";
import { scriptFor } from "@/lib/demo-script";
import { countTokens } from "./StreamingText";
import { Share2, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
}

export function ChatArea({ onToggleSidebar, sidebarOpen }: ChatAreaProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stopAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsGenerating(false);
    setMessages((cur) =>
      cur.map((m) =>
        m.kind === "ai" && !m.data.done
          ? { ...m, data: { ...m.data, state: null, done: true } }
          : m,
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

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = useCallback(
    (text: string, attachments: Attachment[]) => {
      if (isGenerating) return;
      const userId = `u-${Date.now()}`;
      const aiId = `a-${Date.now() + 1}`;

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

      setMessages((cur) => [
        ...cur,
        { kind: "user", id: userId, text, attachments },
        { kind: "ai", id: aiId, data: initialAI },
      ]);
      setIsGenerating(true);

      const startedAt = Date.now();
      let t = 0;

      // 1. Quick thinking phase
      t += 600;
      // 2. Reveal reasoning thoughts
      script.reasoning.forEach((_, i) => {
        t += 800;
        schedule(() => {
          updateAI(aiId, (d) => ({
            ...d,
            reasoning: { ...d.reasoning!, visibleCount: i + 1 },
          }));
        }, t);
      });

      // 3. If search: searching phase, sources reveal one by one
      if (hasSearch) {
        t += 700;
        schedule(() => {
          updateAI(aiId, (d) => ({
            ...d,
            state: { kind: "searching", query: script.toolQuery },
          }));
        }, t);
        t += 900;
        script.sources.forEach((_, i) => {
          schedule(() => {
            updateAI(aiId, (d) => ({
              ...d,
              toolCall: d.toolCall ? { ...d.toolCall, visibleCount: i + 1 } : d.toolCall,
              state: { kind: "reading", count: i + 1 },
            }));
          }, t + i * 280);
        });
        t += script.sources.length * 280 + 400;

        schedule(() => {
          updateAI(aiId, (d) => ({
            ...d,
            toolCall: d.toolCall ? { ...d.toolCall, status: "done" } : d.toolCall,
            state: { kind: "synthesizing" },
          }));
        }, t);
        t += 1000;
      }

      // 4. Mark reasoning done with duration
      schedule(() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        updateAI(aiId, (d) => ({
          ...d,
          reasoning: d.reasoning ? { ...d.reasoning, durationSec: elapsed } : d.reasoning,
          state: { kind: "writing" },
        }));
      }, t);
      t += 600;

      // 5. Hide thinking indicator, reveal tokens
      schedule(() => {
        updateAI(aiId, (d) => ({ ...d, state: null }));
      }, t);

      // Reveal tokens progressively
      const TOKEN_INTERVAL = 22;
      for (let i = 1; i <= totalTokens; i++) {
        schedule(() => {
          updateAI(aiId, (d) => ({
            ...d,
            response: d.response ? { ...d.response, revealedTokens: i } : d.response,
          }));
        }, t + i * TOKEN_INTERVAL);
      }
      t += totalTokens * TOKEN_INTERVAL + 200;

      // 6. Mark done
      schedule(() => {
        updateAI(aiId, (d) => ({ ...d, done: true }));
        setIsGenerating(false);
      }, t);
    },
    [isGenerating],
  );

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const isEmpty = messages.length === 0;

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
          <h2 className="text-[13.5px] font-medium text-ink">
            {isEmpty ? "Untitled" : "Frontier model comparison"}
          </h2>
          <span className="text-[11.5px] text-ink-muted">
            {isEmpty ? "" : "Today, 14:22"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
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
