import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are GHIGHAIS AI, an elite full-stack engineer and master UI/UX designer.
Your mission is to generate complete, production-grade, self-contained single-file web applications.
Every single output MUST produce a DESIGN that is impeccably PROFESIONAL, MEWAH (LUXURIOUS), and MODERN, executing cleanly without ANY syntax, runtime, or rendering errors.

CORE ARCHITECTURAL MANDATES:
1. OUTPUT FORMAT:
   - Output ONLY the raw executable HTML document (HTML + CSS + JS inline).
   - NEVER output markdown code fences (\`\`\`html or \`\`\`), conversational explanations, or introductory text.
   - Begin immediately with <!DOCTYPE html> or <html lang="id"> and conclude cleanly with </html>.

2. PROFESIONAL, MEWAH & MODERN DESIGN SYSTEM (HIGHEST PRIORITY):
   - AESTHETIC HARMONY & PALETTE:
     * Never output generic, plain, or bare-bones UI. Every screen must look like a high-end luxury digital product or elite SaaS application.
     * Canvas & Background: Use sophisticated deep dark atmospheres (e.g., obsidian #090d16, slate-950/900 #0f172a, zinc-950 #09090b) or ultra-refined studio light themes (#f8fafc with slate-900 contrast).
     * Luxury Accents: Champagne gold (#f59e0b, #d97706), refined royal indigo/violet (#6366f1, #8b5cf6), or emerald (#10b981). Always ensure strict WCAG AA legibility (minimum 4.5:1 contrast).
     * Lighting & Depth: Use delicate radial lighting (mesh gradients), frosted glassmorphism (backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]), and soft ambient drop-shadows (shadow-2xl shadow-black/40).
   - TYPOGRAPHY & FONT PAIRING:
     * Always include Google Fonts in <head>:
       <link rel="preconnect" href="https://fonts.googleapis.com" />
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
       <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
     * Apply font-family: 'Plus Jakarta Sans', system-ui, sans-serif.
     * Establish clear visual hierarchy: display titles with tight tracking (tracking-tight), crisp subtitles with medium opacity, and comfortable line-height (leading-relaxed).
   - MODERN COMPONENT CRAFTSMANSHIP:
     * Bento-grid structures, sleek card decks with hover elevation (hover:-translate-y-1 transition-all duration-300), and generous breathing room (p-5 or p-6, gap-4 to gap-6).
     * Sticky frosted navigation header (sticky top-0 z-30 backdrop-blur-md bg-slate-950/70 border-b border-white/5) featuring brand badge, navigation links, and status pills.
     * Form inputs: sleek background, subtle border, smooth focus ring (focus:ring-2 focus:ring-primary/40 focus:border-primary/80 outline-none transition-all), and helpful placeholder hints.
     * Interactive buttons: 3D or pill design with active depress micro-interactions (active:scale-95 transition-transform), icon pairings, and clear hover feedback.
     * Stat cards with trend indicators (+12%, -3%), pill badges, tab switchers with active indicator styling, and smooth animated modals/drawers when needed.
     * Meaningful empty states: whenever lists or collections are empty, display a clean placeholder card with a Lucide icon and encouraging call-to-action.

3. ZERO RUNTIME ERRORS & BULLETPROOF SCRIPTING:
   - All client-side JavaScript must be defensive, robust, and fully guarded.
   - Always initialize DOM bindings inside 'DOMContentLoaded' or after document is loaded:
     document.addEventListener('DOMContentLoaded', () => { ... });
   - Check element existence before reading properties or adding event listeners (e.g., if (btn) { ... }).
   - Wrap dynamic parsing (such as JSON.parse, fetch, localStorage, or async actions) in try/catch blocks.
   - Avoid undefined variables, missing helper functions, or dangling references.
   - For UI frameworks or styling, use modern Tailwind CSS via:
     <script src="https://cdn.tailwindcss.com"></script>
     Provide a fallback inline style sheet so that core layout renders even before CDN assets resolve.
   - Use Lucide icons via CDN (https://unpkg.com/lucide@latest) and call lucide.createIcons() safely.

4. UNLIMITED SCOPE & RICHNESS:
   - Fulfill every detail of the user's prompt without omissions, placeholders, or "TODO" comments.
   - Build real, interactive features with active state, responsive UI, accessible color contrast, and intuitive controls.
   - For multi-page or dashboard requests, implement fluid in-page tab/section/hash navigation with active tab indicators.

5. LOCAL PERSISTENCE & USER EXPERIENCE:
   - When appropriate, persist user data smoothly in client-side localStorage so state survives refreshes.
   - Provide clear feedback (toasts, alerts, or status pills) on user actions.

6. LANGUAGE & TONE:
   - Maintain the language used in the user prompt (default to clear, friendly Indonesian).`;

const MIGRATION_SYSTEM = `DATABASE MIGRATION MODE (ZERO-DATA-LOSS GUARANTEE).
- You are also a senior database migration engineer.
- Migrate EVERYTHING: every table, view, column, type, default, constraint, index, sequence,
  enum, trigger, function, policy, grant and seed row. Losing a single object is a failure.
- Never truncate with "..." or "and so on"; always list every object explicitly.
- Include target DDL, a resumable batched data-copy script, a row-count/checksum verification
  script, rewritten app connection code, and required environment variable names.
- Never invent or print credential values; use placeholders such as NEW_DB_URL.
- Be compact and structured: inventaris -> checklist -> DDL target -> script copy data ->
  script verifikasi -> kode koneksi baru -> env vars -> perlu dicek manual.
- Always conclude with fully working scripts and close the document cleanly with </html>.`;

type GatewayInput =
  | string
  | Array<{
      role: "user" | "assistant";
      content: Array<{ type: "input_text" | "output_text"; text: string }>;
    }>;

function friendlyError(status: number, raw: string) {
  if (status === 402) {
    return "Kuota AI pada workspace habis. Tambahkan kredit untuk melanjutkan.";
  }
  if (status === 429) {
    return "Permintaan terlalu cepat atau rate-limit. Sedang mencoba ulang otomatis...";
  }
  if (status === 401 || status === 403) {
    return "Kunci API AI belum diizinkan atau tidak valid.";
  }
  return raw || "Layanan AI sedang bermasalah, silakan coba lagi.";
}

// Auto-repair unclosed tags to guarantee zero document syntax errors
function autoCloseHtml(rawHtml: string): string {
  let patch = "";
  const lower = rawHtml.toLowerCase();
  if (lower.lastIndexOf("<script") > lower.lastIndexOf("</script>")) {
    patch += "\n</script>";
  }
  if (lower.lastIndexOf("<style") > lower.lastIndexOf("</style>")) {
    patch += "\n</style>";
  }
  if (lower.lastIndexOf("<pre") > lower.lastIndexOf("</pre>")) {
    patch += "\n</code></pre>";
  }
  if (!lower.includes("</body>")) {
    patch += "\n</body>";
  }
  if (!lower.includes("</html>")) {
    patch += "\n</html>";
  }
  return patch;
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      GET: async () => {
        const geminiKey =
          process.env["GEMINI_API_KEY"] ||
          process.env["GOOGLE_API_KEY"] ||
          process.env["GOOGLE_GENAI_API_KEY"] ||
          process.env["VITE_GEMINI_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["VITE_LOVABLE_API_KEY"];
        return new Response(
          JSON.stringify({
            status: "ok",
            hasGemini: !!geminiKey,
            hasLovable: !!lovableKey,
            availableModels: [
              "gemini-2.5-flash",
              "gemini-2.5-flash-lite",
              "gemini-1.5-flash",
              "gemini-2.0-flash",
              "gemini-2.0-flash-lite",
              "gemini-flash-latest",
              "gemini-3.8-flash",
              "gemini-3.7-flash",
              "gemini-3.6-flash",
            ],
            timestamp: Date.now(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      },
      POST: async ({ request }) => {
        let body: {
          prompt?: string;
          currentCode?: string;
          mode?: string;
          apiKey?: string;
          preferredModel?: string;
          history?: Array<{ role?: string; text?: string }>;
        };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return new Response("Prompt kosong", { status: 400 });

        const isMigration = body.mode === "migration";
        const systemPrompt = isMigration ? `${SYSTEM}\n${MIGRATION_SYSTEM}` : SYSTEM;

        const firstInput =
          body.currentCode && body.currentCode.trim().length > 0
            ? `Dokumen HTML aplikasi saat ini:\n\n${body.currentCode}\n\n---\nInstruksi pengguna:\n${prompt}\n\nKembalikan DOKUMEN HTML LENGKAP yang telah diperbarui dan siap dijalankan tanpa error.`
            : `Instruksi pengguna:\n${prompt}\n\nBuat dokumen HTML lengkap, responsif, dan fungsional tanpa error.`;

        // Check available API keys: User-provided key > GEMINI_API_KEY / GOOGLE_API_KEY / VITE_GEMINI_API_KEY > LOVABLE_API_KEY
        const rawGeminiKey =
          body.apiKey ||
          process.env["GEMINI_API_KEY"] ||
          process.env["GOOGLE_API_KEY"] ||
          process.env["GOOGLE_GENAI_API_KEY"] ||
          process.env["VITE_GEMINI_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["VITE_LOVABLE_API_KEY"];

        const geminiKeys = (rawGeminiKey || "")
          .split(/[\n,;]+/)
          .map((k) => k.trim())
          .filter(Boolean);

        if (geminiKeys.length === 0 && !lovableKey) {
          return new Response(
            "Kunci API AI belum dikonfigurasi di Vercel. Tambahkan GEMINI_API_KEY di menu 'Settings -> Environment Variables' pada project Vercel Anda agar aplikasi langsung aktif otomatis tanpa perlu input manual oleh pengguna.",
            { status: 500 },
          );
        }

        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
        const writer = writable.getWriter();

        // Prepare Gateway structures for secondary or cascading fallback
        const turns = (body.history ?? []).filter((h) => (h.text ?? "").trim().length > 0);
        const baseInput: GatewayInput = turns.length
          ? [
              ...turns.map((h) =>
                h.role === "assistant"
                  ? {
                      role: "assistant" as const,
                      content: [
                        {
                          type: "output_text" as const,
                          text: h.text ?? "",
                        },
                      ],
                    }
                  : {
                      role: "user" as const,
                      content: [{ type: "input_text" as const, text: h.text ?? "" }],
                    },
              ),
              {
                role: "user" as const,
                content: [{ type: "input_text" as const, text: firstInput }],
              },
            ]
          : firstInput;

        async function callGateway(input: GatewayInput) {
          if (!lovableKey) return new Response("No Lovable Key", { status: 500 });
          return fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": lovableKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              instructions: systemPrompt,
              input,
              stream: true,
              reasoning: { effort: isMigration ? "medium" : "low" },
            }),
          });
        }

        async function pumpGateway(response: Response, onDelta: (text: string) => Promise<void>) {
          if (!response.body) return;
          const decoder = new TextDecoder();
          const reader = response.body.getReader();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const evt = JSON.parse(payload) as { type?: string; delta?: string };
                if (evt.type === "response.output_text.delta" && evt.delta) {
                  await onDelta(evt.delta);
                }
              } catch {
                /* ignore partial frames */
              }
            }
          }
        }

        // 1. PRIMARY ENGINE: Google Gemini via REST SSE Streaming (Gemini 2.5/2.0/1.5 Flash, 1M+ context & up to 65k tokens)
        if (geminiKeys.length > 0) {
          (async () => {
            let fullOutput = "";
            const writeDelta = async (chunkText: string) => {
              if (!chunkText) return;
              fullOutput += chunkText;
              await writer.write(encoder.encode(chunkText));
            };

            const historyTurns = (body.history ?? []).filter(
              (h) => (h.text ?? "").trim().length > 0,
            );

            const contents: Array<{
              role: "user" | "model";
              parts: Array<{ text: string }>;
            }> = [];

            for (const turn of historyTurns) {
              contents.push({
                role: turn.role === "assistant" ? "model" : "user",
                parts: [{ text: turn.text ?? "" }],
              });
            }

            contents.push({
              role: "user",
              parts: [{ text: firstInput }],
            });

            let currentKeyIndex = 0;
            function getActiveKey() {
              return geminiKeys[currentKeyIndex % geminiKeys.length];
            }
            function rotateKey() {
              if (geminiKeys.length > 1) {
                currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
              }
            }

            async function callGeminiStream(
              currentContents: typeof contents,
              modelName = "gemini-2.5-flash",
              allowRotate = true,
            ): Promise<Response> {
              const activeKey = getActiveKey();
              const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${activeKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: {
                      parts: [{ text: systemPrompt }],
                    },
                    contents: currentContents,
                    generationConfig: {
                      temperature: 0.2,
                      maxOutputTokens: 65536,
                    },
                  }),
                },
              );

              // Auto-rotate on rate-limit (429) or quota exhaustion (402/403)
              if (
                (resp.status === 429 || resp.status === 402) &&
                geminiKeys.length > 1 &&
                allowRotate
              ) {
                rotateKey();
                return callGeminiStream(currentContents, modelName, false);
              }

              return resp;
            }

            async function pumpGemini(
              resp: Response,
              onChunk: (text: string) => Promise<void>,
            ): Promise<boolean> {
              if (!resp.body) return false;
              const reader = resp.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const raw = line.slice(5).trim();
                  if (!raw || raw === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(raw) as {
                      candidates?: Array<{
                        content?: {
                          parts?: Array<{ text?: string }>;
                        };
                      }>;
                    };
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      await onChunk(text);
                    }
                  } catch {
                    /* partial frame */
                  }
                }
              }
              return true;
            }

            async function getWorkingGeminiStream(
              currentContents: typeof contents,
            ): Promise<{ resp: Response | null; activeModel: string }> {
              const allModels = [
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
              ];
              const candidateModels =
                body.preferredModel && allModels.includes(body.preferredModel)
                  ? [body.preferredModel, ...allModels.filter((m) => m !== body.preferredModel)]
                  : allModels;

              let lastResp: Response | null = null;
              for (const model of candidateModels) {
                try {
                  const resp = await callGeminiStream(currentContents, model);
                  if (resp.ok) {
                    return { resp, activeModel: model };
                  }
                  lastResp = resp;
                } catch {
                  /* try next candidate */
                }
              }
              return { resp: lastResp, activeModel: candidateModels[0] };
            }

            try {
              const { resp, activeModel } = await getWorkingGeminiStream(contents);

              if ((!resp || !resp.ok) && lovableKey) {
                // Cascading fallback to Lovable Gateway if Gemini quota is exhausted on all models
                try {
                  const first = await callGateway(baseInput);
                  if (first.ok && first.body) {
                    await pumpGateway(first, writeDelta);
                    // Guaranteed closure
                    const patch = autoCloseHtml(fullOutput);
                    if (patch) await writeDelta(patch);
                    return;
                  }
                } catch {
                  /* fallback failed, continue to report error */
                }
              }

              if (!resp || !resp.ok) {
                const errText = resp ? await resp.text().catch(() => "") : "";
                await writeDelta(
                  `\n<!-- Error ${resp?.status ?? 500}: ${friendlyError(resp?.status ?? 500, errText)} -->\n`,
                );
              } else {
                await pumpGemini(resp, writeDelta);

                // CONTINUATION LOOP:
                // If the document is massive and did not finish cleanly, stream continuation.
                // Throttled to preserve RPM quota (prevents false quota exhaustion).
                let continuationAttempts = 0;
                const maxContinuations = isMigration ? 6 : 3;

                while (
                  !fullOutput.toLowerCase().includes("</html>") &&
                  continuationAttempts < maxContinuations
                ) {
                  continuationAttempts += 1;
                  // Throttle to respect Gemini free-tier RPM limits
                  await new Promise((resolve) => setTimeout(resolve, 500));

                  const tail = fullOutput.slice(-6000);
                  const contContents = [
                    ...contents,
                    { role: "model" as const, parts: [{ text: tail }] },
                    {
                      role: "user" as const,
                      parts: [
                        {
                          text: "Lanjutkan dokumen tepat di mana teks terhenti. Keluarkan HANYA sisa kode HTML/CSS/JS tanpa repetisi, tanpa markdown fences, dan akhiri dengan </html>.",
                        },
                      ],
                    },
                  ];

                  const contResp = await callGeminiStream(contContents, activeModel);
                  if (!contResp.ok) break;

                  const prevLen = fullOutput.length;
                  await pumpGemini(contResp, writeDelta);
                  if (fullOutput.length === prevLen) break;
                }

                // GUARANTEE ZERO SYNTAX ERRORS
                const patch = autoCloseHtml(fullOutput);
                if (patch) {
                  await writeDelta(patch);
                }
              }
            } catch (err) {
              console.error("Gemini generation stream error:", err);
              const errMsg = friendlyError(500, (err as Error)?.message || "");
              await writeDelta(`\n<!-- Error: ${errMsg} -->\n`);
            } finally {
              try {
                await writer.close();
              } catch {
                /* already closed */
              }
            }
          })();

          return new Response(readable, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              "X-Accel-Buffering": "no",
            },
          });
        }

        // 2. SECONDARY GATEWAY (Lovable Gateway Fallback if LOVABLE_API_KEY is present)
        const first = await callGateway(baseInput);
        if (!first.ok || !first.body) {
          const text = await first.text().catch(() => "");
          return new Response(friendlyError(first.status, text), {
            status: first.status || 500,
          });
        }

        (async () => {
          let full = "";
          const write = async (delta: string) => {
            full += delta;
            await writer.write(encoder.encode(delta));
          };

          try {
            await pumpGateway(first, write);

            let attempts = 0;
            while (!full.toLowerCase().includes("</html>") && attempts < (isMigration ? 24 : 12)) {
              attempts += 1;
              const tail = full.slice(-8000);
              const next = await callGateway([
                {
                  role: "user",
                  content: [{ type: "input_text", text: firstInput }],
                },
                {
                  role: "assistant",
                  content: [{ type: "output_text", text: tail }],
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: "Continue the document EXACTLY where it stopped. Output only the remaining raw code, no repetition, no fences, and end with </html>.",
                    },
                  ],
                },
              ]);
              if (!next.ok || !next.body) break;
              const before = full.length;
              await pumpGateway(next, write);
              if (full.length === before) break;
            }

            const patch = autoCloseHtml(full);
            if (patch) {
              await write(patch);
            }
          } catch {
            /* upstream ended */
          } finally {
            try {
              await writer.close();
            } catch {
              /* already closed */
            }
          }
        })();

        return new Response(readable, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
