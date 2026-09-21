// Deteksi database & data rahasia di dalam kode aplikasi yang dihasilkan.

export type SecretHit = { key: string; value: string };

const DB_SIGNALS = [
  /supabase/i,
  /createClient\s*\(/,
  /turso|libsql/i,
  /firebase|firestore/i,
  /mongodb(\+srv)?:\/\//i,
  /postgres(ql)?:\/\//i,
  /mysql:\/\//i,
  /neon\.tech|planetscale|upstash|xata|cockroach/i,
  /indexedDB|openDatabase/i,
  /\/api\/(db|data|records)/i,
  /localStorage\.setItem\([^)]*(data|items|records|users)/i,
];

/** Apakah aplikasi hasil generate sudah memakai penyimpanan data? */
export function hasDatabase(code: string) {
  if (!code.trim()) return true; // halaman kosong: tidak perlu notifikasi
  return DB_SIGNALS.some((re) => re.test(code));
}

// Pola data penting yang tidak boleh berada di kode depan (frontend).
const SECRET_PATTERNS: Array<{ label: string; re: RegExp }> = [
  {
    label: "supabase_key",
    re: /\b(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
  },
  { label: "supabase_new_key", re: /\b(sb_(?:secret|publishable)_[A-Za-z0-9_-]{10,})\b/g },
  {
    label: "api_key",
    re: /\b(sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9]{20,})\b/g,
  },
  {
    label: "connection_string",
    re: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|libsql):\/\/[^\s"'`<>]+)/g,
  },
  {
    label: "password",
    re: /(?:password|passwd|secret|apiKey|api_key|token)\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/gi,
  },
];

const SAFE_VALUES = /^(?:your|change|example|placeholder|xxx|<|__SECRET_)/i;

/**
 * Ganti seluruh data penting di kode dengan placeholder aman
 * dan kembalikan daftar nilainya untuk disimpan di backend.
 */
export function extractSecrets(code: string): { code: string; secrets: SecretHit[] } {
  if (!code) return { code, secrets: [] };
  let out = code;
  const secrets: SecretHit[] = [];

  for (const { label, re } of SECRET_PATTERNS) {
    out = out.replace(re, (match, captured: string) => {
      const value = captured ?? match;
      if (!value || SAFE_VALUES.test(value)) return match;
      let key = secrets.find((s) => s.value === value)?.key;
      if (!key) {
        key = `${label}_${secrets.length + 1}`;
        secrets.push({ key, value });
      }
      const placeholder = `__SECRET_${key}__`;
      return match.replace(value, placeholder);
    });
  }

  return { code: out, secrets };
}
