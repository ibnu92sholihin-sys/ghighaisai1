import { DATABASES } from "@/lib/ghighais";

const MIGRATION_HINTS = [
  "pindahkan database",
  "pindah database",
  "migrasi database",
  "migrasikan database",
  "migrate database",
  "database lama ke database baru",
  "ganti database",
  "pindahkan data",
  "migrate db",
];

export function isMigrationPrompt(prompt: string) {
  const text = prompt.toLowerCase();
  return MIGRATION_HINTS.some((hint) => text.includes(hint));
}

/** Nama database yang disebut di dalam prompt, urut kemunculan. */
export function detectDatabases(prompt: string) {
  const text = prompt.toLowerCase();
  return DATABASES.filter((db) => text.includes(db.id) || text.includes(db.name.toLowerCase()))
    .map((db) => db.name)
    .slice(0, 4);
}

export function migrationInstruction(options: {
  prompt: string;
  repo: string;
  sources: string;
  tokens: Record<string, string>;
}) {
  const mentioned = detectDatabases(options.prompt);
  const configured = Object.entries(options.tokens)
    .filter(([, value]) => value.trim().length > 0)
    .map(([id]) => DATABASES.find((d) => d.id === id)?.name ?? id);

  return `TASK: FULL DATABASE MIGRATION for the GitHub repository ${options.repo}.

User instruction: ${options.prompt}
${mentioned.length ? `Databases named by the user: ${mentioned.join(" -> ")}` : ""}
${configured.length ? `Databases the user already configured a token for: ${configured.join(", ")}` : ""}

NON-NEGOTIABLE COMPLETENESS RULES:
1. Inventory EVERY database object found in the repository source below: every table, view,
   column (name, type, nullability, default), primary key, foreign key, unique constraint,
   check constraint, index, sequence, enum, trigger, function, RLS policy, grant, storage
   bucket, auth table reference and seed/fixture row.
2. Nothing may be dropped, renamed, merged or "simplified". If a type has no exact match in the
   target database, map it to the closest lossless type and document the mapping.
3. Produce, for the TARGET database: complete DDL (create everything, in dependency order),
   a complete data-copy script (batched, resumable, ordered so foreign keys never fail),
   and a verification step that compares row counts and checksums per table.
4. Produce a migration checklist table listing every object with status "dipindahkan".
   The count of objects in the inventory MUST equal the count in the checklist.
5. Also rewrite the application's database connection/query code for the new database, and list
   every environment variable the new database needs. Never print real token values.
6. If some detail is not visible in the source, state it explicitly in a "Perlu dicek manual"
   section instead of silently skipping it.

OUTPUT FORMAT: one complete, self-contained HTML document (a "Pusat Migrasi Database" page) that
renders: ringkasan, tabel inventaris objek, tabel checklist, tab/section berisi DDL target,
script copy data, script verifikasi, dan kode koneksi baru. Put every script inside
<pre><code> blocks with escaped HTML. The page must run with zero JS errors, be responsive, and
use the same dark modern styling. Write the explanatory text in Indonesian.

REPOSITORY SOURCE:
${options.sources}`;
}
