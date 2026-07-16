"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { resolvePeriod } from "@/components/entries/entry-filters";
import {
  entryToExportRow,
  exportCsv,
  exportExcel,
  exportPdf,
} from "@/lib/export";
import type { EntriesResponse } from "@/types/api";

const periodOptions = [
  { value: "all", label: "Todo período" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "year", label: "Este ano" },
] as const;

const formats = [
  {
    key: "csv" as const,
    title: "CSV",
    description: "Compatível com Excel, Google Sheets e outras ferramentas.",
    icon: Download,
  },
  {
    key: "excel" as const,
    title: "Excel (.xlsx)",
    description: "Planilha formatada pronta para análise.",
    icon: FileSpreadsheet,
  },
  {
    key: "pdf" as const,
    title: "PDF",
    description: "Relatório tabular para arquivar ou compartilhar.",
    icon: FileText,
  },
];

export default function ExportPage() {
  const [period, setPeriod] = useState("all");
  const [exporting, setExporting] = useState<string | null>(null);

  async function fetchAllEntries() {
    const { dateFrom, dateTo } = period === "all" ? {} : resolvePeriod(period);
    const rows = [];
    let page = 1;
    let totalPages = 1;
    do {
      const qs = new URLSearchParams({ page: String(page), pageSize: "100" });
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);
      const response = await api.get<EntriesResponse>(`/api/entries?${qs}`);
      rows.push(...response.items);
      totalPages = response.pagination.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 50);
    return rows.map(entryToExportRow);
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    setExporting(format);
    try {
      const rows = await fetchAllEntries();
      if (rows.length === 0) {
        toast.error("Nenhuma entrada no período selecionado.");
        return;
      }
      if (format === "csv") exportCsv(rows);
      else if (format === "excel") await exportExcel(rows);
      else await exportPdf(rows);
      toast.success(`${rows.length} entrada(s) exportada(s).`);
    } catch {
      toast.error("Erro ao exportar. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Exportar</h2>
          <p className="text-sm text-muted-foreground">
            Baixe suas entradas no formato que preferir.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {formats.map((format) => (
          <Card key={format.key} className="flex flex-col">
            <CardHeader>
              <format.icon className="mb-2 h-6 w-6 text-primary" />
              <CardTitle className="text-base">{format.title}</CardTitle>
              <CardDescription>{format.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                className="w-full"
                loading={exporting === format.key}
                disabled={exporting !== null && exporting !== format.key}
                onClick={() => handleExport(format.key)}
              >
                <Download /> Exportar {format.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
