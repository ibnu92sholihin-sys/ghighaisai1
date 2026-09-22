import { createFileRoute } from "@tanstack/react-router";

type Body = {
  action: "repos" | "push" | "import" | "create_repo";
  token?: string;
  repo?: string;
  path?: string;
  message?: string;
  content?: string;
  url?: string;
  deep?: boolean;
  private?: boolean;
};

const GH = "https://api.github.com";

function gh(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "ghighais-ai",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(b64: string) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const Route = createFileRoute("/api/github")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Permintaan tidak valid" }, 400);
        }

        try {
          if (body.action === "repos") {
            if (!body.token) return json({ error: "Token GitHub wajib diisi" }, 400);
            const res = await fetch(`${GH}/user/repos?per_page=100&sort=updated`, {
              headers: gh(body.token),
            });
            if (!res.ok) return json({ error: "Token GitHub ditolak" }, res.status);
            const repos = (await res.json()) as Array<{
              full_name: string;
              private: boolean;
              default_branch: string;
            }>;
            return json({
              repos: repos.map((r) => ({
                fullName: r.full_name,
                private: r.private,
                branch: r.default_branch,
              })),
            });
          }

          if (body.action === "create_repo") {
            if (!body.token || !body.repo)
              return json({ error: "Token dan nama repository wajib diisi" }, 400);

            const repoName = body.repo.replace(/^.*\//, "").trim();
            const createRes = await fetch(`${GH}/user/repos`, {
              method: "POST",
              headers: { ...gh(body.token), "Content-Type": "application/json" },
              body: JSON.stringify({
                name: repoName,
                private: Boolean(body.private),
                auto_init: true,
                description: "Dibuat dengan GHIGHAIS AI",
              }),
            });

            if (!createRes.ok) {
              const err = (await createRes.json().catch(() => ({}))) as { message?: string };
              return json(
                { error: err.message || "Gagal membuat repository di GitHub" },
                createRes.status,
              );
            }

            const newRepo = (await createRes.json()) as {
              full_name: string;
              private: boolean;
              default_branch: string;
            };

            return json({
              ok: true,
              repo: {
                fullName: newRepo.full_name,
                private: newRepo.private,
                branch: newRepo.default_branch || "main",
              },
            });
          }

          if (body.action === "push") {
            if (!body.token || !body.repo || !body.content)
              return json({ error: "Data push tidak lengkap" }, 400);

            // Push hanya menambah/memperbarui satu berkas aplikasi.
            // Semua berkas lain di repo (termasuk berkas database) tetap utuh.
            const repoRes = await fetch(`${GH}/repos/${body.repo}`, { headers: gh(body.token) });
            if (!repoRes.ok) {
              return json(
                {
                  error:
                    repoRes.status === 404
                      ? "Repository tidak ditemukan atau token belum punya akses ke repo ini"
                      : "Tidak bisa membuka repository dengan token ini",
                },
                repoRes.status,
              );
            }
            const repoInfo = (await repoRes.json()) as {
              default_branch: string;
              permissions?: { push?: boolean; admin?: boolean; maintain?: boolean };
            };
            const canPush =
              repoInfo.permissions === undefined ||
              repoInfo.permissions.push ||
              repoInfo.permissions.admin ||
              repoInfo.permissions.maintain;
            if (!canPush) {
              return json(
                {
                  error:
                    "Token GitHub belum punya izin tulis (write) ke repo ini. Buat token dengan akses Contents: Read and write.",
                },
                403,
              );
            }

            const branch = repoInfo.default_branch;
            const path = body.path?.trim() || "index.html";
            const fileUrl = `${GH}/repos/${body.repo}/contents/${path}`;

            async function attempt(useSha: boolean) {
              let sha: string | undefined;
              if (useSha) {
                const existing = await fetch(`${fileUrl}?ref=${branch}`, {
                  headers: gh(body.token as string),
                });
                if (existing.ok) {
                  const data = (await existing.json()) as { sha?: string };
                  sha = data.sha;
                }
              }
              return fetch(fileUrl, {
                method: "PUT",
                headers: { ...gh(body.token as string), "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: body.message || "Update dari GHIGHAIS AI",
                  content: toBase64(body.content as string),
                  branch,
                  ...(sha ? { sha } : {}),
                }),
              });
            }

            let res = await attempt(true);
            // Konflik versi (409/422) terjadi kalau berkas berubah saat bersamaan.
            // Ambil ulang sha terbaru lalu coba lagi, supaya push tidak ditolak.
            for (let i = 0; i < 3 && (res.status === 409 || res.status === 422); i++) {
              res = await attempt(true);
            }
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { message?: string };
              const friendly =
                res.status === 403 || res.status === 401
                  ? "Push ditolak: token GitHub perlu izin tulis (Contents: Read and write) untuk repo ini."
                  : err.message || "Gagal push";
              return json({ error: friendly }, res.status);
            }
            const data = (await res.json()) as { content?: { html_url?: string } };
            return json({ ok: true, url: data.content?.html_url, branch, path });
          }

          if (body.action === "import") {
            const rawUrl = (body.url ?? "").trim();
            if (!rawUrl) return json({ error: "URL GitHub tidak boleh kosong" }, 400);

            // Parser URL GitHub lengkap (mendukung link repo, tree, blob, raw, maupun shorthand owner/repo)
            function parseGitHubRepoUrl(input: string) {
              const trimmed = input.trim();
              const rawMatch = trimmed.match(
                /raw\.githubusercontent\.com\/([^/\s]+)\/([^/\s]+)\/([^/\s]+)\/(.+)/i,
              );
              if (rawMatch) {
                return {
                  owner: rawMatch[1],
                  repo: rawMatch[2].replace(/\.git$/, ""),
                  branch: rawMatch[3],
                  filePath: decodeURIComponent(rawMatch[4]),
                };
              }

              const blobTreeMatch = trimmed.match(
                /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)\/(?:blob|tree)\/([^/\s#?]+)(?:\/(.+))?/i,
              );
              if (blobTreeMatch) {
                return {
                  owner: blobTreeMatch[1],
                  repo: blobTreeMatch[2].replace(/\.git$/, ""),
                  branch: blobTreeMatch[3],
                  filePath: blobTreeMatch[4] ? decodeURIComponent(blobTreeMatch[4]) : undefined,
                };
              }

              const standardMatch = trimmed.match(
                /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i,
              );
              if (standardMatch) {
                return {
                  owner: standardMatch[1],
                  repo: standardMatch[2].replace(/\.git$/, ""),
                  branch: undefined,
                  filePath: undefined,
                };
              }

              const shortMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
              if (shortMatch) {
                return {
                  owner: shortMatch[1],
                  repo: shortMatch[2].replace(/\.git$/, ""),
                  branch: undefined,
                  filePath: undefined,
                };
              }

              return null;
            }

            const parsed = parseGitHubRepoUrl(rawUrl);
            if (!parsed) {
              return json(
                {
                  error:
                    "Format URL GitHub tidak dikenali. Masukkan contoh: https://github.com/owner/repo atau link file repository.",
                },
                400,
              );
            }

            const repoFull = `${parsed.owner}/${parsed.repo}`;
            const token =
              body.token ||
              process.env["GITHUB_TOKEN"] ||
              process.env["GH_TOKEN"] ||
              process.env["VITE_GITHUB_TOKEN"] ||
              "";
            const headers = token
              ? gh(token)
              : { Accept: "application/vnd.github+json", "User-Agent": "ghighais-ai" };

            const repoRes = await fetch(`${GH}/repos/${repoFull}`, { headers });
            if (!repoRes.ok) {
              if (repoRes.status === 404) {
                return json(
                  {
                    error: `Repository '${repoFull}' tidak ditemukan atau bersifat privat. Masukkan Personal Access Token (PAT) Anda di Menu jika ini repo privat.`,
                  },
                  404,
                );
              }
              if (repoRes.status === 403 || repoRes.status === 429) {
                return json(
                  {
                    error:
                      "Batas laju request publik GitHub tercapai. Masukkan Personal Access Token (PAT) GitHub di Menu untuk akses instan tanpa batas.",
                  },
                  403,
                );
              }
              return json({ error: "Gagal membuka data repository GitHub" }, repoRes.status);
            }

            const repoData = (await repoRes.json()) as { default_branch: string };
            const activeBranch = parsed.branch || repoData.default_branch || "main";

            // Ambil pohon file repository
            const treeRes = await fetch(
              `${GH}/repos/${repoFull}/git/trees/${activeBranch}?recursive=1`,
              { headers },
            );
            let files: string[] = [];
            if (treeRes.ok) {
              const tree = (await treeRes.json()) as {
                tree: Array<{ path: string; type: string; size?: number }>;
              };
              files = tree.tree
                .filter((t) => t.type === "blob")
                .map((t) => t.path)
                .slice(0, 500);
            }

            async function readFile(path: string) {
              try {
                const fileRes = await fetch(
                  `${GH}/repos/${repoFull}/contents/${encodeURIComponent(path)}?ref=${activeBranch}`,
                  { headers },
                );
                if (fileRes.ok) {
                  const data = (await fileRes.json()) as { content?: string };
                  if (data.content) return fromBase64(data.content);
                }
                const rawRes = await fetch(
                  `https://raw.githubusercontent.com/${repoFull}/${activeBranch}/${path}`,
                );
                if (rawRes.ok) return await rawRes.text();
              } catch {
                // ignore
              }
              return "";
            }

            // Tentukan entry point
            let preferred: string | undefined = parsed.filePath;
            if (preferred && !files.includes(preferred)) {
              preferred =
                files.find((f) => f.toLowerCase() === preferred?.toLowerCase()) ||
                files.find((f) => f.toLowerCase().endsWith(preferred?.toLowerCase() ?? ""));
            }

            if (!preferred) {
              preferred =
                files.find((f) => f.toLowerCase() === "index.html") ??
                files.find((f) => f.toLowerCase() === "public/index.html") ??
                files.find((f) => f.toLowerCase().endsWith("index.html")) ??
                files.find((f) => f.toLowerCase().endsWith(".html")) ??
                files.find((f) =>
                  /^(src\/)?(App|main|index)\.(tsx|jsx|vue|svelte|ts|js)$/i.test(f),
                ) ??
                files.find((f) => /\.(tsx|jsx|vue|svelte|ts|js|md)$/i.test(f));
            }

            let content = preferred ? await readFile(preferred) : "";

            // Deteksi framework dari package.json
            let framework = "Web";
            let packageJsonContent = "";
            if (files.includes("package.json")) {
              packageJsonContent = await readFile("package.json");
              if (packageJsonContent) {
                try {
                  const pkg = JSON.parse(packageJsonContent) as {
                    dependencies?: Record<string, string>;
                    devDependencies?: Record<string, string>;
                  };
                  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                  if (deps["next"]) framework = "Next.js";
                  else if (deps["@remix-run/react"]) framework = "Remix";
                  else if (deps["vue"]) framework = "Vue";
                  else if (deps["svelte"]) framework = "Svelte";
                  else if (deps["react"]) framework = "React";
                  else if (deps["astro"]) framework = "Astro";
                  else if (deps["vite"]) framework = "Vite";
                } catch {
                  // ignore
                }
              }
            }

            // Periksa apakah dokumen HTML bisa langsung ditampilkan tanpa error 404
            let canPreviewDirectly = false;
            if (
              preferred &&
              preferred.toLowerCase().endsWith(".html") &&
              content.toLowerCase().includes("</html>")
            ) {
              const hasLocalModuleScript =
                /<script\s+[^>]*src=["'](\/src\/|\.\/src\/|\.\/main|\/main|\.\/app)[^"']*\.(tsx?|jsx?)/i.test(
                  content,
                );
              const isEmptyRootOnly =
                /<div\s+id=["'](root|app)["']\s*>\s*<\/div>/i.test(content) &&
                !content.includes("<script>") &&
                !content.includes('<script type="text/javascript">');

              if (!hasLocalModuleScript && !isEmptyRootOnly) {
                // Inlining file CSS lokal agar tampilan langsung beres (menangani urutan rel/href mana pun dan huruf besar/kecil)
                const linkMatches = [...content.matchAll(/<link\b([^>]*?)>/gi)];
                for (const match of linkMatches) {
                  const tagAttrs = match[1];
                  const isStylesheet =
                    /rel=["']?stylesheet["']?/i.test(tagAttrs) ||
                    /type=["']?text\/css["']?/i.test(tagAttrs);
                  const hrefMatch = tagAttrs.match(/href=["']?([^"'\s>]+)["']?/i);
                  if (isStylesheet && hrefMatch) {
                    const href = hrefMatch[1];
                    if (
                      !href.startsWith("http") &&
                      !href.startsWith("//") &&
                      !href.startsWith("data:")
                    ) {
                      const cleanHref = href.replace(/^\.?\//, "");
                      const matchedCssFile = files.find(
                        (f) =>
                          f.toLowerCase() === cleanHref.toLowerCase() ||
                          f.toLowerCase().endsWith(cleanHref.toLowerCase()) ||
                          f.toLowerCase().endsWith("/" + cleanHref.toLowerCase()),
                      );
                      if (matchedCssFile) {
                        const cssCode = await readFile(matchedCssFile);
                        if (cssCode) {
                          content = content.replace(
                            match[0],
                            `<style>/* Inlined: ${cleanHref} */\n${cssCode}</style>`,
                          );
                        }
                      }
                    }
                  }
                }

                // Inlining file JS lokal vanilla
                const scriptMatches = [
                  ...content.matchAll(
                    /<script\b([^>]*?)src=["']?([^"'\s>]+)["']?([^>]*?)>\s*<\/script>/gi,
                  ),
                ];
                for (const match of scriptMatches) {
                  const src = match[2];
                  if (
                    !src.startsWith("http") &&
                    !src.startsWith("//") &&
                    !src.startsWith("data:") &&
                    !src.endsWith(".tsx") &&
                    !src.endsWith(".ts") &&
                    !src.endsWith(".jsx")
                  ) {
                    const cleanSrc = src.replace(/^\.?\//, "");
                    const matchedJsFile = files.find(
                      (f) =>
                        f.toLowerCase() === cleanSrc.toLowerCase() ||
                        f.toLowerCase().endsWith(cleanSrc.toLowerCase()) ||
                        f.toLowerCase().endsWith("/" + cleanSrc.toLowerCase()),
                    );
                    if (matchedJsFile) {
                      const jsCode = await readFile(matchedJsFile);
                      if (jsCode) {
                        content = content.replace(
                          match[0],
                          `<script>/* Inlined: ${cleanSrc} */\n${jsCode}</script>`,
                        );
                      }
                    }
                  }
                }

                // Ubah gambar relatif ke raw github
                content = content.replace(
                  /<img\s+([^>]*?)src=["'](\.\/|(?!\/|http:\/\/|https:\/\/|data:))([^"']+)["']/gi,
                  (_m, attrs, _pfx, srcPath) => {
                    return `<img ${attrs}src="https://raw.githubusercontent.com/${repoFull}/${activeBranch}/${srcPath}"`;
                  },
                );

                canPreviewDirectly = true;
              }
            }

            // Kumpulkan berkas-berkas penting untuk kompilasi AI
            const keyComponents = files
              .filter((f) => f !== preferred && f !== "package.json")
              .filter(
                (f) =>
                  /^(src\/|components\/|pages\/|app\/|lib\/)/i.test(f) ||
                  /\.(tsx|jsx|vue|svelte|css|json|html)$/i.test(f) ||
                  /README\.md$/i.test(f),
              )
              .filter((f) => !/node_modules|package-lock|bun\.lock|\.min\./i.test(f))
              .slice(0, 15);

            const dbPattern =
              /(\.sql$|schema|migration|migrations|prisma|drizzle|knex|sequelize|typeorm|models?\/|entities?\/|seed|database|\bdb\b|supabase|turso|neon|mongo|firebase|\.env\.example$)/i;
            const dbFiles = body.deep
              ? files
                  .filter((f) => dbPattern.test(f))
                  .filter((f) => !/node_modules|package-lock|bun\.lock|\.min\./i.test(f))
                  .slice(0, 80)
              : [];

            const limit = body.deep ? 400000 : 80000;
            let sources = "";
            if (packageJsonContent) {
              sources += `--- FILE: package.json ---\n${packageJsonContent}\n`;
            }
            if (preferred && content) {
              sources += `--- FILE: ${preferred} ---\n${content}\n`;
            }

            const seen = new Set<string>([preferred ?? "", "package.json"]);
            for (const path of [...dbFiles, ...keyComponents]) {
              if (sources.length > limit) break;
              if (seen.has(path)) continue;
              seen.add(path);
              const text = await readFile(path);
              if (text) sources += `\n--- FILE: ${path} ---\n${text.slice(0, 20000)}\n`;
            }

            return json({
              ok: true,
              repo: repoFull,
              branch: activeBranch,
              files,
              entry: preferred,
              content,
              canPreviewDirectly,
              needsCompilation: !canPreviewDirectly,
              framework,
              sources,
            });
          }

          return json({ error: "Aksi tidak dikenal" }, 400);
        } catch (error) {
          return json({ error: (error as Error).message }, 500);
        }
      },
    },
  },
});
