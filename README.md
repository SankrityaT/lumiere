# Lumière

An editorial AI assistant interface. Next.js 16 + React 19 + Tailwind, with both Cinematic Editorial Dark and Parchment Atelier light themes.

Live demo at `http://localhost:3000` once running.

## Two modes

**Demo mode** (no key). Lumière runs a scripted response sequence to showcase the interface: streaming reasoning, animated web-search tool call, source chips, citations, the works. Safe for portfolio embedding — no API costs, no risk.

**Live mode** (BYOK). Add your Gemini API key in **Settings** (gear icon in sidebar or top bar) and Lumière switches to real LLM responses with real web search. Your keys live in browser localStorage only, are sent to `/api/chat` per-request as headers, and are never logged or persisted server-side.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Going live

1. Open **Settings** (gear icon).
2. Paste a **Gemini API key** — get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. (Optional) Paste a **Tavily key** to enable web search — free tier at [tavily.com](https://app.tavily.com/home) is 1,000 searches/month.
4. Save.

The status indicator in Settings shows live vs. demo mode at a glance.

## What live mode does

- **Multi-step agentic loop**: Gemini may call `web_search` multiple times in a single response to research different angles. Hard-capped at 5 searches per turn.
- **Real reasoning**: Gemini 2.5 Flash thinking mode is enabled and streams its internal thoughts to the reasoning panel.
- **Inline citations**: model is prompted to emit `[1]` / `[2,3]` citations referencing sources in order. The existing `StreamingText` parser renders them as clickable pills.
- **Conversation history**: prior turns are sent on each request and persisted to localStorage so they survive page reloads in the same browser.
- **Vision**: image attachments are sent inline to Gemini for analysis.

## Cost (live mode, your bill)

Roughly **$28/mo** for ~10k turns/month on Gemini 2.5 Flash with thinking. Cheaper if you use Flash-Lite (no real reasoning) → ~$6/mo. See `STACK.md` for the detailed cost breakdown.

## Architecture

- `app/api/chat/route.ts` — Edge route. Receives keys in headers, orchestrates Gemini + Tavily, streams NDJSON events back. Keys are never logged or persisted.
- `lib/keys.ts` — BYOK key storage (browser localStorage).
- `lib/chat-client.ts` — Browser-side fetch wrapper that consumes the NDJSON stream.
- `components/SettingsDrawer.tsx` — Slide-out drawer for entering keys.
- `components/ChatArea.tsx` — Branches between `runLive` (real API) and `runMock` (scripted demo) based on key presence.
- `lib/demo-script.ts` — The scripted demo content.

## Stack

Next.js 16 (Turbopack), React 19, Tailwind 3, Framer Motion, Lucide icons. Instrument Serif + PP Neue Montreal + JetBrains Mono typography.
