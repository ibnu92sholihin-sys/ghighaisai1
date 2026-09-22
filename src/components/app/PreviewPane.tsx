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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EDITOR_MARKER, EDITOR_SCRIPT } from "@/lib/preview-editor";

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
};

const ERROR_REPORTER = `
window.addEventListener("error", function (e) {
  parent.postMessage({ source: "ghighais-preview", type: "error", message: (e.message || "Error") + " @" + (e.lineno || 0) }, "*");
});
window.addEventListener("unhandledrejection", function (e) {
  parent.postMessage({ source: "ghighais-preview", type: "error", message: "Promise: " + ((e.reason && e.reason.message) || e.reason) }, "*");
});
`;

function rgbToHex(value: string, fallback: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return fallback;
  return (
    "#" +
    [match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")
  );
}

export function PreviewPane({ code, editMode, onToggleEdit, onApply, onRuntimeError }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const lastCompleteRef = useRef("");
  const activeEditingCodeRef = useRef("");

  // Only render documents that are fully written; a half-streamed document
  // would run broken scripts and report false errors.
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

  // When editMode is active, preserve the iframe document so external re-renders
  // do not wipe out in-memory visual edits.
  const srcDoc = useMemo(() => {
    const baseHtml =
      editMode && activeEditingCodeRef.current ? activeEditingCodeRef.current : stableCode;
    if (!baseHtml.trim()) return "";
    const scripts =
      `\n<script ${EDITOR_MARKER}>${ERROR_REPORTER}</script>` +
      (editMode ? `\n<script ${EDITOR_MARKER}>${EDITOR_SCRIPT}</script>` : "");
    return `${baseHtml}${scripts}`;
  }, [stableCode, editMode]);

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

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-accent" />
          <h2 className="font-display text-sm font-semibold">Preview</h2>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-3" /> Zero-Error Shield
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Urungkan perubahan terakhir"
                title="Undo"
                disabled={!canUndo}
                onClick={() => send("undo")}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button size="sm" className="gap-2" onClick={() => send("apply")}>
                <Check className="size-4" /> Terapkan
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant={editMode ? "destructive" : "secondary"}
            className="gap-2"
            onClick={() => {
              if (editMode) {
                send("apply");
              }
              onToggleEdit(!editMode);
            }}
          >
            <Pencil className="size-4" /> {editMode ? "Keluar & Simpan" : "Mode Edit"}
          </Button>
        </div>
      </div>

      {editMode ? (
        <div className="space-y-3 border-b border-border bg-secondary/40 px-4 py-3">
          {selection ? (
            <>
              <p className="text-xs text-muted-foreground">
                Terpilih: <span className="font-mono text-primary">&lt;{selection.tag}&gt;</span>
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
                        if (e.key === "Enter") send("image", { value: e.currentTarget.value });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
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
                  <Label htmlFor="preview-image-file" className="text-xs">
                    Atau unggah dari perangkat
                  </Label>
                  <Input
                    id="preview-image-file"
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => send("image", { value: String(reader.result) });
                      reader.readAsDataURL(file);
                    }}
                  />
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
                    className="h-9 p-1"
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
                    className="h-9 p-1"
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="preview-width" className="text-xs">
                    Lebar (px)
                  </Label>
                  <Input
                    id="preview-width"
                    type="number"
                    defaultValue={selection.width}
                    onChange={(e) => send("width", { value: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preview-height" className="text-xs">
                    Tinggi (px)
                  </Label>
                  <Input
                    id="preview-height"
                    type="number"
                    defaultValue={selection.height}
                    onChange={(e) => send("height", { value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  aria-label="Geser ke atas"
                  title="Geser ke atas"
                  size="icon"
                  variant="secondary"
                  onClick={() => send("move", { dy: -8 })}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  aria-label="Geser ke bawah"
                  title="Geser ke bawah"
                  size="icon"
                  variant="secondary"
                  onClick={() => send("move", { dy: 8 })}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  aria-label="Geser ke kiri"
                  title="Geser ke kiri"
                  size="icon"
                  variant="secondary"
                  onClick={() => send("move", { dx: -8 })}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  aria-label="Geser ke kanan"
                  title="Geser ke kanan"
                  size="icon"
                  variant="secondary"
                  onClick={() => send("move", { dx: 8 })}
                >
                  <ArrowRight className="size-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => send("editable")}>
                  Edit langsung
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => send("delete")}
                >
                  <Trash2 className="size-4" /> Hapus
                </Button>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <MousePointerSquareDashed className="size-4" />
              Klik elemen pada preview untuk mengeditnya. Geser dengan drag.
            </p>
          )}
        </div>
      ) : null}

      <iframe
        ref={frameRef}
        title="Preview aplikasi"
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms allow-modals"
        className="min-h-[420px] w-full flex-1 bg-white"
      />
    </div>
  );
}
