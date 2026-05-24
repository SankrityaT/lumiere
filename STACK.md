# Lumière — Stack Recommendation

Researched May 2026. Prices verified against provider docs and aggregator pricing pages — see footnoted links throughout. All prices in USD per 1M tokens unless noted.

---

## 1. TL;DR

**Cheapest viable production stack:**

| Layer | Pick | Why |
|---|---|---|
| LLM (reasoning + tools + streaming + vision) | **Google Gemini 2.5 Flash** (thinking on) via `@ai-sdk/google` | Cheapest frontier model that exposes thought summaries in the AI SDK, native tool use, vision included in base price, 1M context |
| Web search | **Tavily** `/search` (free tier 1k credits/mo, then $0.008/req) | Returns `title + url + content + favicon + score` — exactly the shape `SourceChip` already expects |
| Vision | Same Gemini call — multimodal inputs are first-class | One bill, one SDK |
| Wire format | Vercel AI SDK v6 `streamText` → `toUIMessageStreamResponse()` | Existing components reduce to `useChat<MyAgentUIMessage>()` plus thin adapters |

**Cost for 1,000 conversations/month × 10 messages = 10,000 LLM turns:**

- Assume avg per turn: 800 input tokens (history + sources) + 600 output tokens + 300 thinking tokens
- Gemini 2.5 Flash: input $0.30/M, output $2.50/M, thinking $3.50/M [[Google pricing](https://ai.google.dev/gemini-api/docs/pricing)]
- Per turn: `(0.0008 × $0.30) + (0.0006 × $2.50) + (0.0003 × $3.50) = $0.00024 + $0.00150 + $0.00105 = $0.00279`
- LLM total: **10,000 × $0.00279 ≈ $27.90 / mo**
- Tavily (assume 1 search per conversation = 1,000 searches): first 1k free → **$0**. At 2,000 searches: 1k × $0.008 = $8/mo. [[Tavily pricing](https://www.tavily.com/pricing)]
- **Grand total: ~$28 – $36/month** for 10k turns + 1–2k searches.

**Want it even cheaper?** Swap Gemini 2.5 Flash for **Gemini 2.5 Flash-Lite** ($0.10 in / $0.40 out) — same SDK, no thinking mode, but synthesize a fake "reasoning summary" with a second cheap call. Brings LLM cost to **~$5/mo**. See "Cheapest alternative path" at the end.

**Want maximum simplicity?** **Perplexity Sonar** does LLM + search + citations in one call ($1/M in/out + $5/1k req). At 10k turns × 800 in + 600 out = $14 + $5 = **~$19/mo for *some* turns** (only those that need web). But Sonar does not expose a reasoning stream for the `sonar` tier — you lose visible chain-of-thought. See section 4.

---

## 2. Comparison tables

### 2a. LLMs — reasoning, tools, vision, streaming

| Model | In $/1M | Out $/1M | Reasoning visible? | Tool use | Vision | Context | SDK | Notes |
|---|---|---|---|---|---|---|---|---|
| **Gemini 2.5 Flash** | $0.30 | $2.50 (or $3.50 thinking out) | **Summary** via `includeThoughts: true` [[docs](https://ai.google.dev/gemini-api/docs/thinking)] | Yes (native) | Yes | 1M | `@ai-sdk/google` | Best $/quality. Thinking mode is "best effort" — sometimes empty. |
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | No native thinking | Yes | Yes | 1M | `@ai-sdk/google` | Cheapest credible option. Use a synthetic reasoning workaround. |
| **Claude Haiku 4.5** | $1.00 | $5.00 | **Yes** (summarized; full thinking billed) [[Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)] | Yes (native) | Yes | 200k | `@ai-sdk/anthropic` | Cleanest reasoning UX. ~3-4× cost of Gemini Flash. |
| **GPT-5.4 mini** | $0.75 | $4.50 | **Summary only** (raw CoT hidden) [[OpenAI](https://developers.openai.com/api/docs/guides/reasoning)] | Yes | Yes | ~272k | `@ai-sdk/openai` | Reasoning tokens billed at output rate; can balloon. |
| **GPT-5.4 nano** | $0.20 | $1.25 | Summary only | Yes | Yes | ~272k | `@ai-sdk/openai` | OpenAI's cheapest reasoning model. |
| **DeepSeek R1** (hosted) | $0.55 | $2.19 | **Yes** — full `reasoning_content` field, separately streamed [[DeepSeek docs](https://api-docs.deepseek.com/)] | Yes | No (text only) | 128k | `@ai-sdk/deepseek` | Best price/reasoning ratio but no vision. R1 retiring July 2026 in favor of v4. |
| **DeepSeek V3 / v4-flash** | $0.14 | $0.28 | No (chat model, not reasoner) | Yes | No | 128k | `@ai-sdk/deepseek` | Ridiculously cheap chat. Pair with a fake reasoning summary. |
| **xAI Grok 4 Fast** | $0.20 | $0.50 | Configurable effort (reasoning tokens billed at output) [[xAI](https://www.aifreeapi.com/en/posts/xai-grok-api-pricing)] | Yes | Yes | 256k | OpenAI-compatible | Cheap and capable; reasoning is internal, not streamed. |
| **Llama 3.3 70B on Groq** | $0.59 | $0.79 | No (instruction model) | Yes (JSON mode) | No | 128k | `@ai-sdk/groq` | Free tier exists but 30 RPM, 6k TPM — unusable in prod. Paid plan is fast and cheap. |
| **Perplexity Sonar** | $1.00 | $1.00 + $5–12/1k req | No | Search baked-in | No | 128k | `@ai-sdk/perplexity` | Replaces LLM + search in one call. See §4. |
| **Perplexity Sonar Reasoning Pro** | $2.00 | $8.00 + req fees | Some | Search baked-in | No | 128k | `@ai-sdk/perplexity` | If you go Sonar, this is the variant that exposes reasoning. |

**Verdict on visible reasoning.** Three providers genuinely expose reasoning text to developers:
1. **Anthropic** (extended thinking, summarized on Haiku 4.5 / Sonnet 4.6) — cleanest API surface
2. **DeepSeek** (`reasoning_content` field on R1 / deepseek-reasoner) — full raw CoT, separately streamed
3. **Google** (`includeThoughts: true` on 2.5 Flash thinking models) — summary only, "best effort"

OpenAI returns a reasoning *summary* but explicitly hides the raw CoT for safety reasons.

### 2b. Web search APIs — citations & output shape

| API | Free tier | Paid $/1k req | Shape returned | AI-friendly? |
|---|---|---|---|---|
| **Tavily** | 1,000 credits/mo, no card [[Tavily](https://www.tavily.com/pricing)] | $0.008 ea after free tier ($8/1k) | `{url, title, content, favicon, score, raw_content?}` per result + top-level `answer` | **Yes** — purpose-built for AI, returns parsed content (no scraping needed) |
| **Exa** | 1,000 req/mo + $10 credit [[Exa](https://exa.ai/pricing)] | $7/1k (search) + $1/1k pages | `{url, title, text, highlights, score}` — semantic ranking | Yes — neural search, great for research-type queries |
| **Serper** | 2,500 one-time credits [[Serper](https://serper.dev/)] | $1/1k → $0.30/1k at scale | Raw Google SERP JSON (organic, kg, related, etc.) | Mid — you scrape pages yourself |
| **Brave Search** | $5 prepaid credit/mo (~1k queries) [[Brave](https://api-dashboard.search.brave.com/documentation/pricing)] | $4–5/1k | Raw web index JSON | Mid — you scrape pages |
| **Linkup** | €5 credit/mo (~1k queries) [[Linkup](https://www.linkup.so/pricing)] | €5/1k standard, €50/1k deep | `{url, title, snippet, content}` + answer synthesis | Yes |
| **SerpAPI** | 100/mo free | $25/mo for 1k ($25/1k) [[SerpAPI](https://serpapi.com/pricing)] | Full Google SERP | Mid — most expensive of the bunch |
| **Perplexity Sonar** | None separate | Built into LLM call: $5–12/1k req | Citations as metadata on response | Yes — see §4 |

**Pick: Tavily.** It is the only one whose response object maps 1:1 onto `Source` in `components/SourceChip.tsx` (`url`, `title`, `content`/snippet, `favicon`). Free tier covers most demos; $8/1k after is competitive. Brave is theoretically cheaper but no longer has a free tier — every dev hits the $5 credit cap fast — and the response is raw web data, not snippets ready for citation.

### 2c. Vision / image understanding

| Model | Image cost | Notes |
|---|---|---|
| **Gemini 2.5 Flash** | Tokenized into input pool at $0.30/M | A 1024×1024 image ≈ ~1k tokens. ~$0.0003/image. |
| **Gemini 2.5 Flash-Lite** | Same tokenization, $0.10/M input | ~$0.0001/image. Cheapest credible vision. |
| **Claude Haiku 4.5** | `(w × h) / 750` tokens, $1.00/M input [[Anthropic](https://platform.claude.com/docs/en/about-claude/pricing)] | A 1024×1024 image ≈ 1,400 tokens ≈ $0.0014. |
| **GPT-5.4 mini** | Tokenized at $0.75/M input | ~$0.001/image, varies by detail level. |
| **DeepSeek / Grok 4 Fast text-only models** | Not supported | Use a vision-capable model for any turn with attachments. |

If a user attaches an image, route that turn to Gemini 2.5 Flash (or Flash-Lite) — same SDK, same call shape.

---

## 3. Mapping to the demo flow

The mock in `lib/demo-script.ts` produces a `DemoScript = { reasoning, toolQuery, sources, response }`. The UI in `components/AIMessage.tsx` consumes an `AIMessageData` that mirrors that exactly. Here's how each phase maps to a real API.

### Phase 1 — Thinking indicator (`state: { kind: "thinking" }`)

Set by the client the moment `sendMessage()` fires. No backend signal needed; flip to `searching` / `writing` as the stream emits new part types.

### Phase 2 — Reasoning panel (`reasoning.thoughts[]` streaming in)

**Gemini 2.5 Flash (recommended):**
```ts
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const result = streamText({
  model: google("gemini-2.5-flash"),
  providerOptions: {
    google: {
      thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 },
    },
  },
  messages,
  tools: { web_search },
  stopWhen: stepCountIs(5),
});
```
The AI SDK exposes thoughts as `reasoning` parts on the stream. With `sendReasoning: true` (default) on `toUIMessageStreamResponse()`, the client receives them as `reasoning` UI message parts you push into `reasoning.thoughts`.

**Anthropic Haiku 4.5 (cleaner UX):**
```ts
import { anthropic } from "@ai-sdk/anthropic";
streamText({
  model: anthropic("claude-haiku-4-5"),
  providerOptions: { anthropic: { thinking: { type: "adaptive" } } },
  messages, tools,
});
```

**DeepSeek R1 (cheapest with full CoT):**
```ts
import { deepseek } from "@ai-sdk/deepseek";
streamText({ model: deepseek("deepseek-reasoner"), messages, tools });
```
Returns a `reasoning_content` delta on each stream chunk, separate from the answer.

### Phase 3 — "Searching the web" + tool call card (`toolCall`)

Define `web_search` as a tool. The model decides when to call it; the AI SDK streams `tool-input-start` → `tool-input-available` → executes → `tool-output-available` parts. Switch UI state to `searching` on `tool-input-start`, render the card on `input-available` (you now have the query string), and append sources as you map Tavily's response.

```ts
// lib/tools/web-search.ts
import { tool } from "ai";
import { z } from "zod";

export const webSearch = tool({
  description: "Search the web for current information. Use for any factual claim that needs citation.",
  inputSchema: z.object({
    query: z.string().describe("Concise search query"),
  }),
  execute: async ({ query }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",      // 1 credit; "advanced" is 2
        max_results: 6,
        include_favicon: true,
      }),
    });
    const data = await res.json();
    return {
      query,
      sources: data.results.map((r: any, i: number) => ({
        id: i + 1,
        domain: new URL(r.url).hostname.replace(/^www\./, ""),
        title: r.title,
        url: r.url,
        snippet: r.content,
        favicon: r.favicon,        // direct favicon URL from Tavily
      })),
    };
  },
});
```

### Phase 4 — "Reading N sources" → "Synthesising" → "Writing"

Drive entirely from stream part transitions:
- `tool-output-available` → `state: { kind: "reading", count: n }` (one update per source as you map them)
- `finish-step` (the tool step) → `state: { kind: "synthesizing" }`
- First `text-delta` arrives → `state: { kind: "writing" }`, then `state: null`

### Phase 5 — Streaming markdown with `[1][2]` citation chips

Two options for citations:
1. **Prompt the model** to emit `[1]`, `[2]` inline, referencing the source IDs you returned from the tool. Your existing `StreamingText.tsx` already parses `[1,2,3]` and `[1][2]` and renders them as `citation-chip` links. This is exactly the demo flow.
2. **Use a citation-aware model** (Anthropic's Citations API, or Perplexity which returns a `citations[]` array as metadata). Then post-process to inject `[n]` markers.

Go with option 1 — zero extra cost, the UI already handles it. Add this to your system prompt:

```
When you cite a search result, append the source's [id] number in brackets immediately after
the sentence. Multiple sources: [2][4] or [2,4]. Do not list "Sources:" at the end —
the UI renders the cards separately.
```

### Phase 6 — Attachments (images / PDFs)

`ChatInput.tsx` already collects `Attachment[]`. Convert to AI SDK file parts on the client and send via `sendMessage({ files: [...] })`. The route picks them up as message parts; pass straight through to Gemini/Claude/GPT.

---

## 4. Sample wiring — `/api/chat` route handler

This is the minimum viable Next.js 16 route. It uses the Vercel AI SDK v6, Gemini 2.5 Flash with thinking, and Tavily as the search tool. Streaming goes out as a UI message stream that `useChat` consumes natively.

```ts
// app/api/chat/route.ts
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { google } from "@ai-sdk/google";
import { webSearch } from "@/lib/tools/web-search";

export const runtime = "nodejs";  // Tavily fetch wants Node fetch w/ keep-alive
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are Lumière, an assistant with web search. Cite sources inline as [1], [2], etc., immediately after each factual claim. The UI renders source cards separately — do not list a "Sources:" footer.`,
    messages: convertToModelMessages(messages),
    tools: { web_search: webSearch },
    stopWhen: stepCountIs(4),
    providerOptions: {
      google: {
        thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 },
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}
```

Then on the client, `ChatArea.tsx` swaps its scripted `submit()` for `useChat`:

```tsx
// lib/agents/lumiere-agent.ts (declarative shape, optional)
import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { google } from "@ai-sdk/google";
import { webSearch } from "@/lib/tools/web-search";

export const lumiereAgent = new ToolLoopAgent({
  model: google("gemini-2.5-flash"),
  instructions: "...same as system above...",
  tools: { web_search: webSearch },
  providerOptions: {
    google: { thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 } },
  },
});
export type LumiereUIMessage = InferAgentUIMessage<typeof lumiereAgent>;
```

```tsx
// components/ChatArea.tsx (sketch — replace mock timing block)
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { LumiereUIMessage } from "@/lib/agents/lumiere-agent";

const { messages, sendMessage, status } = useChat<LumiereUIMessage>({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});

// Then derive AIMessageData from each assistant message:
function deriveAIMessage(m: LumiereUIMessage): AIMessageData {
  let reasoning: AIMessageData["reasoning"];
  let toolCall: AIMessageData["toolCall"];
  let responseText = "";
  let state: ThinkingState | null = { kind: "thinking" };

  for (const part of m.parts) {
    switch (part.type) {
      case "reasoning":
        reasoning ??= { thoughts: [], visibleCount: 0, durationSec: null };
        reasoning.thoughts = part.text.split("\n\n").filter(Boolean);
        reasoning.visibleCount = reasoning.thoughts.length;
        break;
      case "tool-web_search":
        if (part.state === "input-available") {
          state = { kind: "searching", query: part.input.query };
          toolCall = { query: part.input.query, sources: [], status: "running", visibleCount: 0 };
        }
        if (part.state === "output-available") {
          toolCall = {
            query: part.input.query,
            sources: part.output.sources,
            status: "done",
            visibleCount: part.output.sources.length,
          };
          state = { kind: "synthesizing" };
        }
        break;
      case "text":
        responseText += part.text;
        state = status === "streaming" ? { kind: "writing" } : null;
        break;
    }
  }
  return {
    id: m.id,
    state: status === "ready" ? null : state,
    reasoning,
    toolCall,
    response: { text: responseText, revealedTokens: countTokens(responseText) },
    done: status === "ready",
  };
}
```

Token-by-token reveal in `StreamingText.tsx` can stay as-is — just feed it `revealedTokens = countTokens(responseText)` so it always shows everything the server has streamed so far. The blur-in motion you already wrote handles the perceptual streaming.

---

## 5. Cheapest alternative path (free / near-free)

If $30/mo is too much, here is the rock-bottom stack:

### Stack
- **LLM**: **Gemini 2.5 Flash-Lite** — $0.10 in / $0.40 out. No thinking mode.
- **Reasoning workaround**: Make a *second* lightning-cheap Flash-Lite call before the main answer with a prompt like:
  > "You are about to answer this user question. In 2–4 short italic sentences, narrate your plan: what you'll search for, how you'll structure the answer, and what you'll verify. Be terse."
  Stream that into `reasoning.thoughts`. Cost: ~$0.00005/turn. Looks identical to real reasoning to the user.
- **Search**: **Tavily** free tier (1k req/mo). After that, **Brave Search** free credit ($5/mo) as a fallback. Worst case at 2k searches/mo: $5.
- **Vision**: Same Gemini Flash-Lite call — supports images natively.

### Monthly cost at 10k turns
- 2 Flash-Lite calls per turn (reasoning + main): `(2 × 0.0008 × $0.10) + (2 × 0.0006 × $0.40) = $0.00016 + $0.00048 = $0.00064`
- × 10,000 turns = **$6.40/mo**
- + Tavily free → **~$6.40/mo total**

### What you lose vs. recommended path
| Capability | Recommended (Gemini 2.5 Flash + thinking) | Cheapest (Flash-Lite + fake reasoning) |
|---|---|---|
| Genuine model thoughts | Yes (summary) | No (it's a planning preamble) |
| Quality on hard multi-step questions | Better | Noticeably worse on math/code |
| Latency for first reasoning paragraph | ~400ms | ~600ms (two sequential calls) |
| Cost / 10k turns | ~$28 | ~$6 |

### Strictly free production option (with risk)
- **OpenRouter** free DeepSeek R1 endpoint or **Cerebras** free tier (60k TPM)
- Rate limits: **20 req/min, 50 req/day** without a balance on OpenRouter. **Free models can disappear at any time** [[OpenRouter docs](https://openrouter.ai/docs/guides/get-started/free-models-router-playground)]. Groq is similar (30 RPM, 6k TPM).
- Verdict: fine for a demo; **do not ship to users on free tiers** — one viral moment and you 429 immediately. The $5–10/mo on Tavily + Flash-Lite is the actual floor for production.

---

## 6. Things to watch out for ("cheap" is a trap if you miss these)

- **OpenAI reasoning models bill all reasoning tokens at the *output* rate even though you can't see them.** A "cheap" GPT-5.4 mini answer with deep reasoning can quietly cost 3–5× the visible token count. Set `reasoning_effort: "low"` aggressively.
- **Anthropic extended thinking on Haiku 4.5 charges for the full thinking tokens** even though you only get a summary. Same trap, different shape.
- **Gemini thinking mode has a separate, higher output price** ($3.50/M vs $2.50/M) — make sure your budget model reflects this.
- **Brave Search killed its free tier in April 2026.** Old tutorials are wrong. $5/mo credit = ~1k queries.
- **Vercel AI SDK v6 has an open bug** where Anthropic reasoning blocks can be lost across multi-step tool calls [[issue #11602](https://github.com/vercel/ai/issues/11602)]. If you go Claude, render reasoning on the *first* step only or pin to a workaround commit.
- **DeepSeek R1 retires July 24, 2026.** The hosted API is moving to `deepseek-v4-flash` / `deepseek-v4-pro`. Don't hard-code `deepseek-reasoner` for a long-lived project.
- **Perplexity Sonar charges per request *and* per token,** with the request fee scaling by search context size ($5–14/1k req). High-traffic apps get surprised.
- **Tavily "advanced" search costs 2 credits per call.** Stick with `search_depth: "basic"` unless you actually need richer extraction.
- **Free tiers (Groq, Cerebras, OpenRouter) are shared across all free users on that model.** They are not for production.

---

## 7. Recommended package additions

```bash
npm i ai @ai-sdk/google @ai-sdk/react zod
# Optional, if you want failover:
# npm i @ai-sdk/anthropic @ai-sdk/openai
```

Add `TAVILY_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`. Both have free tiers that don't require a credit card.

---

## Sources

- [Anthropic Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic extended thinking docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [OpenAI reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning)
- [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini thinking docs (`includeThoughts`)](https://ai.google.dev/gemini-api/docs/thinking)
- [DeepSeek API pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [xAI Grok pricing](https://www.aifreeapi.com/en/posts/xai-grok-api-pricing)
- [Groq pricing & free tier](https://groq.com/pricing)
- [Tavily pricing](https://www.tavily.com/pricing) — [Tavily search API reference](https://docs.tavily.com/documentation/api-reference/endpoint/search)
- [Brave Search API pricing](https://api-dashboard.search.brave.com/documentation/pricing)
- [Exa API pricing](https://exa.ai/pricing)
- [Serper pricing](https://serper.dev/)
- [SerpAPI pricing](https://serpapi.com/pricing)
- [Linkup pricing](https://www.linkup.so/pricing)
- [Perplexity Sonar API pricing](https://docs.perplexity.ai/docs/getting-started/pricing)
- [Vercel AI SDK providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [Vercel AI SDK 6 release](https://vercel.com/blog/ai-sdk-6)
- [OpenRouter free models docs](https://openrouter.ai/docs/guides/get-started/free-models-router-playground)
