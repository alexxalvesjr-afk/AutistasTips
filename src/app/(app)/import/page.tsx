"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import {
  detectColumns,
  parseSpreadsheetFile,
  rowsToImportPayload,
  type ParsedRow,
} from "@/lib/import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  async function handleFile(file: File) {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error("Formato não suportado. Use CSV ou Excel (.xlsx).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Arquivo excede 5 MB.");
      return;
    }

    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.length === 0) {
        toast.error("Nenhuma linha encontrada no arquivo.");
        return;
      }
      setFileName(file.name);
      setRows(parsed.slice(0, 2000));
      setMapping(detectColumns(Object.keys(parsed[0])));
      setImported(null);
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const payload = rowsToImportPayload(rows, mapping);
      if (payload.length === 0) {
        toast.error("Nenhuma linha válida para importar. Verifique o mapeamento.");
        return;
      }
      const result = await api.post<{ imported: number }>(
        "/api/entries/import",
        { rows: payload },
      );
      setImported(result.imported);
      queryClient.invalidateQueries();
      toast.success(`${result.imported} entrada(s) importada(s)!`);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erro na importação.",
      );
    } finally {
      setImporting(false);
    }
  }

  const previewColumns = rows.length > 0 ? Object.keys(rows[0]).slice(0, 8) : [];
  const mappedFields = Object.values(mapping).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Importar</h2>
        <p className="text-sm text-muted-foreground">
          Traga suas apostas de planilhas CSV ou Excel — as colunas são
          detectadas automaticamente.
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {fileName ?? "Arraste um arquivo ou clique para selecionar"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                CSV, XLSX ou XLS · máx. 5 MB · até 2.000 linhas por importação
              </p>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Colunas detectadas</CardTitle>
              <CardDescription>
                Mapeamento automático das colunas do arquivo para os campos do
                sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(mapping).map(([column, field]) =>
                  field ? (
                    <Badge key={column} variant="success">
                      <CheckCircle2 className="h-3 w-3" />
                      {column} → {field}
                    </Badge>
                  ) : (
                    <Badge key={column} variant="muted">
                      <AlertTriangle className="h-3 w-3" />
                      {column} (ignorada)
                    </Badge>
                  ),
                )}
              </div>
              {!mappedFields.includes("game") ? (
                <p className="mt-3 text-sm text-warning">
                  Nenhuma coluna de “Jogo/Evento” foi detectada — ela é
                  obrigatória. Renomeie a coluna no arquivo para “Jogo”.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Preview ({rows.length} linha(s))
              </CardTitle>
              <CardDescription>Primeiras 10 linhas do arquivo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {previewColumns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {previewColumns.map((column) => (
                        <TableCell key={column} className="max-w-40 truncate">
                          {String(row[column] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                {imported !== null ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {imported} entrada(s) importada(s) com sucesso.
                  </p>
                ) : (
                  <span />
                )}
                <Button
                  onClick={handleImport}
                  loading={importing}
                  disabled={!mappedFields.includes("game")}
                >
                  <Upload /> Importar {rows.length} linha(s)
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
