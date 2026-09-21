export type DatabaseOption = {
  id: string;
  name: string;
  hint: string;
  recommended?: boolean;
};

export const DATABASES: DatabaseOption[] = [
  { id: "turso", name: "Turso", hint: "Token Turso (libSQL auth token)", recommended: true },
  { id: "supabase", name: "Supabase", hint: "Service / anon key project", recommended: true },
  { id: "neon", name: "Neon", hint: "Connection string / API key" },
  { id: "planetscale", name: "PlanetScale", hint: "Database password / token" },
  { id: "firebase", name: "Firebase", hint: "Web API key" },
  { id: "mongodb", name: "MongoDB Atlas", hint: "Connection URI" },
  { id: "postgres", name: "PostgreSQL", hint: "postgres://user:pass@host/db" },
  { id: "mysql", name: "MySQL", hint: "mysql://user:pass@host/db" },
  { id: "redis", name: "Redis / Upstash", hint: "REST token" },
  { id: "xata", name: "Xata", hint: "API key" },
  { id: "cockroach", name: "CockroachDB", hint: "Connection string" },
];

export const STARTER_CODE = `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GHIGHAIS AI — Studio Desain Aplikasi Modern</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #090d16;
      color: #f1f5f9;
      margin: 0;
      min-height: 100vh;
    }
    .lux-gradient {
      background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.18) 0%, rgba(15, 23, 42, 0) 70%);
    }
    .lux-glass {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .lux-card {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .lux-card:hover {
      transform: translateY(-3px);
      border-color: rgba(99, 102, 241, 0.35);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
  </style>
</head>
<body class="lux-gradient flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
  <!-- Top Navigation Bar -->
  <header class="w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <i data-lucide="sparkles" class="size-4 text-amber-300"></i>
          </div>
        </div>
        <div>
          <span class="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            GHIGHAIS AI <span class="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">Studio Pro</span>
          </span>
          <p class="text-[11px] text-slate-400 font-medium">Arsitektur Desain Mewah & Modern</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Mesin Siap Eksekusi
        </span>
      </div>
    </div>
  </header>

  <!-- Hero Content -->
  <main class="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium lux-glass text-slate-300 mb-6 border border-white/10">
      <i data-lucide="crown" class="size-3.5 text-amber-400"></i>
      Standar Desain Profesional & Zero-Error Aktif
    </div>

    <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
      Wujudkan Aplikasi Impian dengan <span class="bg-gradient-to-r from-amber-200 via-indigo-300 to-sky-300 bg-clip-text text-transparent">Sentuhan Mewah</span>
    </h1>

    <p class="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl font-normal leading-relaxed">
      Ketik instruksi atau kebutuhan sistem Anda pada panel prompt di sebelah kiri. AI akan otomatis merancang UI/UX yang elegan, layout bento modern, interaksi dinamis, dan kode bersih tanpa error.
    </p>

    <!-- 3 Core Feature Highlights -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-10 text-left">
      <div class="lux-glass lux-card rounded-2xl p-5 border border-white/5">
        <div class="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <i data-lucide="palette" class="size-5"></i>
        </div>
        <h2 class="text-white font-semibold text-sm">Estetika Mewah & Elegan</h2>
        <p class="text-slate-400 text-xs mt-1.5 leading-relaxed">
          Tipografi presisi, palet warna elegan, pencahayaan mesh halus, serta micro-interactions responsif di setiap komponen.
        </p>
      </div>

      <div class="lux-glass lux-card rounded-2xl p-5 border border-white/5">
        <div class="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
          <i data-lucide="shield-check" class="size-5"></i>
        </div>
        <h2 class="text-white font-semibold text-sm">Proteksi Zero-Error</h2>
        <p class="text-slate-400 text-xs mt-1.5 leading-relaxed">
          Semua interaksi JavaScript dirancang dengan pengaman DOM defensif dan try-catch, mencegah bug saat dijalankan.
        </p>
      </div>

      <div class="lux-glass lux-card rounded-2xl p-5 border border-white/5">
        <div class="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
          <i data-lucide="layers" class="size-5"></i>
        </div>
        <h2 class="text-white font-semibold text-sm">Full Fungsional & Lengkap</h2>
        <p class="text-slate-400 text-xs mt-1.5 leading-relaxed">
          Bebas batasan token dengan auto-continuation; mendukung navigasi tab, penyimpanan lokal, dan dashboard interaktif.
        </p>
      </div>
    </div>
  </main>

  <!-- Footer Info -->
  <footer class="w-full border-t border-white/5 py-4 text-center text-xs text-slate-500">
    Siap untuk prompt baru — Ketik di panel kiri dan klik <span class="text-slate-300 font-medium">Buat Aplikasi</span>.
  </footer>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  </script>
</body>
</html>`;

export function stripFences(text: string) {
  let out = text.trim();
  out = out.replace(/^```[a-zA-Z]*\s*/, "");
  out = out.replace(/```\s*$/, "");
  return out.trim();
}
