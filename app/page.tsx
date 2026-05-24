"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Github, Sparkles } from "lucide-react";
import { Mark } from "@/components/Mark";
import { ThemeToggle } from "@/components/ThemeToggle";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
      {/* Atmospheric backdrop */}
      <Backdrop />

      {/* Top nav */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 flex h-16 items-center justify-between px-6 md:px-12"
      >
        <div className="flex items-center gap-2.5">
          <Mark size={20} className="text-accent" />
          <span className="serif-italic text-[20px] text-ink">Lumière</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/SankrityaT/lumiere"
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-surface/40 px-3.5 text-[12.5px] text-ink-dim transition-all hover:border-border-strong hover:text-ink md:flex"
          >
            <Github size={12} strokeWidth={1.8} />
            <span>Source</span>
          </a>
          <ThemeToggle />
        </div>
      </motion.nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-8 md:px-12">
        <div className="mx-auto w-full max-w-[820px] text-center">
          {/* Mark + label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="mb-8 inline-flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="will-change-transform"
            >
              <Mark size={56} className="text-accent" />
            </motion.div>
            <span className="rounded-full border border-border bg-surface/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted backdrop-blur-sm">
              Edition I
            </span>
          </motion.div>

          {/* Headline */}
          <h1
            className="serif-display text-ink"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            <RevealWord delay={0.15}>AI&nbsp;that</RevealWord>{" "}
            <RevealWord delay={0.28} italic accent>
              thinks
            </RevealWord>{" "}
            <RevealWord delay={0.41}>before</RevealWord>{" "}
            <br className="hidden md:block" />
            <RevealWord delay={0.54}>it&nbsp;answers.</RevealWord>
          </h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
            className="mx-auto mt-7 max-w-[560px] text-[15px] leading-relaxed text-ink-dim md:text-[16px]"
          >
            Lumière reads the web, shows its reasoning, cites its sources, and writes back with the care of a magazine editor.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.05, ease: EASE }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <PrimaryCta href="/chat" />
            <SecondaryCta href="https://github.com/SankrityaT/lumiere" label="View source" icon={<Github size={13} strokeWidth={1.8} />} />
          </motion.div>

          {/* Tiny meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4, ease: EASE }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-ink-muted"
          >
            <MetaPill label="Powered by Gemini 2.5 Flash" />
            <span className="hidden h-1 w-1 rounded-full bg-ink-muted/40 md:inline-block" />
            <MetaPill label="Web search via Tavily" />
            <span className="hidden h-1 w-1 rounded-full bg-ink-muted/40 md:inline-block" />
            <MetaPill label="Bring your own keys" />
          </motion.div>
        </div>

        {/* Feature row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.5, ease: EASE }}
          className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-3"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.55 + i * 0.08, ease: EASE }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/40 p-5 backdrop-blur-sm transition-colors hover:border-accent/25"
            >
              <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-elevated">
                <f.icon size={13} strokeWidth={1.7} className="text-accent" />
              </div>
              <h3 className="serif-display text-[17px] text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.8, ease: EASE }}
        className="relative z-10 flex h-12 items-center justify-between border-t border-border/40 px-6 text-[11px] text-ink-muted md:px-12"
      >
        <span>An editorial showcase, built with Next.js + Gemini.</span>
        <span className="font-mono">© {new Date().getFullYear()} · Lumière</span>
      </motion.footer>
    </div>
  );
}

// ----- atoms -----

function RevealWord({
  children,
  delay = 0,
  italic = false,
  accent = false,
}: {
  children: React.ReactNode;
  delay?: number;
  italic?: boolean;
  accent?: boolean;
}) {
  return (
    <span className="inline-block overflow-hidden align-baseline" style={{ paddingBottom: "0.15em" }}>
      <motion.span
        initial={{ y: "110%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.95, delay, ease: EASE }}
        className={[
          "inline-block",
          italic ? "serif-italic" : "",
          accent ? "text-accent" : "",
        ].join(" ")}
      >
        {children}
      </motion.span>
    </span>
  );
}

function PrimaryCta({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group relative flex h-11 items-center gap-2 overflow-hidden rounded-full bg-accent px-5 text-[13.5px] font-medium text-bg transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <Sparkles size={13} strokeWidth={2.2} className="relative" />
      <span className="relative">Try Lumière</span>
      <ArrowUpRight size={14} strokeWidth={2.2} className="relative transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function SecondaryCta({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface/40 px-5 text-[13.5px] text-ink transition-all hover:border-border-strong hover:bg-elevated"
    >
      {icon}
      <span>{label}</span>
      <ArrowUpRight size={13} strokeWidth={1.8} className="text-ink-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

function MetaPill({ label }: { label: string }) {
  return <span>{label}</span>;
}

// ----- background -----

function Backdrop() {
  return (
    <>
      {/* Soft radial bloom centered above the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 0%, rgb(var(--accent) / 0.10), transparent 70%)",
        }}
      />
      {/* Slowly drifting accent orb, blurred */}
      <motion.div
        aria-hidden
        initial={{ x: -120, y: -60, opacity: 0 }}
        animate={{
          x: [-120, 80, -40, -120],
          y: [-60, 40, -20, -60],
          opacity: 0.5,
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-accent/25 blur-[120px]"
      />
      {/* Hairline grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--text)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--text)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </>
  );
}

// ----- data -----

const FEATURES = [
  {
    icon: Sparkles,
    title: "Visible reasoning",
    body: "Watch the model plan before it answers. The thinking panel streams its internal logic, then collapses.",
  },
  {
    icon: Github,
    title: "Real web sources",
    body: "Tavily search returns titles, URLs, and snippets. Every claim is cited inline with a numbered chip.",
  },
  {
    icon: ArrowUpRight,
    title: "Multi-step research",
    body: "Comparison questions trigger separate searches per item. Up to five queries per turn, parallelised.",
  },
];
