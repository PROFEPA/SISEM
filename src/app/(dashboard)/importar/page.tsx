"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  BarChart3,
  FileText,
} from "lucide-react";
import type { IOrpa } from "@/types";

interface ImportResult {
  totalRows: number;
  parsed: number;
  inserted: number;
  parseErrors: Array<{ row: number; error: string }>;
  importErrors: Array<{ row: number; error: string }>;
  sheetName: string;
}

interface ConcentradoResult {
  periodo: string;
  parsed: number;
  inserted: number;
  notFound: string[];
  totales: unknown;
  sheetName: string;
}

export default function ImportarPage() {
  const supabase = createClient();
  const [orpas, setOrpas] = useState<IOrpa[]>([]);

  useEffect(() => {
    supabase
      .from("orpas")
      .select("*")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => {
        if (data) setOrpas(data);
      });
  }, [supabase]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Excel</h1>
        <p className="text-muted-foreground text-sm">
          Cargue archivos de expedientes individuales por ORPA, o concentrados
          mensuales (CIFRAS) con totales agregados
        </p>
      </div>

      <Tabs defaultValue="expedientes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expedientes">
            <FileText className="w-4 h-4 mr-2" />
            Expedientes por ORPA
          </TabsTrigger>
          <TabsTrigger value="concentrado">
            <BarChart3 className="w-4 h-4 mr-2" />
            Concentrado (CIFRAS)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expedientes" className="space-y-6">
          <ExpedientesTab orpas={orpas} />
        </TabsContent>

        <TabsContent value="concentrado" className="space-y-6">
          <ConcentradoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== TAB: EXPEDIENTES ====================
interface BatchFileResult {
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  result?: ImportResult;
  error?: string;
}

function ExpedientesTab({ orpas }: { orpas: IOrpa[] }) {
  const [orpaId, setOrpaId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const xlsx = newFiles.filter((f) => f.name.match(/\.xlsx?$/i));
    if (xlsx.length === 0) {
      setGlobalError("Solo se aceptan archivos Excel (.xlsx)");
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const dedup = xlsx.filter((f) => !existing.has(f.name));
      return [...prev, ...dedup];
    });
    setBatchResults([]);
    setGlobalError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) {
        addFiles(Array.from(selected));
        // reset input so re-selecting same file triggers change
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setBatchResults((prev) => prev.filter((r) => r.fileName !== name));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setBatchResults([]);
    setGlobalError(null);
  }, []);

  async function handleUpload() {
    if (files.length === 0) return;

    setUploading(true);
    setGlobalError(null);

    // Inicializa estado de todos los archivos
    const initial: BatchFileResult[] = files.map((f) => ({
      fileName: f.name,
      status: "pending",
    }));
    setBatchResults(initial);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setBatchResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r))
      );

      const formData = new FormData();
      formData.append("file", f);
      if (orpaId && orpaId !== "auto") formData.append("orpa_id", orpaId);

      try {
        const res = await fetch("/api/importar", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (json.error && !json.data) {
          setBatchResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error", error: json.error } : r
            )
          );
        } else if (json.data) {
          setBatchResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: "done",
                    result: json.data,
                    error: json.error ?? undefined,
                  }
                : r
            )
          );
        }
      } catch {
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", error: "Error de conexión" }
              : r
          )
        );
      }
    }

    setUploading(false);
  }

  const totals = batchResults.reduce(
    (acc, r) => {
      if (r.result) {
        acc.totalRows += r.result.totalRows;
        acc.parsed += r.result.parsed;
        acc.inserted += r.result.inserted;
      }
      if (r.status === "done") acc.filesOk++;
      if (r.status === "error") acc.filesFail++;
      return acc;
    },
    { totalRows: 0, parsed: 0, inserted: 0, filesOk: 0, filesFail: 0 }
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes individuales</CardTitle>
          <CardDescription>
            Puede seleccionar o arrastrar <strong>múltiples archivos</strong>{" "}
            (hasta los 32 estados). Se procesan uno por uno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ORPA (opcional — se detecta automáticamente del Excel)</Label>
            <Select value={orpaId} onValueChange={(v) => setOrpaId(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Detectar automáticamente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detectar automáticamente</SelectItem>
                {orpas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si sube varios archivos, deje esta opción en &quot;Detectar
              automáticamente&quot; para que cada archivo se asigne a su ORPA
              según el nombre del archivo.
            </p>
          </div>
        </CardContent>
      </Card>

      <MultiDropzone
        files={files}
        dragging={dragging}
        uploading={uploading}
        batchResults={batchResults}
        onDrop={handleDrop}
        onDragOver={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onFileSelect={handleFileSelect}
        onRemoveFile={removeFile}
        onClearAll={clearAll}
        onUpload={handleUpload}
      />

      {globalError && <ErrorCard error={globalError} />}

      {batchResults.length > 0 && !uploading && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Importación por lote completada
            </CardTitle>
            <CardDescription>
              {totals.filesOk} archivo(s) con éxito
              {totals.filesFail > 0 && ` · ${totals.filesFail} con error`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCell label="Filas totales" value={totals.totalRows} />
              <StatCell label="Válidos" value={totals.parsed} />
              <StatCell label="Importados" value={totals.inserted} highlight />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {batchResults.map((r) => (
                <FileResultRow key={r.fileName} result={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ==================== TAB: CONCENTRADO ====================
function ConcentradoTab() {
  const [file, setFile] = useState<File | null>(null);
  const [periodo, setPeriodo] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ConcentradoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.xlsx?$/i)) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
      const auto = detectPeriodoFromName(droppedFile.name);
      if (auto) setPeriodo(auto);
    } else {
      setError("Solo se aceptan archivos Excel (.xlsx)");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
      const auto = detectPeriodoFromName(selected.name);
      if (auto) setPeriodo(auto);
    }
  }, []);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (periodo) formData.append("periodo", periodo);

    try {
      const res = await fetch("/api/importar/concentrado", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.error && !json.data) {
        setError(json.error);
      } else if (json.data) {
        setResult(json.data);
        if (json.error) setError(json.error);
      }
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concentrado mensual (CIFRAS)</CardTitle>
          <CardDescription>
            Archivo Excel con totales agregados por ORPA (una fila por entidad).
            Típicamente se llama &quot;1. CIFRAS [MES] [AÑO].xlsx&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Periodo (formato YYYY-MM, se detecta automáticamente)</Label>
            <Input
              type="text"
              placeholder="Ej: 2026-03"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              pattern="\d{4}-\d{2}"
            />
            <p className="text-xs text-muted-foreground">
              Si ya existe un concentrado para este periodo, será sobrescrito.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dropzone
        file={file}
        dragging={dragging}
        uploading={uploading}
        onDrop={handleDrop}
        onDragOver={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onFileSelect={handleFileSelect}
        onClear={() => {
          setFile(null);
          setResult(null);
          setError(null);
          setPeriodo("");
        }}
        onUpload={handleUpload}
      />

      {error && <ErrorCard error={error} />}

      {result && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Concentrado guardado
            </CardTitle>
            <CardDescription>
              Periodo: <Badge variant="secondary">{result.periodo}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCell label="ORPAs leídas" value={result.parsed} />
              <StatCell label="ORPAs guardadas" value={result.inserted} highlight />
            </div>

            <p className="text-xs text-muted-foreground">
              Hoja:{" "}
              <Badge variant="secondary" className="text-[10px]">
                {result.sheetName}
              </Badge>
            </p>

            {result.notFound.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 mb-1">
                  ORPAs no reconocidas ({result.notFound.length}):
                </p>
                <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
                  {result.notFound.map((n, i) => (
                    <p key={i} className="text-muted-foreground">
                      • {n}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ==================== HELPERS ====================
const MESES: Record<string, string> = {
  ENERO: "01", FEBRERO: "02", MARZO: "03", ABRIL: "04",
  MAYO: "05", JUNIO: "06", JULIO: "07", AGOSTO: "08",
  SEPTIEMBRE: "09", OCTUBRE: "10", NOVIEMBRE: "11", DICIEMBRE: "12",
};

function detectPeriodoFromName(fileName: string): string | null {
  const name = fileName.replace(/\.xlsx?$/i, "").toUpperCase();
  const yearMatch = name.match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : null;
  for (const [mesName, mesNum] of Object.entries(MESES)) {
    if (name.includes(mesName)) {
      return year ? `${year}-${mesNum}` : null;
    }
  }
  return null;
}

interface DropzoneProps {
  file: File | null;
  dragging: boolean;
  uploading: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onUpload: () => void;
}

function Dropzone({
  file,
  dragging,
  uploading,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onClear,
  onUpload,
}: DropzoneProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : file
              ? "border-green-500/50 bg-green-500/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver();
          }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClear}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium">
                Arrastre un archivo Excel aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                o haga clic para seleccionar
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={onFileSelect}
              />
            </>
          )}
        </div>

        {file && (
          <Button
            className="w-full mt-4"
            onClick={onUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar archivo
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <p className="text-sm text-destructive">{error}</p>
      </CardContent>
    </Card>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`text-center p-3 rounded-lg ${
        highlight ? "bg-green-500/10" : "bg-muted"
      }`}
    >
      <p className={`text-2xl font-bold ${highlight ? "text-green-600" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ErrorList({
  title,
  items,
}: {
  title: string;
  items: Array<{ row: number; error: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-destructive mb-1">{title}:</p>
      <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
        {items.map((e, i) => (
          <p key={i} className="text-muted-foreground">
            Fila {e.row}: {e.error}
          </p>
        ))}
      </div>
    </div>
  );
}

interface MultiDropzoneProps {
  files: File[];
  dragging: boolean;
  uploading: boolean;
  batchResults: BatchFileResult[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (name: string) => void;
  onClearAll: () => void;
  onUpload: () => void;
}

function MultiDropzone({
  files,
  dragging,
  uploading,
  batchResults,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onRemoveFile,
  onClearAll,
  onUpload,
}: MultiDropzoneProps) {
  const getStatus = (name: string): BatchFileResult["status"] | null =>
    batchResults.find((r) => r.fileName === name)?.status ?? null;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : files.length > 0
              ? "border-green-500/50 bg-green-500/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver();
          }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium">
            Arrastre uno o varios archivos Excel aquí
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            o haga clic para seleccionar (Ctrl/Shift para elegir múltiples)
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={onFileSelect}
            disabled={uploading}
          />
        </div>

        {files.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs">
              <p className="font-medium">
                {files.length} archivo(s) en cola
              </p>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={onClearAll}
                >
                  Limpiar todo
                </Button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
              {files.map((f) => {
                const status = getStatus(f.name);
                return (
                  <div
                    key={f.name}
                    className="flex items-center gap-2 py-1 px-2 text-xs rounded hover:bg-muted/50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    {status === "uploading" && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                    )}
                    {status === "done" && (
                      <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                    )}
                    {status === "error" && (
                      <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                    )}
                    {!uploading && !status && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onRemoveFile(f.name)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full"
              onClick={onUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando... (
                  {batchResults.filter((r) => r.status === "done" || r.status === "error").length}
                  /{files.length})
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {files.length} archivo(s)
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FileResultRow({ result }: { result: BatchFileResult }) {
  const r = result.result;
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        {result.status === "done" ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        )}
        <span className="text-sm font-medium truncate flex-1">
          {result.fileName}
        </span>
        {r && (
          <Badge variant="secondary" className="text-[10px]">
            {r.inserted}/{r.totalRows}
          </Badge>
        )}
      </div>
      {result.error && (
        <p className="text-xs text-destructive">{result.error}</p>
      )}
      {r && (r.parseErrors.length > 0 || r.importErrors.length > 0) && (
        <div className="space-y-1">
          {r.parseErrors.length > 0 && (
            <ErrorList
              title={`Errores de parseo (${r.parseErrors.length})`}
              items={r.parseErrors}
            />
          )}
          {r.importErrors.length > 0 && (
            <ErrorList
              title={`Errores de importación (${r.importErrors.length})`}
              items={r.importErrors}
            />
          )}
        </div>
      )}
    </div>
  );
}
