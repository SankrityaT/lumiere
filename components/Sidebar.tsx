"use client";

import { Plus, Search, Settings2 } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { motion } from "framer-motion";

const TODAY = [
  { id: "1", title: "Frontier model comparison, Q4 2025", active: true },
  { id: "2", title: "Refactoring the auth flow", active: false },
];

const YESTERDAY = [
  { id: "3", title: "Design tokens for editorial UI", active: false },
  { id: "4", title: "Speed of light in vacuum", active: false },
  { id: "5", title: "Helm vs. Kustomize", active: false },
];

const OLDER = [
  { id: "6", title: "Kyoto travel itinerary, March", active: false },
  { id: "7", title: "Notes on Invisible Cities", active: false },
  { id: "8", title: "Mock CSV for stress tests", active: false },
];

function Group({ label, items }: { label: string; items: typeof TODAY }) {
  return (
    <div className="mb-3">
      <div className="px-3 py-1.5 text-[11px] text-ink-muted">{label}</div>
      <ul className="space-y-0.5">
        {items.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i + 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              className={[
                "group relative w-full truncate rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors",
                c.active
                  ? "bg-elevated text-ink"
                  : "text-ink-dim hover:bg-elevated/60 hover:text-ink",
              ].join(" ")}
            >
              {c.active && (
                <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <span className="block truncate">{c.title}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-[270px] flex-col border-r border-border bg-surface/60 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Logo size="md" />
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button className="group relative flex w-full items-center gap-2.5 rounded-lg border border-border bg-elevated/40 px-3 py-2 text-[13px] text-ink transition-all hover:border-accent/30 hover:bg-elevated">
          <Plus size={13} strokeWidth={2} className="text-accent transition-transform group-hover:rotate-90 duration-300" />
          <span>New conversation</span>
          <span className="ml-auto rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-mono text-ink-muted">⌘N</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:bg-elevated/40">
          <Search size={13} strokeWidth={1.8} />
          <span>Search</span>
          <span className="ml-auto font-mono text-[10px]">⌘K</span>
        </div>
      </div>

      {/* Conversations */}
      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        <Group label="Today" items={TODAY} />
        <Group label="Yesterday" items={YESTERDAY} />
        <Group label="Older" items={OLDER} />
      </nav>

      {/* Footer */}
      <div className="border-t border-border/70 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent/40 to-accent-strong/60 ring-1 ring-border">
            <span className="font-display text-[14px] italic text-bg">S</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-ink">Sanki</div>
            <div className="truncate text-[11px] text-ink-muted">Pro plan</div>
          </div>
          <ThemeToggle />
          <button className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-elevated hover:text-ink" aria-label="Settings">
            <Settings2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}
