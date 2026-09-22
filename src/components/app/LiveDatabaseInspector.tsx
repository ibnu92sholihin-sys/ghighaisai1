import { useState, useMemo } from "react";
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Table as TableIcon,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = {
  database: Record<string, unknown>;
  onUpdateKey: (key: string, value: unknown) => void;
  onDeleteKey: (key: string) => void;
  onRequestSync: () => void;
};

export function LiveDatabaseInspector({
  database,
  onUpdateKey,
  onDeleteKey,
  onRequestSync,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<string>("");
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowJson, setNewRowJson] = useState("");
  const [rawEditorMode, setRawEditorMode] = useState(false);
  const [rawJsonValue, setRawJsonValue] = useState("");

  const cleanKeys = useMemo(() => {
    return Object.keys(database).filter(
      (k) => !k.startsWith("__") && k !== "ghighais_auth_user" && k !== "isLoggedIn",
    );
  }, [database]);

  // Set selected key default jika belum terpilih
  const currentKey =
    selectedKey && cleanKeys.includes(selectedKey) ? selectedKey : cleanKeys[0] || "";
  const currentValue = currentKey ? database[currentKey] : null;

  const isArrayData = Array.isArray(currentValue);

  // Cari dan filter records
  const filteredArrayData = useMemo(() => {
    if (!isArrayData || !Array.isArray(currentValue)) return [];
    if (!searchQuery.trim()) return currentValue;
    const q = searchQuery.toLowerCase();
    return currentValue.filter((item) => {
      if (typeof item === "object" && item !== null) {
        return JSON.stringify(item).toLowerCase().includes(q);
      }
      return String(item).toLowerCase().includes(q);
    });
  }, [isArrayData, currentValue, searchQuery]);

  function handleSaveRawJson() {
    try {
      const parsed = JSON.parse(rawJsonValue);
      onUpdateKey(currentKey, parsed);
      setRawEditorMode(false);
      toast.success(`Tabel '${currentKey}' berhasil diperbarui`);
    } catch {
      toast.error("Format JSON tidak valid");
    }
  }

  function handleSaveEditedRow(originalIndex: number) {
    try {
      const parsed = JSON.parse(editingRowData);
      if (Array.isArray(currentValue)) {
        const next = [...currentValue];
        next[originalIndex] = parsed;
        onUpdateKey(currentKey, next);
        setEditingRowIndex(null);
        toast.success("Baris data berhasil diperbarui");
      }
    } catch {
      toast.error("Format data baris tidak valid");
    }
  }

  function handleDeleteRow(indexToDelete: number) {
    if (Array.isArray(currentValue)) {
      const next = currentValue.filter((_, idx) => idx !== indexToDelete);
      onUpdateKey(currentKey, next);
      toast.success("Baris data dihapus");
    }
  }

  function handleAddNewRow() {
    try {
      const parsed = newRowJson.trim() ? JSON.parse(newRowJson) : {};
      if (Array.isArray(currentValue)) {
        const next = [...currentValue, parsed];
        onUpdateKey(currentKey, next);
      } else {
        onUpdateKey(currentKey, [parsed]);
      }
      setIsAddingRow(false);
      setNewRowJson("");
      toast.success("Data baru berhasil ditambahkan");
    } catch {
      toast.error("Format JSON baris baru tidak valid");
    }
  }

  function handleAddNewTable() {
    const tableName = prompt(
      "Masukkan nama tabel / koleksi baru (contoh: products, users, notes):",
    );
    if (!tableName || !tableName.trim()) return;
    const cleanName = tableName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");
    onUpdateKey(cleanName, []);
    setSelectedKey(cleanName);
    toast.success(`Tabel '${cleanName}' siap digunakan`);
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `database_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Database JSON berhasil diunduh");
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header Inspector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <span className="font-display text-sm font-semibold">Live Database</span>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]"
          >
            Tersimpan Otomatis & Siap Push
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={onRequestSync}
            title="Sinkronkan dengan preview"
          >
            <RefreshCw className="size-3" /> Sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleExportJson}
            title="Unduh snapshot JSON"
          >
            <Download className="size-3" /> Ekspor JSON
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAddNewTable}>
            <Plus className="size-3" /> Tabel Baru
          </Button>
        </div>
      </div>

      {cleanKeys.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Database className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-display text-base font-semibold">Database Live Siap Digunakan</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Data yang Anda input melalui form aplikasi pada preview (seperti login pengguna, produk,
            daftar todo, atau data formulir) akan langsung muncul di sini secara real-time.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-4 gap-2 text-xs"
            onClick={handleAddNewTable}
          >
            <Plus className="size-3.5" /> Buat Koleksi Data Pertama
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Daftar Tabel / Keys */}
          <div className="w-48 border-r border-border bg-secondary/15 flex flex-col">
            <div className="p-2 border-b border-border">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Koleksi ({cleanKeys.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {cleanKeys.map((k) => {
                const count = Array.isArray(database[k]) ? (database[k] as unknown[]).length : 1;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedKey(k);
                      setEditingRowIndex(null);
                      setIsAddingRow(false);
                      setRawEditorMode(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center justify-between transition-colors ${
                      currentKey === k
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{k}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${currentKey === k ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Konten Data & Editor Tabel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 bg-background">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-primary">
                  &lt;{currentKey}&gt;
                </span>
                <span className="text-xs text-muted-foreground">
                  {isArrayData
                    ? `${(currentValue as unknown[]).length} baris data`
                    : "Data Objek Tunggal"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isArrayData ? (
                  <div className="relative w-44">
                    <Search className="absolute left-2 top-2 size-3 text-muted-foreground" />
                    <Input
                      placeholder="Cari data..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 pl-7 text-xs"
                    />
                  </div>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setRawJsonValue(JSON.stringify(currentValue, null, 2));
                    setRawEditorMode(!rawEditorMode);
                  }}
                >
                  <Code2 className="size-3" /> {rawEditorMode ? "Mode Visual" : "Edit JSON"}
                </Button>

                {isArrayData && !rawEditorMode ? (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setIsAddingRow(true);
                      // Template baris baru dari baris pertama jika ada
                      const sample =
                        Array.isArray(currentValue) &&
                        currentValue[0] &&
                        typeof currentValue[0] === "object"
                          ? JSON.stringify(currentValue[0], null, 2)
                          : JSON.stringify({ id: Date.now(), nama: "Data Baru" }, null, 2);
                      setNewRowJson(sample);
                    }}
                  >
                    <Plus className="size-3" /> Tambah Baris
                  </Button>
                ) : null}

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Hapus seluruh tabel '${currentKey}'?`)) {
                      onDeleteKey(currentKey);
                      setSelectedKey("");
                    }
                  }}
                  title="Hapus tabel ini"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* View Mode */}
            <div className="flex-1 overflow-auto p-4">
              {rawEditorMode ? (
                <div className="space-y-3 h-full flex flex-col">
                  <Textarea
                    value={rawJsonValue}
                    onChange={(e) => setRawJsonValue(e.target.value)}
                    rows={12}
                    className="font-mono text-xs flex-1 bg-secondary/30"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setRawEditorMode(false)}>
                      Batal
                    </Button>
                    <Button size="sm" onClick={handleSaveRawJson}>
                      Simpan & Terapkan ke Live App
                    </Button>
                  </div>
                </div>
              ) : isAddingRow ? (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      Tambah Baris Baru ke &apos;{currentKey}&apos;
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5"
                      onClick={() => setIsAddingRow(false)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={newRowJson}
                    onChange={(e) => setNewRowJson(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder='{"id": 1, "name": "Contoh"}'
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setIsAddingRow(false)}>
                      Batal
                    </Button>
                    <Button size="sm" onClick={handleAddNewRow}>
                      Tambahkan ke Database
                    </Button>
                  </div>
                </div>
              ) : null}

              {!rawEditorMode && isArrayData ? (
                filteredArrayData.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada baris data yang cocok.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredArrayData.map((row, idx) => {
                      const isEditing = editingRowIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingRowData}
                                onChange={(e) => setEditingRowData(e.target.value)}
                                rows={4}
                                className="font-mono text-xs"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingRowIndex(null)}
                                >
                                  Batal
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleSaveEditedRow(idx)}
                                >
                                  Simpan
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap flex-1 text-foreground/90">
                                {typeof row === "object"
                                  ? JSON.stringify(row, null, 2)
                                  : String(row)}
                              </pre>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingRowIndex(idx);
                                    setEditingRowData(JSON.stringify(row, null, 2));
                                  }}
                                  title="Edit baris"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteRow(idx)}
                                  title="Hapus baris"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : !rawEditorMode ? (
                <div className="rounded-lg border border-border bg-card p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap text-foreground/90">
                    {typeof currentValue === "object"
                      ? JSON.stringify(currentValue, null, 2)
                      : String(currentValue)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
