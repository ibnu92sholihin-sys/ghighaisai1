import { useState } from "react";
import {
  Menu,
  Database,
  Github,
  FileArchive,
  Home,
  LogOut,
  Star,
  Loader2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  Crown,
  Plus,
  FolderGit2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DATABASES } from "@/lib/ghighais";

export type Repo = { fullName: string; private: boolean; branch: string };

type Props = {
  disabled?: boolean;
  dbTokens: Record<string, string>;
  onDbToken: (id: string, value: string) => void;
  geminiToken?: string;
  onGeminiToken?: (value: string) => void;
  ghToken: string;
  onGhToken: (value: string) => void;
  repos: Repo[];
  loadingRepos: boolean;
  onLoadRepos: () => void;
  pushing: boolean;
  onPush: (repo: string) => void;
  onCreateRepo?: (repoName: string, isPrivate: boolean) => Promise<void>;
  onSaveZip: () => void;
  onReset: () => void;
  onHome: () => void;
  onLogout: () => void;
};

export function AppMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" disabled={props.disabled} className="gap-2">
          <Menu className="size-4" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">Menu GHIGHAIS AI</SheetTitle>
          <SheetDescription>Database, GitHub, dan pengaturan aplikasi.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              props.onHome();
              setOpen(false);
            }}
          >
            <Home className="size-4" /> Beranda
          </Button>

          <Separator />

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="engine">
              <AccordionTrigger className="gap-2">
                <span className="flex items-center gap-2 text-primary font-medium">
                  <Zap className="size-4 text-emerald-400" /> Mesin AI Unlimited & Zero-Error
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Mode Prompt
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      Full Unlimited
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-400" /> Batasan Token
                    </span>
                    <span className="text-foreground font-medium">Tanpa Batas (1M+ Token)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-sky-400" /> Eksekusi Instruksi
                    </span>
                    <span className="text-foreground font-medium">Zero-Error Protection</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Crown className="size-3.5 text-amber-400" /> Standar Desain
                    </span>
                    <span className="text-amber-300 font-medium">Profesional, Mewah & Modern</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Kunci API Kustom (Opsional)</span>
                    <span className="text-[10px] text-muted-foreground">
                      Default: Cloud Gemini Built-in
                    </span>
                  </div>
                  <Input
                    type="password"
                    placeholder="Contoh: AIzaSy... (bisa beberapa kunci dipisah koma)"
                    value={props.geminiToken ?? ""}
                    onChange={(e) => props.onGeminiToken?.(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Tips Anti-Limit:</strong> Masukkan beberapa API Key Gemini (pisahkan
                    dengan tanda koma <code>,</code>). Sistem akan otomatis merotasi kunci jika
                    salah satu terkena limit 15 RPM Free Tier.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="db">
              <AccordionTrigger className="gap-2">
                <span className="flex items-center gap-2">
                  <Database className="size-4" /> Pilihan Database (11)
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {DATABASES.map((db) => (
                  <div key={db.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{db.name}</span>
                      {db.recommended ? (
                        <Badge className="gap-1 bg-accent text-accent-foreground">
                          <Star className="size-3" /> Rekomendasi
                        </Badge>
                      ) : null}
                    </div>
                    <Input
                      type="password"
                      placeholder={db.hint}
                      value={props.dbTokens[db.id] ?? ""}
                      onChange={(e) => props.onDbToken(db.id, e.target.value)}
                    />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="github">
              <AccordionTrigger className="gap-2">
                <span className="flex items-center gap-2">
                  <Github className="size-4" /> Push ke GitHub
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium">Personal Access Token (PAT)</span>
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={props.ghToken}
                    onChange={(e) => props.onGhToken(e.target.value)}
                  />
                </div>

                {/* Buat Repository Baru */}
                {props.ghToken && props.onCreateRepo ? (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <FolderGit2 className="size-3.5 text-primary" /> Buat Repository Baru
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Membuat repo baru di akun Anda dan langsung mengunggah seluruh proyek aplikasi
                      secara bersih.
                    </p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Nama repo (misal: my-app)"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newRepoPrivate}
                            onChange={(e) => setNewRepoPrivate(e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          Private repository
                        </label>
                        <Button
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          disabled={!newRepoName.trim() || creatingRepo || props.pushing}
                          onClick={async () => {
                            if (!newRepoName.trim() || !props.onCreateRepo) return;
                            setCreatingRepo(true);
                            try {
                              await props.onCreateRepo(newRepoName.trim(), newRepoPrivate);
                              setNewRepoName("");
                            } finally {
                              setCreatingRepo(false);
                            }
                          }}
                        >
                          {creatingRepo ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          Buat & Push
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Update ke Repo yang Ada</span>
                    <span className="text-[10px] text-muted-foreground">
                      Database & berkas lain aman
                    </span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    variant="secondary"
                    onClick={props.onLoadRepos}
                    disabled={props.loadingRepos || !props.ghToken}
                  >
                    {props.loadingRepos ? <Loader2 className="size-4 animate-spin" /> : null}
                    Tampilkan Repository Saya
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {props.repos.map((repo) => (
                    <div
                      key={repo.fullName}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{repo.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {repo.private ? "private" : "public"} · {repo.branch}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={props.pushing}
                        onClick={() => props.onPush(repo.fullName)}
                      >
                        Push
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              props.onSaveZip();
              setOpen(false);
            }}
          >
            <FileArchive className="size-4" /> Simpan ke ZIP
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 text-destructive">
                <RotateCcw className="size-4" /> Reset Halaman
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kosongkan halaman?</AlertDialogTitle>
                <AlertDialogDescription>
                  Prompt, URL GitHub, coding, dan preview akan dikosongkan. Token tersimpan tidak
                  berubah.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    props.onReset();
                    setOpen(false);
                  }}
                >
                  Ya, reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive"
            onClick={() => {
              props.onLogout();
              setOpen(false);
            }}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
