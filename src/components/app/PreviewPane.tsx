import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  MousePointerSquareDashed,
  Pencil,
  Undo2,
  Trash2,
  ShieldCheck,
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  Database,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EDITOR_MARKER, EDITOR_SCRIPT } from "@/lib/preview-editor";
import { LiveDatabaseInspector } from "@/components/app/LiveDatabaseInspector";

type Selection = {
  tag: string;
  text: string;
  color: string;
  background: string;
  fontSize: number;
  width: number;
  height: number;
  isImage?: boolean;
  imageSrc?: string;
};

type Props = {
  code: string;
  editMode: boolean;
  onToggleEdit: (value: boolean) => void;
  onApply: (html: string) => void;
  onRuntimeError?: (message: string) => void;
  database?: Record<string, unknown>;
  onDatabaseChange?: (db: Record<string, unknown>) => void;
};

function rgbToHex(value: string, fallback: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return fallback;
  const hex = [match[1], match[2], match[3]]
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export function PreviewPane({
  code,
  editMode,
  onToggleEdit,
  onApply,
  onRuntimeError,
  database = {},
  onDatabaseChange,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const lastCompleteRef = useRef("");
  const activeEditingCodeRef = useRef("");

  // Mode Tampilan: Preview atau Live Database
  const [activeTab, setActiveTab] = useState<"preview" | "database">("preview");

  // Mode Perangkat Responsive (Desktop, Tablet, Mobile)
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // State internal database jika tidak di-pass dari parent
  const [internalDb, setInternalDb] = useState<Record<string, unknown>>(database);

  // Status autentikasi login terdeteksi
  const [activeUserSession, setActiveUserSession] = useState<string | null>(null);

  // Key untuk reload iframe
  const [iframeKey, setIframeKey] = useState(0);

  const activeDatabase = useMemo(() => {
    return Object.keys(database).length > 0 ? database : internalDb;
  }, [database, internalDb]);

  const recordCount = useMemo(() => {
    let count = 0;
    for (const [k, v] of Object.entries(activeDatabase)) {
      if (k.startsWith("__")) continue;
      if (Array.isArray(v)) count += v.length;
      else if (v !== null && typeof v === "object") count += Object.keys(v).length;
      else count += 1;
    }
    return count;
  }, [activeDatabase]);

  // Jamin hanya merender dokumen lengkap
  const stableCode = useMemo(() => {
    if (!code.trim()) {
      lastCompleteRef.current = "";
      return "";
    }
    const lower = code.toLowerCase();
    const isComplete =
      lower.includes("</html>") ||
      lower.includes("</body>") ||
      (lower.includes("<html") && lower.includes("</div>"));
    if (isComplete) lastCompleteRef.current = code;
    return isComplete ? code : lastCompleteRef.current || code;
  }, [code]);

  useEffect(() => {
    if (editMode && stableCode) {
      activeEditingCodeRef.current = stableCode;
    }
  }, [editMode, stableCode]);

  // Render HTML bersih langsung tanpa injeksi runtime yang bocor
  const srcDoc = useMemo(() => {
    const baseHtml =
      editMode && activeEditingCodeRef.current ? activeEditingCodeRef.current : stableCode;
    if (!baseHtml.trim()) return "";

    // Saat tidak dalam mode visual, berikan kode HTML asli 100% murni dan real
    if (!editMode) return baseHtml;

    // Saat mode visual edit aktif, sisipkan editor script secara aman
    const script = `\n<script ${EDITOR_MARKER}>${EDITOR_SCRIPT}</script>`;
    if (baseHtml.includes("</body>")) {
      return baseHtml.replace("</body>", `${script}\n</body>`);
    }
    return `${baseHtml}${script}`;
  }, [stableCode, editMode]);

  // Sinkronisasi data saat iframe selesai dimuat melalui DOM API aman (bukan string script)
  function handleFrameLoad() {
    try {
      const doc = frameRef.current?.contentDocument;
      const win = frameRef.current?.contentWindow;
      if (!doc || !win) return;

      // 1. Tangkap error runtime secara aman
      win.addEventListener("error", (e) => {
        onRuntimeError?.(`${e.message || "Error"} @${e.lineno || 0}`);
      });
      win.addEventListener("unhandledrejection", (e) => {
        onRuntimeError?.(`Promise rejection: ${e.reason?.message || e.reason}`);
      });

      // 2. Baca snapshot database dari localStorage iframe
      const syncDatabase = () => {
        try {
          const snapshot: Record<string, unknown> = {};
          for (let i = 0; i < win.localStorage.length; i++) {
            const k = win.localStorage.key(i);
            if (!k) continue;
            try {
              snapshot[k] = JSON.parse(win.localStorage.getItem(k) || "");
            } catch {
              snapshot[k] = win.localStorage.getItem(k);
            }
          }
          if (Object.keys(snapshot).length > 0) {
            setInternalDb(snapshot);
            onDatabaseChange?.(snapshot);
          }
        } catch {
          // ignore
        }
      };

      syncDatabase();

      // Intersep localStorage agar data live langsung tersinkron
      try {
        const origSet = win.localStorage.setItem.bind(win.localStorage);
        const origRemove = win.localStorage.removeItem.bind(win.localStorage);
        win.localStorage.setItem = (k: string, v: string) => {
          origSet(k, v);
          setTimeout(syncDatabase, 50);
        };
        win.localStorage.removeItem = (k: string) => {
          origRemove(k);
          setTimeout(syncDatabase, 50);
        };
      } catch {
        // ignore
      }

      // 3. Deteksi form login: jaga sesi login agar tetap aktif dan tidak mental
      doc.addEventListener(
        "submit",
        (e) => {
          const form = e.target as HTMLFormElement;
          if (!form || form.tagName !== "FORM") return;
          const passInput = form.querySelector('input[type="password"]');
          const userInput = form.querySelector(
            'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"]',
          ) as HTMLInputElement | null;

          if (passInput || userInput) {
            const username = (userInput && userInput.value.trim()) || "Pengguna";
            const session = {
              username,
              email: username.includes("@") ? username : `${username}@example.com`,
              role: "admin",
              loggedIn: true,
              token: `auth_${Date.now()}`,
            };
            try {
              win.localStorage.setItem("ghighais_auth_user", JSON.stringify(session));
              win.localStorage.setItem("isLoggedIn", "true");
              win.localStorage.setItem("user", JSON.stringify(session));
            } catch {
              // ignore
            }
            setActiveUserSession(username);
            toast.success(`Login berhasil sebagai '${username}' · Sesi aktif di preview`, {
              icon: "🔐",
            });
            syncDatabase();
          }
        },
        true,
      );
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as {
        source?: string;
        type?: string;
        info?: Selection;
        html?: string;
        message?: string;
        canUndo?: boolean;
      };
      if (data?.source !== "ghighais-preview") return;

      if (data.type === "selection") setSelection(data.info ?? null);
      if (data.type === "history") setCanUndo(Boolean(data.canUndo));
      if (data.type === "error" && data.message) onRuntimeError?.(data.message);
      if (data.type === "applied" && data.html) {
        onApply(data.html);
        setSelection(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onApply, onRuntimeError]);

  useEffect(() => {
    if (!editMode) {
      setSelection(null);
      setCanUndo(false);
    }
  }, [editMode]);

  function send(type: string, payload: Record<string, unknown> = {}) {
    frameRef.current?.contentWindow?.postMessage(
      { source: "ghighais-parent", type, ...payload },
      "*",
    );
  }

  function handleUpdateDatabaseKey(key: string, value: unknown) {
    try {
      const win = frameRef.current?.contentWindow;
      if (win) {
        const valStr = typeof value === "string" ? value : JSON.stringify(value);
        win.localStorage.setItem(key, valStr);
        win.dispatchEvent(new Event("storage"));
      }
    } catch {
      // ignore
    }
    const next = { ...activeDatabase, [key]: value };
    setInternalDb(next);
    onDatabaseChange?.(next);
  }

  function handleDeleteDatabaseKey(key: string) {
    try {
      const win = frameRef.current?.contentWindow;
      if (win) {
        win.localStorage.removeItem(key);
        win.dispatchEvent(new Event("storage"));
      }
    } catch {
      // ignore
    }
    const next = { ...activeDatabase };
    delete next[key];
    setInternalDb(next);
    onDatabaseChange?.(next);
  }

  function handleRequestSync() {
    handleFrameLoad();
    toast.info("Menyinkronkan database dari preview…");
  }

  function handleReloadIframe() {
    setIframeKey((prev) => prev + 1);
    toast.info("Preview dimuat ulang");
  }

  function handleOpenInNewTab() {
    if (!srcDoc) return;
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return (
    <div className="panel flex h-full flex-col overflow-hidden bg-card">
      {/* Header Utama Preview Bar (Seperti Google AI Studio) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 bg-card">
        <div className="flex items-center gap-2">
          {/* Tab Switcher: Preview Live vs Live Database */}
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="size-3.5 text-primary" />
              Preview Live
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("database")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "database"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="size-3.5" />
              Live Database
              {recordCount > 0 ? (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === "database"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/15 text-primary font-semibold"
                  }`}
                >
                  {recordCount}
                </span>
              ) : null}
            </button>
          </div>

          {activeUserSession ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <Lock className="size-3" /> Login Aktif: {activeUserSession}
            </span>
          ) : (
            <span className="hidden xl:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="size-3" /> Live & Real
            </span>
          )}
        </div>

        {/* Toolbar Kanan: Responsive, Reload, Tab Baru, Edit Mode */}
        <div className="flex items-center gap-1.5">
          {activeTab === "preview" ? (
            <>
              {/* Responsive Device Switcher */}
              <div className="hidden sm:flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
                <button
                  type="button"
                  title="Desktop (100%)"
                  onClick={() => setDeviceMode("desktop")}
                  className={`rounded p-1 text-muted-foreground transition-colors ${
                    deviceMode === "desktop"
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground"
                  }`}
                >
                  <Monitor className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Tablet (768px)"
                  onClick={() => setDeviceMode("tablet")}
                  className={`rounded p-1 text-muted-foreground transition-colors ${
                    deviceMode === "tablet"
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground"
                  }`}
                >
                  <Tablet className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Mobile (375px)"
                  onClick={() => setDeviceMode("mobile")}
                  className={`rounded p-1 text-muted-foreground transition-colors ${
                    deviceMode === "mobile"
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-3.5" />
                </button>
              </div>

              {/* Refresh Iframe */}
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleReloadIframe}
                title="Muat ulang preview"
              >
                <RotateCw className="size-4" />
              </Button>

              {/* Open in New Window */}
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleOpenInNewTab}
                title="Buka preview di tab baru"
              >
                <ExternalLink className="size-4" />
              </Button>
            </>
          ) : null}

          {editMode ? (
            <>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Urungkan perubahan terakhir"
                title="Undo"
                disabled={!canUndo}
                onClick={() => send("undo")}
                className="size-8"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => send("apply")}>
                <Check className="size-3.5" /> Terapkan
              </Button>
            </>
          ) : null}

          <Button
            size="sm"
            variant={editMode ? "destructive" : "secondary"}
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              if (editMode) {
                send("apply");
              }
              onToggleEdit(!editMode);
            }}
          >
            <Pencil className="size-3.5" /> {editMode ? "Simpan Edit" : "Mode Visual"}
          </Button>
        </div>
      </div>

      {/* Konten Tab: Live Database Inspector ATAU Visual Preview Real */}
      {activeTab === "database" ? (
        <div className="flex-1 overflow-hidden">
          <LiveDatabaseInspector
            database={activeDatabase}
            onUpdateKey={handleUpdateDatabaseKey}
            onDeleteKey={handleDeleteDatabaseKey}
            onRequestSync={handleRequestSync}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Subpanel Edit Visual jika editMode aktif */}
          {editMode ? (
            <div className="space-y-3 border-b border-border bg-secondary/40 px-4 py-3">
              {selection ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Terpilih:{" "}
                    <span className="font-mono text-primary">&lt;{selection.tag}&gt;</span>
                  </p>
                  {selection.text ? (
                    <div className="space-y-1">
                      <Label htmlFor="preview-text" className="text-xs">
                        Teks
                      </Label>
                      <Input
                        id="preview-text"
                        defaultValue={selection.text}
                        onChange={(e) => send("text", { value: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  ) : null}
                  {selection.isImage ? (
                    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                      <Label htmlFor="preview-image-url" className="text-xs">
                        Ganti gambar / logo (URL)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="preview-image-url"
                          placeholder="https://…"
                          defaultValue={selection.imageSrc ?? ""}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              send("image", { value: e.currentTarget.value });
                            }
                          }}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => {
                            const input = document.getElementById(
                              "preview-image-url",
                            ) as HTMLInputElement | null;
                            if (input?.value) send("image", { value: input.value });
                          }}
                        >
                          Pasang
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="preview-text-color" className="text-xs">
                        Warna teks
                      </Label>
                      <Input
                        id="preview-text-color"
                        type="color"
                        className="h-8 p-1"
                        defaultValue={rgbToHex(selection.color, "#ffffff")}
                        onChange={(e) => send("color", { value: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="preview-background-color" className="text-xs">
                        Warna latar
                      </Label>
                      <Input
                        id="preview-background-color"
                        type="color"
                        className="h-8 p-1"
                        defaultValue={rgbToHex(selection.background, "#000000")}
                        onChange={(e) => send("background", { value: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ukuran font: {selection.fontSize}px</Label>
                    <Slider
                      defaultValue={[selection.fontSize]}
                      min={8}
                      max={96}
                      step={1}
                      onValueChange={([v]) => send("fontSize", { value: v })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      aria-label="Geser ke atas"
                      title="Geser ke atas"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => send("move", { dy: -8 })}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      aria-label="Geser ke bawah"
                      title="Geser ke bawah"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => send("move", { dy: 8 })}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      aria-label="Geser ke kiri"
                      title="Geser ke kiri"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => send("move", { dx: -8 })}
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    <Button
                      aria-label="Geser ke kanan"
                      title="Geser ke kanan"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => send("move", { dx: 8 })}
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => send("editable")}
                    >
                      Edit langsung
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1"
                      onClick={() => send("delete")}
                    >
                      <Trash2 className="size-3" /> Hapus
                    </Button>
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MousePointerSquareDashed className="size-4" />
                  Klik elemen pada preview untuk mengeditnya secara visual.
                </p>
              )}
            </div>
          ) : null}

          {/* Canvas Live Preview Real */}
          <div className="flex flex-1 items-stretch justify-center overflow-auto bg-card">
            {!srcDoc ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="rounded-full bg-primary/10 p-4 mb-3 border border-primary/20">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Pratinjau Live Siaga
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Tulis prompt di atas lalu klik <strong>Generate</strong>, atau tempel URL
                  repository GitHub untuk melihat aplikasi aktif langsung di sini.
                </p>
              </div>
            ) : (
              <div
                className={`h-full transition-all duration-300 overflow-hidden flex flex-col ${
                  deviceMode === "desktop"
                    ? "w-full"
                    : deviceMode === "tablet"
                      ? "w-[768px] max-w-full my-3 rounded-lg border border-border shadow-lg"
                      : "w-[375px] max-w-full my-3 rounded-lg border border-border shadow-lg"
                }`}
              >
                <iframe
                  key={iframeKey}
                  ref={frameRef}
                  title="Live App Preview"
                  srcDoc={srcDoc}
                  onLoad={handleFrameLoad}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups allow-downloads"
                  className="h-full min-h-[520px] w-full flex-1 bg-white border-0"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
