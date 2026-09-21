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
            const url = (body.url ?? "").trim();
            const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
            if (!match) return json({ error: "URL GitHub tidak valid" }, 400);
            const repo = `${match[1]}/${String(match[2]).replace(/\.git$/, "")}`;
            const headers = body.token
              ? gh(body.token)
              : { Accept: "application/vnd.github+json", "User-Agent": "ghighais-ai" };

            const repoRes = await fetch(`${GH}/repos/${repo}`, { headers });
            if (!repoRes.ok) return json({ error: "Repository tidak ditemukan" }, repoRes.status);
            const repoData = (await repoRes.json()) as { default_branch: string };

            const treeRes = await fetch(
              `${GH}/repos/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
              { headers },
            );
            if (!treeRes.ok) return json({ error: "Gagal membaca isi repository" }, treeRes.status);
            const tree = (await treeRes.json()) as {
              tree: Array<{ path: string; type: string; size?: number }>;
            };
            const files = tree.tree
              .filter((t) => t.type === "blob")
              .map((t) => t.path)
              .slice(0, 400);

            const preferred =
              files.find((f) => f.toLowerCase() === "index.html") ??
              files.find((f) => f.toLowerCase().endsWith(".html")) ??
              files.find((f) => /\.(tsx|jsx|ts|js|md)$/i.test(f));

            async function readFile(path: string) {
              const fileRes = await fetch(
                `${GH}/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${repoData.default_branch}`,
                { headers },
              );
              if (!fileRes.ok) return "";
              const data = (await fileRes.json()) as { content?: string };
              return data.content ? fromBase64(data.content) : "";
            }

            const content = preferred ? await readFile(preferred) : "";

            // Collect a few more source files so the AI can rebuild the app
            // faithfully when the repo is not a single static HTML page.
            const extra = files
              .filter((f) => f !== preferred)
              .filter((f) => /\.(html|css|js|jsx|ts|tsx|json|md)$/i.test(f))
              .filter((f) => !/node_modules|package-lock|bun\.lock|\.min\./i.test(f))
              .slice(0, 8);

            // Mode "deep" dipakai untuk migrasi database: ambil semua berkas yang
            // menyimpan skema, migrasi, model, query dan konfigurasi database.
            const dbPattern =
              /(\.sql$|schema|migration|migrations|prisma|drizzle|knex|sequelize|typeorm|models?\/|entities?\/|seed|database|\bdb\b|supabase|turso|neon|mongo|firebase|\.env\.example$)/i;
            const dbFiles = body.deep
              ? files
                  .filter((f) => dbPattern.test(f))
                  .filter((f) => !/node_modules|package-lock|bun\.lock|\.min\./i.test(f))
                  .slice(0, 80)
              : [];

            const limit = body.deep ? 400000 : 60000;
            let sources = preferred ? `--- FILE: ${preferred} ---\n${content}\n` : "";
            const seen = new Set<string>([preferred ?? ""]);
            for (const path of [...dbFiles, ...extra]) {
              if (sources.length > limit) break;
              if (seen.has(path)) continue;
              seen.add(path);
              const text = await readFile(path);
              if (text) sources += `\n--- FILE: ${path} ---\n${text.slice(0, 20000)}\n`;
            }

            return json({
              repo,
              branch: repoData.default_branch,
              files,
              entry: preferred,
              content,
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
