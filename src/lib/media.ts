export type MediaAsset = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio" | "file";
  dataUrl: string;
};

export function mediaKind(type: string): MediaAsset["kind"] {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

/** Downscale images so the generated document stays light. */
async function shrinkImage(file: File, max = 1280): Promise<string> {
  const original = await readAsDataUrl(file);
  if (file.type === "image/svg+xml" || file.type === "image/gif") return original;
  try {
    const img = new Image();
    img.src = original;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1 && original.length < 700_000) return original;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const hasAlpha = file.type === "image/png" || file.type === "image/webp";
    return canvas.toDataURL(hasAlpha ? "image/webp" : "image/jpeg", 0.85);
  } catch {
    return original;
  }
}

export async function fileToAsset(file: File): Promise<MediaAsset> {
  const kind = mediaKind(file.type);
  const dataUrl = kind === "image" ? await shrinkImage(file) : await readAsDataUrl(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    kind,
    dataUrl,
  };
}

export function mediaPlaceholder(index: number) {
  return `__MEDIA_${index + 1}__`;
}

/** Instruction block telling the model which media URLs to embed. */
export function mediaInstruction(assets: MediaAsset[]) {
  if (!assets.length) return "";
  const list = assets
    .map((a, i) => `- ${mediaPlaceholder(i)} → ${a.kind} bernama "${a.name}"`)
    .join("\n");
  return `\n\nThe user attached media that MUST be used inside the document. Reference each one by writing its placeholder token EXACTLY as the src/href value (do not invent other URLs, do not use placeholder image services):\n${list}\nUse <img src="__MEDIA_n__">, <video src="__MEDIA_n__" controls>, or <audio src="__MEDIA_n__" controls> as appropriate, with good styling.`;
}

/** Swap placeholders back to the real data URLs. */
export function applyMedia(code: string, assets: MediaAsset[]) {
  if (!assets.length) return code;
  let out = code;
  assets.forEach((asset, i) => {
    out = out.split(mediaPlaceholder(i)).join(asset.dataUrl);
  });
  return out;
}
