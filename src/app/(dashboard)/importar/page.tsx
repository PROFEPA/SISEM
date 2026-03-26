"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
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

export default function ImportarPage() {
  const supabase = createClient();
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [orpaId, setOrpaId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.xlsx?$/i)) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
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
    }
  }, []);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (orpaId) formData.append("orpa_id", orpaId);

    try {
      const res = await fetch("/api/importar", {
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Excel</h1>
        <p className="text-muted-foreground text-sm">
          Cargue archivos Excel de multas por ORPA para importar al sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración</CardTitle>
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
          </div>
        </CardContent>
      </Card>

      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-500 bg-green-50"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
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
                  onClick={() => { setFile(null); setResult(null); }}
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
                  onChange={handleFileSelect}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
              </>
            )}
          </div>

          {file && (
            <Button
              className="w-full mt-4"
              onClick={handleUpload}
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

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Importación completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.totalRows}</p>
                <p className="text-xs text-muted-foreground">Filas en Excel</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.parsed}</p>
                <p className="text-xs text-muted-foreground">Válidos</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Hoja: <Badge variant="secondary" className="text-[10px]">{result.sheetName}</Badge>
            </p>

            {result.parseErrors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1">
                  Errores de parseo ({result.parseErrors.length}):
                </p>
                <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
                  {result.parseErrors.map((e, i) => (
                    <p key={i} className="text-muted-foreground">
                      Fila {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.importErrors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1">
                  Errores de importación ({result.importErrors.length}):
                </p>
                <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
                  {result.importErrors.map((e, i) => (
                    <p key={i} className="text-muted-foreground">
                      Fila {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
