import { NextRequest } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/* ----------------------------------------------------------------------- *
 *  Lumière backend — orchestrates Gemini 2.5 Flash (with thinking) + an
 *  agentic web_search tool loop powered by Tavily.
 *
 *  BYOK: keys arrive in headers from the browser, are used once per request,
 *  and never logged or persisted server-side.
 * ----------------------------------------------------------------------- */

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const MAX_TOOL_CALLS = 5; // hard cap on web searches per turn

const SYSTEM_PROMPT = `You are Lumière, a thoughtful editorial AI assistant with a refined, magazine-like voice.

WHEN TO SEARCH
- Use the web_search tool any time the user asks about recent events, specific facts, products, papers, prices, or anything you may not have current knowledge of.
- You may call web_search MULTIPLE times in a single response to research different sub-topics. Issue separate queries for each distinct angle.
- Do not search for general knowledge, opinions, or clearly historical facts.

FORMATTING
- Use markdown: ## and ### for section headings, **bold** for key terms, *italic* for emphasis, inline \`code\` and fenced \`\`\`lang code blocks for snippets, - bullets for lists, > for the occasional pull-quote.
- When you cite web results, place an inline citation like [1] or [3,4] immediately after the sentence or clause it supports. Number citations in the order sources were returned across all your searches (1, 2, 3...).
- Do NOT include a "Sources:" footer; the UI renders citations separately.

TONE
- Editorial. Confident, concise, considered. Avoid filler ("Certainly!", "I'd be happy to..."). Open with substance.
- When the user asks for an opinion, give one.`;

const WEB_SEARCH_TOOL = {
  name: "web_search",
  description:
    "Search the web for current information. Returns up to 6 results per call with titles, URLs, and content snippets. May be called multiple times per response.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A focused, specific search query (3-10 words).",
      },
    },
    required: ["query"],
  },
};

// ------------- types -------------

interface ClientAttachment {
  name: string;
  mimeType: string;
  base64: string; // data URI body only (no prefix)
}

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ClientAttachment[];
}

interface Source {
  id: number;
  domain: string;
  title: string;
  url: string;
  snippet: string;
  faviconColor: string;
  faviconLetter: string;
}

// ------------- helpers -------------

const FAVICON_PALETTE = [
  "#d97757",
  "#10a37f",
  "#4285f4",
  "#7c3aed",
  "#fa4616",
  "#e8b5a0",
  "#6b8e6b",
  "#c4a373",
];

function makeSource(result: { url: string; title?: string; content?: string }, id: number): Source {
  let domain = "source";
  try {
    domain = new URL(result.url).hostname.replace(/^www\./, "");
  } catch {}
  return {
    id,
    domain,
    title: result.title || domain,
    url: result.url,
    snippet: (result.content || "").trim().slice(0, 220),
    faviconColor: FAVICON_PALETTE[(id - 1) % FAVICON_PALETTE.length],
    faviconLetter: (domain[0] || "?").toUpperCase(),
  };
}

async function tavilySearch(query: string, key: string) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily ${res.status}: ${text.slice(0, 160)}`);
  }
  const data = (await res.json()) as { results?: Array<{ url: string; title?: string; content?: string }> };
  return data.results || [];
}

// Async generator that yields parsed Gemini SSE JSON chunks.
async function* parseGeminiSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        yield JSON.parse(payload);
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }
}

function emit(controller: ReadableStreamDefaultController, event: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));
}

// ------------- handler -------------

export async function POST(req: NextRequest) {
  const llmKey = req.headers.get("x-llm-key");
  const searchKey = req.headers.get("x-search-key");

  if (!llmKey) {
    return new Response(JSON.stringify({ error: "Missing x-llm-key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: ClientMessage[]; enableWeb?: boolean };
  try {
    body = (await req.json()) as { messages?: ClientMessage[]; enableWeb?: boolean };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const messages = body.messages || [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 });
  }
  const enableWeb = body.enableWeb !== false && !!searchKey;

  // Convert to Gemini "contents" format.
  const contents: Array<Record<string, unknown>> = messages.map((m) => {
    const parts: Array<Record<string, unknown>> = [];
    if (m.attachments?.length) {
      for (const a of m.attachments) {
        parts.push({ inlineData: { mimeType: a.mimeType, data: a.base64 } });
      }
    }
    if (m.content) parts.push({ text: m.content });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const stream = new ReadableStream({
    async start(controller) {
      const allSources: Source[] = [];
      let nextSourceId = 1;
      let toolCallCount = 0;

      const send = (e: Record<string, unknown>) => emit(controller, e);

      try {
        send({ type: "state", value: "thinking" });

        // Agentic loop: keep calling Gemini until it stops requesting tool calls.
        for (let step = 0; step < MAX_TOOL_CALLS + 1; step++) {
          const request: Record<string, unknown> = {
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              temperature: 0.7,
              thinkingConfig: { includeThoughts: true, thinkingBudget: -1 },
            },
          };
          if (enableWeb) {
            request.tools = [{ functionDeclarations: [WEB_SEARCH_TOOL] }];
          }

          const geminiRes = await fetch(`${GEMINI_URL}&key=${llmKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          });

          if (!geminiRes.ok || !geminiRes.body) {
            const errText = await geminiRes.text().catch(() => "");
            send({
              type: "error",
              message: `Gemini ${geminiRes.status}: ${errText.slice(0, 200) || "no body"}`,
            });
            break;
          }

          // Accumulate the model's parts so we can append them to history if it
          // issues a tool call (then loop again with the tool result).
          const modelParts: Array<Record<string, unknown>> = [];
          let pendingFunctionCall: { name: string; args?: Record<string, unknown> } | null = null;
          let writingStarted = false;
          let reasoningEmittedThisStep = false;

          for await (const chunk of parseGeminiSSE(geminiRes.body)) {
            const candidate = (chunk as { candidates?: Array<Record<string, unknown>> }).candidates?.[0];
            if (!candidate) continue;
            const content = candidate.content as { parts?: Array<Record<string, unknown>> } | undefined;
            const parts = content?.parts || [];
            for (const part of parts) {
              if ((part as { thought?: boolean }).thought) {
                const text = (part as { text?: string }).text || "";
                if (text) {
                  if (!reasoningEmittedThisStep) {
                    reasoningEmittedThisStep = true;
                  }
                  send({ type: "reasoning_delta", text });
                  modelParts.push(part);
                }
              } else if ((part as { functionCall?: unknown }).functionCall) {
                pendingFunctionCall = (part as { functionCall: { name: string; args?: Record<string, unknown> } })
                  .functionCall;
                modelParts.push(part);
              } else if ((part as { text?: string }).text) {
                const text = (part as { text: string }).text;
                if (!writingStarted) {
                  send({ type: "state", value: "writing" });
                  send({ type: "state", value: null });
                  writingStarted = true;
                }
                send({ type: "text_delta", text });
                modelParts.push(part);
              }
            }
          }

          // Append the model's response to history.
          if (modelParts.length > 0) {
            contents.push({ role: "model", parts: modelParts });
          }

          // If the model requested a tool call, run it and loop.
          if (
            pendingFunctionCall &&
            pendingFunctionCall.name === "web_search" &&
            enableWeb &&
            searchKey &&
            toolCallCount < MAX_TOOL_CALLS
          ) {
            toolCallCount++;
            const query = ((pendingFunctionCall.args as { query?: string })?.query || "").trim();

            send({ type: "state", value: "searching", query });
            send({ type: "tool_start", query });

            try {
              const results = await tavilySearch(query, searchKey);
              const newSources = results.map((r) => makeSource(r, nextSourceId++));
              allSources.push(...newSources);

              send({ type: "sources", items: allSources });
              send({ type: "state", value: "reading", count: allSources.length });

              // Send the tool result back to the model.
              contents.push({
                role: "function",
                parts: [
                  {
                    functionResponse: {
                      name: "web_search",
                      response: {
                        query,
                        results: newSources.map((s) => ({
                          id: s.id,
                          title: s.title,
                          url: s.url,
                          snippet: s.snippet,
                        })),
                      },
                    },
                  },
                ],
              });

              send({ type: "state", value: "synthesizing" });
              continue; // loop back to call Gemini again with the tool result
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              send({ type: "error", message: msg });
              break;
            }
          }

          // No more tool calls — we're done.
          break;
        }

        send({ type: "done", sources: allSources, toolCalls: toolCallCount });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: "error", message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
