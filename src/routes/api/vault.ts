import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";

// Brankas backend: nilai rahasia (password, token, kunci API) disimpan di
// cookie terenkripsi httpOnly milik server, bukan di kode atau browser.

type VaultSession = { secrets?: Record<string, string> };

type Body = {
  action: "save" | "status" | "clear";
  secrets?: Record<string, string>;
};

function session() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSession<VaultSession>({
    password: process.env["SESSION_SECRET"] as string,
    name: "ghighais-vault",
    maxAge: 60 * 60 * 24 * 90,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/vault")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env["SESSION_SECRET"]) {
          return json({ error: "Brankas backend belum siap" }, 500);
        }
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Permintaan tidak valid" }, 400);
        }

        const store = await session();
        const current = store.data.secrets ?? {};

        if (body.action === "save") {
          const incoming = body.secrets ?? {};
          const next = { ...current };
          for (const [key, value] of Object.entries(incoming)) {
            if (typeof value === "string" && value.trim()) next[key] = value;
            else delete next[key];
          }
          await store.update({ secrets: next });
          return json({ ok: true, keys: Object.keys(next) });
        }

        if (body.action === "clear") {
          await store.clear();
          return json({ ok: true, keys: [] });
        }

        // status: hanya nama kunci yang dikembalikan, nilainya tetap di backend.
        return json({ ok: true, keys: Object.keys(current) });
      },
    },
  },
});
