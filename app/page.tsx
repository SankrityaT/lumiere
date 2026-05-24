"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowUpRight, Github } from "lucide-react";
import { Mark } from "@/components/Mark";
import { ThemeToggle } from "@/components/ThemeToggle";

const EASE = [0.16, 1, 0.3, 1] as const;
const ISSUE = "Vol. I · No. 001";
const MONTH = "May, MMXXVI";

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacityFade = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  return (
    <div className="relative min-h-screen bg-bg text-ink">
      {/* Masthead */}
      <Masthead />

      <main ref={heroRef} className="mx-auto max-w-[1180px] px-6 pt-10 md:px-10 md:pt-16">
        {/* Spread */}
        <div className="grid grid-cols-12 gap-8 md:gap-12">
          {/* Left rail — editorial folio */}
          <aside className="col-span-12 md:col-span-3 md:border-r md:border-border/60 md:pr-8">
            <LeftRail />
          </aside>

          {/* Right column — the piece */}
          <article className="col-span-12 md:col-span-9">
            <motion.div style={{ y: headlineY, opacity: opacityFade }}>
              <Kicker />
              <Headline />
              <Standfirst />
              <PullQuote />
              <CtaRow />
            </motion.div>
          </article>
        </div>

        <Colophon />
      </main>
    </div>
  );
}

// ---------- masthead ----------

function Masthead() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="border-b border-border/70"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3 md:px-10">
        <div className="flex items-center gap-2.5">
          <Mark size={16} className="text-accent" />
          <span className="serif-italic text-[15px] leading-none">Lumière</span>
          <span className="hidden text-[10.5px] uppercase tracking-[0.22em] text-ink-muted md:inline-block ml-3">
            An editorial AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted sm:inline">
            {ISSUE}
          </span>
          <a
            href="https://github.com/SankrityaT/lumiere"
            target="_blank"
            rel="noreferrer"
            className="flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/40 px-2.5 text-[11.5px] text-ink-dim transition-colors hover:border-border-strong hover:text-ink"
          >
            <Github size={11} strokeWidth={1.8} />
            <span className="hidden sm:inline">Source</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}

// ---------- left rail ----------

function LeftRail() {
  return (
    <div className="space-y-8 md:sticky md:top-20">
      <RailRow label="Edition">{ISSUE}</RailRow>
      <RailRow label="Filed">{MONTH}</RailRow>
      <RailRow label="By">
        <a
          href="https://github.com/SankrityaT"
          target="_blank"
          rel="noreferrer"
          className="serif-italic text-[15px] text-ink underline decoration-accent/40 decoration-1 underline-offset-4 transition-colors hover:decoration-accent"
        >
          Sanki
        </a>
      </RailRow>
      <RailRow label="Section">Essays · Frontend</RailRow>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
        className="pt-2"
      >
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-muted mb-2">In this issue</div>
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-ink-dim">
          <li className="flex gap-2"><Index num="01" />Visible reasoning, streamed.</li>
          <li className="flex gap-2"><Index num="02" />Sourced answers with citations.</li>
          <li className="flex gap-2"><Index num="03" />Multi-step research, in parallel.</li>
          <li className="flex gap-2"><Index num="04" />Bring your own keys.</li>
        </ul>
      </motion.div>
    </div>
  );
}

function RailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
      <div className="mt-1 text-[14px] text-ink">{children}</div>
    </motion.div>
  );
}

function Index({ num }: { num: string }) {
  return <span className="font-mono text-[10px] text-accent/70 tabular-nums shrink-0 mt-1">{num}</span>;
}

// ---------- right column atoms ----------

function Kicker() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
      className="mb-6 flex items-center gap-3"
    >
      <span className="text-[10.5px] uppercase tracking-[0.28em] text-accent">An Essay</span>
      <span className="h-px w-12 bg-accent/40" />
      <span className="text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">Inaugural</span>
    </motion.div>
  );
}

function Headline() {
  return (
    <h1
      className="serif-display text-ink"
      style={{
        fontSize: "clamp(2.75rem, 7.5vw, 6.25rem)",
        lineHeight: 0.97,
        letterSpacing: "-0.025em",
        marginBottom: "0.6em",
      }}
    >
      <RevealLine delay={0.28}>On reading</RevealLine>
      <br />
      <RevealLine delay={0.45} italic accent>
        the web.
      </RevealLine>
    </h1>
  );
}

function RevealLine({
  children,
  delay,
  italic,
  accent,
}: {
  children: React.ReactNode;
  delay: number;
  italic?: boolean;
  accent?: boolean;
}) {
  return (
    <span className="inline-block overflow-hidden align-baseline" style={{ paddingBottom: "0.1em" }}>
      <motion.span
        initial={{ y: "108%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
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

function Standfirst() {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
      className="drop-cap max-w-[58ch] text-[17.5px] leading-[1.65] text-ink-dim md:text-[18.5px]"
    >
      An assistant that <em className="serif-italic text-ink">reads what it does not know</em>, holds a thought before it answers, and writes back with the care of a magazine editor. Lumière is a small attempt to put research, reasoning, and writing in one room — and to render that room beautifully.
    </motion.p>
  );
}

function PullQuote() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
      className="my-12 flex items-start gap-5 md:my-16 md:gap-7"
    >
      <span aria-hidden className="serif-italic text-accent/40 leading-[0.7]" style={{ fontSize: "5rem" }}>
        “
      </span>
      <p
        className="serif-italic text-ink"
        style={{
          fontSize: "clamp(1.4rem, 2.6vw, 1.85rem)",
          lineHeight: 1.3,
          letterSpacing: "-0.012em",
          maxWidth: "44ch",
        }}
      >
        An AI that thinks. An AI that cites. An AI that writes back, slowly, in full sentences.
      </p>
    </motion.div>
  );
}

function CtaRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.25, ease: EASE }}
      className="flex flex-col items-start gap-5 md:flex-row md:items-baseline md:gap-8"
    >
      <Link
        href="/chat"
        className="group inline-flex items-baseline gap-2 text-ink"
        style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)" }}
      >
        <span
          className="serif-italic"
          style={{
            backgroundImage:
              "linear-gradient(currentColor, currentColor)",
            backgroundSize: "100% 1.5px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 100%",
            paddingBottom: "0.1em",
          }}
        >
          Continue reading
        </span>
        <span className="text-accent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
          →
        </span>
      </Link>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
        Approx. 4 minutes
      </span>
    </motion.div>
  );
}

// ---------- colophon (footer) ----------

function Colophon() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 1.5, ease: EASE }}
      className="mt-24 border-t border-border/60 py-8 md:mt-36"
    >
      <div className="grid grid-cols-12 gap-8 md:gap-12 text-[12px] text-ink-muted">
        <div className="col-span-12 md:col-span-3" />
        <div className="col-span-12 md:col-span-9">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <FooterCol label="Composed">May, MMXXVI</FooterCol>
            <FooterCol label="Type">Instrument Serif · Neue Montreal</FooterCol>
            <FooterCol label="Engine">Gemini 2.5 Flash · Tavily</FooterCol>
            <FooterCol label="Edited by">
              <a href="https://github.com/SankrityaT" target="_blank" rel="noreferrer" className="text-ink underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent">
                Sanki
              </a>
            </FooterCol>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
            <span>End of front matter</span>
            <span className="h-px flex-1 bg-border/60" />
            <Mark size={12} className="text-accent/60" dense />
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

function FooterCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
      <div className="mt-1.5 text-[12.5px] text-ink">{children}</div>
    </div>
  );
}
