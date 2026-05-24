import type { Source } from "@/components/SourceChip";

export interface DemoScript {
  reasoning: string[];
  toolQueries: string[];
  sources: Source[];
  response: string;
}

const COMPARE_MODELS_SOURCES: Source[] = [
  {
    id: 1,
    domain: "anthropic.com",
    title: "Introducing Claude 4, extended reasoning and tool use",
    url: "https://www.anthropic.com/news",
    snippet: "Claude 4 brings persistent reasoning, 1M-token context, and refined tool orchestration to production workloads.",
    faviconColor: "#d97757",
    faviconLetter: "A",
  },
  {
    id: 2,
    domain: "openai.com",
    title: "GPT-5 Release Notes: persistent memory, native tools",
    url: "https://openai.com/index/gpt-5",
    snippet: "GPT-5 introduces native multimodal tool use, persistent session memory, and 256K token contexts.",
    faviconColor: "#10a37f",
    faviconLetter: "O",
  },
  {
    id: 3,
    domain: "blog.google",
    title: "Gemini 2.0: Our Next Generation Frontier Model",
    url: "https://blog.google/technology/google-deepmind/gemini-2",
    snippet: "Gemini 2.0 doubles down on multimodal, particularly video, and extends agentic capabilities across Workspace.",
    faviconColor: "#4285f4",
    faviconLetter: "G",
  },
  {
    id: 4,
    domain: "artificialanalysis.ai",
    title: "AI Model Comparison, Late 2025 Frontier Roundup",
    url: "https://artificialanalysis.ai/leaderboards",
    snippet: "Independent benchmarking across reasoning, code, math, and multimodal tasks for the late-2025 frontier.",
    faviconColor: "#7c3aed",
    faviconLetter: "α",
  },
  {
    id: 5,
    domain: "techcrunch.com",
    title: "Frontier Model Showdown: What changed in the last six months",
    url: "https://techcrunch.com/2025/11/ai-frontier-showdown",
    snippet: "Production teams report markedly different fit across the major frontier labs, workflow integration matters more than raw benchmarks.",
    faviconColor: "#1a1a1a",
    faviconLetter: "T",
  },
  {
    id: 6,
    domain: "theverge.com",
    title: "The state of AI: November 2025",
    url: "https://www.theverge.com/ai-state-2025-november",
    snippet: "An overview of where the major labs stand on safety, capability, and deployment in late 2025.",
    faviconColor: "#fa4616",
    faviconLetter: "V",
  },
];

const COMPARE_MODELS_RESPONSE = `## The frontier in late 2025

The frontier-model landscape has shifted dramatically over the past six months. **Claude 4**[1] launched with breakthrough capabilities in extended reasoning and a 1M-token context window, while OpenAI's **GPT-5**[2] introduced native tool use and persistent memory across sessions. Google's **Gemini 2.0**[3] doubled down on multimodal understanding, particularly for video and live workflows.

## Benchmark snapshot

According to *Artificial Analysis*[4], the picture on key reasoning benchmarks is closer than the marketing suggests:

- **GPQA Diamond**: Claude 4 (84.1%) edges out GPT-5 (82.3%) and Gemini 2.0 (79.8%)
- **HumanEval**: GPT-5 leads at 94.7%, with Claude 4 close behind at 93.2%
- **MMLU-Pro**: all three within margin of error around 88%

## Where each shines

Claude 4[1] excels at long-form analysis and editing inside large codebases, engineering teams in particular report the deepest fit[5]. GPT-5[2] leads in creative writing and chained tool orchestration. Gemini 2.0[3] is unmatched for video understanding and Workspace integration.

> For most production use cases, the differentiator is *less about raw capability and more about workflow fit*[5][6].

\`\`\`ts
// rough fit-by-task heuristic
const recommend = (task: Task) =>
  task.kind === "long-context"   ? "claude-4"   :
  task.kind === "creative"        ? "gpt-5"      :
  task.kind === "multimodal-video"? "gemini-2"   :
  "any-frontier-model";
\`\`\`

Would you like me to dig deeper into any specific dimension, pricing, latency, or agent-task performance?`;

const COMPARE_MODELS_REASONING = [
  "The user wants a comparison across three frontier models. To answer well I should pull recent release notes, an independent benchmark source, and at least one piece of editorial coverage to capture deployment patterns.",
  "I'll structure the response as: brief landscape framing → benchmarks → where each shines → a small code heuristic. Citations should be tight, not overload sentences with refs.",
  "Verify that the benchmark numbers I cite trace to the independent source, not the labs themselves, so the comparison isn't lab-biased.",
];

const GENERIC_RESPONSE = `Here's a quick take on what you asked.

## Key points

- I parsed your question and outlined the main thread.
- For richer answers, enable the **Web** tool above so I can ground claims in fresh sources.
- I can also accept **attachments**, drag any image or PDF into the chat.

## A small example

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}.\`;
}
\`\`\`

Want me to expand any section, or pivot to something else entirely?`;

const GENERIC_REASONING = [
  "User sent an open-ended message. I'll respond conversationally and gently surface the capabilities they can use, web search, attachments, multi-turn, without sounding like a feature tour.",
  "Keep it brief. Editorial voice. Offer to expand.",
];

const GENERIC_SOURCES: Source[] = [];

export function scriptFor(userText: string): DemoScript {
  const lower = userText.toLowerCase();
  const wantsCompare =
    lower.includes("compare") &&
    (lower.includes("claude") || lower.includes("gpt") || lower.includes("gemini") || lower.includes("model"));

  if (wantsCompare) {
    return {
      reasoning: COMPARE_MODELS_REASONING,
      toolQueries: [
        "Claude 4 launch features benchmarks 2025",
        "GPT-5 release notes capabilities 2025",
        "Gemini 2.0 features Workspace 2025",
      ],
      sources: COMPARE_MODELS_SOURCES,
      response: COMPARE_MODELS_RESPONSE,
    };
  }

  return {
    reasoning: GENERIC_REASONING,
    toolQueries: [],
    sources: GENERIC_SOURCES,
    response: GENERIC_RESPONSE,
  };
}
