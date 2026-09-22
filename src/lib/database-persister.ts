/**
 * Menyematkan snapshot data live database ke dalam kode HTML sebelum di-push atau di-ekspor ke ZIP,
 * sehingga data yang telah dimasukkan oleh user ke dalam database tetap utuh 100% dan tidak pernah hilang.
 */
export function injectDatabaseSeed(htmlCode: string, database: Record<string, unknown>): string {
  if (!database || Object.keys(database).length === 0) {
    return htmlCode;
  }

  // Filter keys sistem jika ada
  const cleanDb: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(database)) {
    if (k.startsWith("__") && k.endsWith("__")) continue;
    cleanDb[k] = v;
  }

  if (Object.keys(cleanDb).length === 0) return htmlCode;

  const serializedData = JSON.stringify(cleanDb, null, 2);
  const seedScript = `
<script id="ghighais-database-seed">
// Database Snapshot yang di-input pengguna (Tersimpan otomatis oleh GHIGHAIS AI)
(function() {
  try {
    var seed = ${serializedData};
    for (var key in seed) {
      if (Object.prototype.hasOwnProperty.call(seed, key)) {
        var existing = localStorage.getItem(key);
        if (!existing || existing === "[]" || existing === "{}") {
          var val = typeof seed[key] === "string" ? seed[key] : JSON.stringify(seed[key]);
          localStorage.setItem(key, val);
        }
      }
    }
  } catch(e) {
    console.warn("Auto-hydrate database seed:", e);
  }
})();
</script>
`;

  // Gantikan script seed lama jika sudah ada
  const existingRegex = /<script id="ghighais-database-seed">[\s\S]*?<\/script>/i;
  if (existingRegex.test(htmlCode)) {
    return htmlCode.replace(existingRegex, seedScript.trim());
  }

  // Sisipkan sebelum </body> atau </head> atau di akhir berkas
  if (htmlCode.includes("</body>")) {
    return htmlCode.replace("</body>", `${seedScript}\n</body>`);
  }
  if (htmlCode.includes("</head>")) {
    return htmlCode.replace("</head>", `${seedScript}\n</head>`);
  }
  return `${htmlCode}\n${seedScript}`;
}
