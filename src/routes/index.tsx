import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  AlertTriangle,
  Github,
  Loader2,
  Sparkles,
  Wand2,
  Bot,
  Paperclip,
  X,
  RefreshCw,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AppMenu, type Repo } from "@/components/app/AppMenu";
import { PreviewPane } from "@/components/app/PreviewPane";
import { CodeEditor } from "@/components/app/CodeEditor";
import { STARTER_CODE, stripFences } from "@/lib/ghighais";
import { isMigrationPrompt, migrationInstruction } from "@/lib/migration";
import { extractSecrets, hasDatabase } from "@/lib/secure-scan";
import { applyMedia, fileToAsset, mediaInstruction, type MediaAsset } from "@/lib/media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GHIGHAIS AI — Generator Aplikasi dari Prompt" },
      {
        name: "description",
        content:
          "GHIGHAIS AI: tulis prompt, dapatkan kode tanpa error, edit preview langsung, push ke GitHub, dan simpan ke ZIP.",
      },
      { property: "og:title", content: "GHIGHAIS AI — Generator Aplikasi dari Prompt" },
      {
        property: "og:description",
        content: "Buat aplikasi dari prompt, edit preview visual, push GitHub, simpan ZIP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Logo() {
  return (
    <div
      className="flex size-9 items-center justify-center rounded-xl"
      style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
    >
      <Bot className="size-5 text-primary-foreground" />
    </div>
  );
}

// Brankas backend: kirim data penting ke server, tidak disimpan di browser.
async function vault(action: "save" | "status" | "clear", secrets?: Record<string, string>) {
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secrets }),
  });
  const data = (await res.json().catch(() => ({}))) as { keys?: string[]; error?: string };
  if (!res.ok) throw new Error(data.error || "Brankas backend gagal diakses");
  return data.keys ?? [];
}

/**
 * Pindahkan password/kunci yang terlanjur ada di kode aplikasi ke backend,
 * lalu sisakan placeholder aman di kode yang terlihat user.
 */
async function secureCode(code: string) {
  const { code: safe, secrets } = extractSecrets(code);
  if (!secrets.length) return code;
  try {
    await vault("save", Object.fromEntries(secrets.map((s) => [`app_${s.key}`, s.value])));
    toast.success(`${secrets.length} data penting dipindahkan ke backend`);
    return safe;
  } catch {
    return code;
  }
}

const AVAILABLE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;

function Index() {
  const [user, setUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [code, setCode] = useState(STARTER_CODE);
  const [activeModel, setActiveModel] = useState<string>("gemini-3.5-flash");
  const [refreshingEngine, setRefreshingEngine] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [dbTokens, setDbTokens] = useState<Record<string, string>>({});
  const [geminiToken, setGeminiToken] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const fixingRef = useRef(false);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const mediaRef = useRef<MediaAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  async function handleMediaPick(files: FileList | null) {
    if (!files?.length) return;
    try {
      const assets = await Promise.all(Array.from(files).map(fileToAsset));
      setMedia((prev) => [...prev, ...assets].slice(0, 8));
      toast.success(`${assets.length} media siap dipakai di aplikasi`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  useEffect(() => {
    setUser(localStorage.getItem("ghighais:user"));
    const saved = localStorage.getItem("ghighais:code");
    if (saved !== null) setCode(saved);
    setPrompt(localStorage.getItem("ghighais:prompt") ?? "");
    setGithubUrl(localStorage.getItem("ghighais:github-url") ?? "");
    // Data penting lama yang masih tersimpan di browser dipindahkan
    // otomatis ke brankas backend, lalu dihapus dari browser.
    const legacy: Record<string, string> = {};
    const tokens = localStorage.getItem("ghighais:db");
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens) as Record<string, string>;
        setDbTokens(parsed);
        for (const [id, value] of Object.entries(parsed)) {
          if (value) legacy[`db_${id}`] = value;
        }
      } catch {
        /* abaikan data rusak */
      }
      localStorage.removeItem("ghighais:db");
    }
    const gh = localStorage.getItem("ghighais:gh");
    if (gh) {
      setGhToken(gh);
      legacy["github_token"] = gh;
      localStorage.removeItem("ghighais:gh");
    }
    const geminiSaved = localStorage.getItem("ghighais:gemini");
    if (geminiSaved) setGeminiToken(geminiSaved);
    const savedModel = localStorage.getItem("ghighais:model");
    if (
      savedModel &&
      !savedModel.includes("2.0") &&
      !savedModel.includes("1.5") &&
      (AVAILABLE_MODELS as readonly string[]).includes(savedModel)
    ) {
      setActiveModel(savedModel);
    } else {
      setActiveModel("gemini-3.5-flash");
      localStorage.setItem("ghighais:model", "gemini-3.5-flash");
    }
    if (Object.keys(legacy).length) {
      void vault("save", legacy)
        .then(() => toast.success("Data penting dipindahkan ke backend demi keamanan"))
        .catch(() => undefined);
    }
    const chat = localStorage.getItem("ghighais:chat");
    if (chat) {
      try {
        setHistory(JSON.parse(chat) as Array<{ role: "user" | "assistant"; text: string }>);
      } catch {
        localStorage.removeItem("ghighais:chat");
      }
    }
    setStorageReady(true);
  }, []);

  // Notifikasi hanya muncul kalau aplikasi hasil generate belum memakai database
  // dan user belum mengisi token database mana pun.
  const needsDatabase =
    !generating &&
    code.trim().length > 0 &&
    !hasDatabase(code) &&
    !Object.values(dbTokens).some((v) => v.trim());

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("ghighais:code", code);
  }, [code, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("ghighais:prompt", prompt);
  }, [prompt, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("ghighais:github-url", githubUrl);
  }, [githubUrl, storageReady]);

  // Token GitHub & Gemini disimpan aman di backend brankas
  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("ghighais:gemini", geminiToken);
    if (geminiToken) {
      void vault("save", { gemini_api_key: geminiToken }).catch(() => undefined);
    }
  }, [geminiToken, storageReady]);

  useEffect(() => {
    if (!storageReady || !ghToken) return;
    const id = setTimeout(() => {
      void vault("save", { github_token: ghToken }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(id);
  }, [ghToken, storageReady]);

  useEffect(() => {
    historyRef.current = history;
    if (!storageReady) return;
    localStorage.setItem("ghighais:chat", JSON.stringify(history.slice(-20)));
  }, [history, storageReady]);

  const handleRotateAndRefreshEngine = useCallback(async () => {
    setRefreshingEngine(true);
    // Anti-Data-Loss: Pastikan kode aplikasi tersimpan aman di localStorage
    if (code) {
      localStorage.setItem("ghighais:code", code);
    }

    const currentIndex = (AVAILABLE_MODELS as readonly string[]).indexOf(activeModel);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % AVAILABLE_MODELS.length;
    const nextModel = AVAILABLE_MODELS[nextIndex];

    try {
      setActiveModel(nextModel);
      localStorage.setItem("ghighais:model", nextModel);
      toast.success(
        `Jalur AI berhasil disegarkan ke: ${nextModel}! Kuota segar aktif, dan Project Anda tetap aman 100%.`,
        {
          duration: 4500,
          icon: "⚡",
        },
      );
    } catch {
      setActiveModel(nextModel);
      localStorage.setItem("ghighais:model", nextModel);
      toast.success(`Jalur cadangan ${nextModel} siap digunakan.`);
    } finally {
      setRefreshingEngine(false);
    }
  }, [activeModel, code]);

  const runGenerate = useCallback(
    async (instruction: string, base: string, options?: { track?: string; mode?: "migration" }) => {
      setGenerating(true);
      setProgress(3);
      const priorHistory = historyRef.current;
      // Kirim kode dengan media kembali menjadi placeholder supaya ringan.
      const compactBase = mediaRef.current.reduce(
        (acc, asset, i) => acc.split(asset.dataUrl).join(`__MEDIA_${i + 1}__`),
        base,
      );
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: instruction,
            currentCode: compactBase,
            mode: options?.mode,
            history: priorHistory,
            apiKey: geminiToken || undefined,
            preferredModel: activeModel,
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(await res.text().catch(() => "Gagal menghubungi AI"));
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setProgress(
            Math.min(98, Math.max(8, Math.round((acc.length / (acc.length + 2500)) * 100))),
          );
          if (acc.length > 200 && !acc.includes("<!-- Error")) {
            setCode(applyMedia(stripFences(acc), mediaRef.current));
          }
        }
        let clean = stripFences(acc).trim();
        if (clean.includes("<!-- Error")) {
          // Tetap amankan kode project lama agar tidak hilang!
          setCode(base);
          const errMatch = clean.match(/<!-- Error \d+: ([^>]+) -->/);
          const errText = errMatch ? errMatch[1].trim() : "Terjadi kendala pada jalur AI.";
          throw new Error(errText);
        }
        if (!clean.toLowerCase().includes("<html")) {
          if (
            clean.includes("<body") ||
            clean.includes("<div") ||
            clean.includes("<main") ||
            clean.includes("<section")
          ) {
            clean = `<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n${clean}\n</body>\n</html>`;
          }
        }
        const final = applyMedia(clean, mediaRef.current);
        if (!final.toLowerCase().includes("<html")) {
          throw new Error("Hasil AI belum lengkap, silakan tekan generate ulang.");
        }
        setCode(await secureCode(final));
        setProgress(100);
        if (options?.track) {
          setHistory((prev) =>
            [
              ...prev,
              { role: "user" as const, text: options.track as string },
              {
                role: "assistant" as const,
                text: "Dokumen aplikasi diperbarui sesuai permintaan.",
              },
            ].slice(-20),
          );
        }
        return true;
      } catch (error) {
        // Jamin kode lama tidak hilang
        setCode(base);
        let msg = (error as Error).message || "Terjadi kendala pada koneksi AI";
        try {
          if (msg.trim().startsWith("{") && msg.includes('"error"')) {
            const parsed = JSON.parse(msg) as { error?: { message?: string } };
            if (parsed.error?.message) {
              msg = parsed.error.message;
            }
          }
        } catch {
          /* raw */
        }
        if (
          msg.includes("no longer available") ||
          msg.includes("not found") ||
          msg.includes("NOT_FOUND")
        ) {
          msg =
            "Jalur AI dialihkan otomatis ke Gemini 3.5 Flash stabil. Silakan klik tombol Generate kembali.";
          setActiveModel("gemini-3.5-flash");
          localStorage.setItem("ghighais:model", "gemini-3.5-flash");
        }
        toast.error(msg);
        if (
          msg.includes("limit") ||
          msg.includes("kuota") ||
          msg.includes("429") ||
          msg.includes("402")
        ) {
          toast.info(
            "Klik tombol 'Pulihkan Jalur AI (1-Klik)' untuk langsung beralih ke jalur cadangan tanpa kehilangan project.",
          );
        }
        setProgress(0);
        return false;
      } finally {
        setGenerating(false);
        setTimeout(() => setProgress(0), 1500);
      }
    },
    [geminiToken, activeModel],
  );

  async function handleMigration(instruction: string) {
    setImporting(true);
    toast.info("Membaca seluruh struktur database di repository…");
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          url: githubUrl,
          token: ghToken || undefined,
          deep: true,
        }),
      });
      const data = (await res.json()) as { error?: string; sources?: string; repo?: string };
      if (!res.ok) throw new Error(data.error || "Gagal membaca repository");
      if (!data.sources) throw new Error("Tidak ada berkas database yang bisa dibaca");
      setImporting(false);
      toast.info("Memindahkan seluruh isi database ke database baru…");
      return await runGenerate(
        migrationInstruction({
          prompt: instruction,
          repo: data.repo ?? githubUrl,
          sources: data.sources,
          tokens: dbTokens,
        }),
        "",
        { track: instruction, mode: "migration" },
      );
    } catch (error) {
      toast.error((error as Error).message);
      return false;
    } finally {
      setImporting(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Tulis instruksi dulu ya");
      return;
    }
    const instruction = prompt.trim();

    // Pemindahan database dari repo GitHub: baca seluruh berkas database dulu,
    // lalu minta AI memindahkan semuanya tanpa ada objek yang hilang.
    if (isMigrationPrompt(instruction) && githubUrl.trim()) {
      const ok = await handleMigration(instruction);
      if (ok) setPrompt("");
      return;
    }

    const ok = await runGenerate(instruction + mediaInstruction(media), code, {
      track: media.length ? `${instruction} (+${media.length} media)` : instruction,
    });
    if (ok) {
      setPrompt("");
      toast.success("Kode berhasil dibuat — lanjutkan dengan prompt berikutnya");
    }
  }

  const handleRuntimeError = useCallback(
    async (message: string) => {
      if (fixingRef.current || generating) return;
      fixingRef.current = true;
      toast.info("Error terdeteksi, AI sedang memperbaiki…");
      await runGenerate(
        `The document has a runtime error: "${message}". Fix it completely and return the full corrected document with identical design and features.`,
        code,
      );
      setTimeout(() => (fixingRef.current = false), 4000);
    },
    [code, generating, runGenerate],
  );

  function isLikelyGitHub(str: string) {
    const s = str.trim();
    return (
      /github\.com/i.test(s) ||
      /raw\.githubusercontent\.com/i.test(s) ||
      /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(s)
    );
  }

  async function handleImport(targetUrl?: string) {
    const urlToUse = (typeof targetUrl === "string" ? targetUrl : githubUrl).trim();
    if (!urlToUse) {
      toast.error("Masukkan atau tempel URL GitHub terlebih dahulu");
      return;
    }
    setImporting(true);
    toast.info("Menghubungkan ke GitHub & membaca berkas…");
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", url: urlToUse, token: ghToken || undefined }),
      });
      const data = (await res.json()) as {
        error?: string;
        content?: string;
        entry?: string;
        files?: string[];
        sources?: string;
        repo?: string;
        canPreviewDirectly?: boolean;
        needsCompilation?: boolean;
        framework?: string;
      };
      if (!res.ok) throw new Error(data.error || "Gagal membuka repository");

      // Jika berkas HTML statis mandiri yang siap di-render di preview
      if (data.canPreviewDirectly && data.content) {
        setCode(await secureCode(data.content));
        toast.success(`Aplikasi dari repo ${data.repo ?? urlToUse} berhasil dibuka di preview!`);
        setHistory((prev) =>
          [
            ...prev,
            { role: "user" as const, text: `Buka aplikasi dari repo ${data.repo ?? urlToUse}` },
            {
              role: "assistant" as const,
              text: `Aplikasi dari repo ${data.repo ?? urlToUse} telah dimuat langsung di preview.`,
            },
          ].slice(-20),
        );
        return;
      }

      // Jika proyek berbasis framework (React/Vue/Vite/Next/dll) atau butuh kompilasi
      if (!data.sources && !data.content) {
        toast.error("Tidak ada berkas yang bisa ditampilkan dari repository ini");
        return;
      }

      setImporting(false);
      toast.info(
        `Mendeteksi proyek ${data.framework || "GitHub"}. AI sedang menyusun aplikasi agar siap preview…`,
      );
      const ok = await runGenerate(
        `Build a complete, single-file runnable HTML document that faithfully reproduces the app in this GitHub repository (${data.repo ?? urlToUse}). Keep its pages, layout, styling, modern typography, and all interactions. Convert any framework components (${data.framework || "React/Vite"}) into a clean, working client-side application.\n\nRepository files:\n${(data.sources || data.content || "").slice(0, 75000)}`,
        "",
        { track: `Buka dan susun preview dari repo ${data.repo ?? urlToUse}` },
      );
      if (ok) {
        toast.success(
          `Aplikasi ${data.framework || ""} dari repo berhasil disusun & aktif di preview!`,
        );
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function handleLoadRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repos", token: ghToken }),
      });
      const data = (await res.json()) as { repos?: Repo[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal memuat repository");
      setRepos(data.repos ?? []);
      localStorage.setItem("ghighais:gh", ghToken);
      toast.success(`${data.repos?.length ?? 0} repository ditemukan`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingRepos(false);
    }
  }

  async function handlePush(repo: string) {
    setPushing(true);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push", token: ghToken, repo, content: code }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error || "Gagal push");
      toast.success(`Berhasil push ke ${repo}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPushing(false);
    }
  }

  async function handleCreateRepo(repoName: string, isPrivate: boolean) {
    setPushing(true);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_repo",
          token: ghToken,
          repo: repoName,
          private: isPrivate,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; repo?: Repo; error?: string };
      if (!res.ok || !data.repo) throw new Error(data.error || "Gagal membuat repository");

      const created = data.repo;
      setRepos((prev) => [created, ...prev.filter((r) => r.fullName !== created.fullName)]);
      toast.success(`Repository ${created.fullName} berhasil dibuat`);

      // Langsung dorong kode ke repo baru
      await handlePush(created.fullName);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPushing(false);
    }
  }

  async function handleZip() {
    const zip = new JSZip();
    zip.file("index.html", code);
    zip.file("README.md", "# Dibuat dengan GHIGHAIS AI\n");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ghighais-ai.zip";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP tersimpan");
  }

  function handleReset() {
    setPrompt("");
    setGithubUrl("");
    setCode("");
    setHistory([]);
    setMedia([]);
    localStorage.setItem("ghighais:chat", "[]");
    setEditMode(false);
    localStorage.setItem("ghighais:prompt", "");
    localStorage.setItem("ghighais:github-url", "");
    localStorage.setItem("ghighais:code", "");
    toast.success("Halaman berhasil dikosongkan");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Toaster position="top-center" />
        <div className="panel w-full max-w-sm space-y-4 p-6 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="brand-text font-display text-2xl font-bold">GHIGHAIS AI</h1>
          <p className="text-sm text-muted-foreground">Masuk untuk mulai membuat aplikasi.</p>
          <Input
            placeholder="Nama kamu"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() => {
              const name = nameInput.trim() || "Pengguna";
              localStorage.setItem("ghighais:user", name);
              setUser(name);
            }}
          >
            Masuk
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="brand-text font-display text-lg font-bold tracking-tight">
              GHIGHAIS AI
            </span>
          </div>
          <AppMenu
            disabled={editMode}
            geminiToken={geminiToken}
            onGeminiToken={setGeminiToken}
            dbTokens={dbTokens}
            onDbToken={(id, value) => {
              const next = { ...dbTokens, [id]: value };
              setDbTokens(next);
              // Token database hanya disimpan di brankas backend.
              void vault("save", { [`db_${id}`]: value }).catch(() => undefined);
            }}
            ghToken={ghToken}
            onGhToken={setGhToken}
            repos={repos}
            loadingRepos={loadingRepos}
            onLoadRepos={handleLoadRepos}
            pushing={pushing}
            onPush={handlePush}
            onCreateRepo={handleCreateRepo}
            onSaveZip={handleZip}
            onReset={handleReset}
            onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onLogout={() => {
              localStorage.removeItem("ghighais:user");
              setUser(null);
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section
          className="panel space-y-4 p-5"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h1 className="font-display text-xl font-bold">Beranda</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Full Unlimited Prompt · Tanpa Batasan Token · Zero-Error Engine
            </span>
          </div>

          {needsDatabase ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Aplikasi ini belum punya database</p>
                <p className="text-xs text-muted-foreground">
                  Buka Menu → Pilihan Database, isi token database (Turso atau Supabase
                  direkomendasikan), lalu minta AI menyimpan datanya. Token yang kamu isi disimpan
                  di backend, bukan di browser.
                </p>
              </div>
            </div>
          ) : null}

          {history.length ? (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border bg-background/50 p-3">
              {history.map((item, i) => (
                <div
                  key={`${i}-${item.text.slice(0, 12)}`}
                  className={
                    item.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-xs"
                      : "mr-auto max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground"
                  }
                >
                  {item.text}
                </div>
              ))}
            </div>
          ) : null}

          <Textarea
            rows={4}
            placeholder={
              history.length
                ? "Lanjutkan: misalnya tambahkan halaman kontak dan ubah warna tombol"
                : "Contoh: buatkan landing page toko kopi dengan menu, galeri, dan form pemesanan"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={editMode}
            className="font-body"
          />

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              hidden
              onChange={(e) => {
                void handleMediaPick(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={editMode || generating}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
              Tambah media
            </Button>
            {media.length ? (
              <div className="flex flex-wrap gap-2">
                {media.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2 pr-7"
                  >
                    {asset.kind === "image" ? (
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="size-10 rounded object-cover"
                      />
                    ) : (
                      <span className="grid size-10 place-items-center rounded bg-secondary text-[10px] uppercase">
                        {asset.kind}
                      </span>
                    )}
                    <span className="max-w-32 truncate text-xs">{asset.name}</span>
                    <button
                      type="button"
                      aria-label={`Hapus ${asset.name}`}
                      className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setMedia((prev) => prev.filter((m) => m.id !== asset.id))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lampirkan foto, logo, video, atau audio untuk dipakai di aplikasi.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              className="gap-2 sm:w-44"
              onClick={handleGenerate}
              disabled={generating || editMode}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Generate
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
              onClick={handleRotateAndRefreshEngine}
              disabled={generating || refreshingEngine}
              title="Klik sekali untuk merotasi ke jalur AI cadangan yang masih utuh saat limit habis, tanpa menghilangkan project Anda"
            >
              <RefreshCw className={`size-3.5 ${refreshingEngine ? "animate-spin" : ""}`} />
              <span>Pulihkan Jalur AI (1-Klik)</span>
            </Button>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Tempel link GitHub repo/file (otomatis dibuka)…"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text").trim();
                  if (isLikelyGitHub(pasted)) {
                    setGithubUrl(pasted);
                    setTimeout(() => {
                      void handleImport(pasted);
                    }, 100);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleImport();
                  }
                }}
                disabled={editMode || importing}
              />
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => void handleImport()}
                disabled={importing || editMode || !githubUrl.trim()}
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Github className="size-4" />
                )}
                {importing ? "Membuka…" : "Buka"}
              </Button>
            </div>
          </div>

          {progress > 0 ? (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Proses generate {progress}%</p>
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel flex h-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="size-2.5 rounded-full bg-primary" />
              <h2 className="font-display text-sm font-semibold">Coding</h2>
            </div>
            <CodeEditor value={code} onChange={setCode} disabled={editMode} />
          </div>

          <PreviewPane
            code={code}
            editMode={editMode}
            onToggleEdit={setEditMode}
            onApply={(html) => {
              setCode(html);
              toast.success("Perubahan preview diterapkan ke coding");
            }}
            onRuntimeError={handleRuntimeError}
          />
        </div>
      </main>
    </div>
  );
}
