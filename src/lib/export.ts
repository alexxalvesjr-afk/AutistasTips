"use client";

import { unparse } from "papaparse";
import { resultLabels } from "@/lib/chart-colors";
import type { Entry } from "@/types/api";

/** Neutraliza CSV/Excel injection em células exportadas. */
function safeCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

export type ExportRow = Record<string, string | number>;

export function entryToExportRow(entry: Entry): ExportRow {
  return {
    Data: new Date(entry.date).toLocaleDateString("pt-BR"),
    Casa: safeCell(entry.bookmaker?.name ?? ""),
    Esporte: safeCell(entry.sport?.name ?? ""),
    Campeonato: safeCell(entry.competition ?? ""),
    Jogo: safeCell(entry.game),
    Mercado: safeCell(entry.market ?? ""),
    "Seleção": safeCell(entry.selection ?? ""),
    Odd: entry.odd,
    Stake: entry.stake,
    Resultado: resultLabels[entry.result] ?? entry.result,
    Lucro: entry.profit,
    Tags: safeCell(entry.tags.map((t) => t.name).join(", ")),
    "Observações": safeCell(entry.notes ?? ""),
  };
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows: ExportRow[], filename = "apostas.csv"): void {
  const csv = unparse(rows, { delimiter: ";" });
  // BOM para o Excel reconhecer UTF-8.
  download(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

export async function exportExcel(
  rows: ExportRow[],
  filename = "apostas.xlsx",
): Promise<void> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Apostas");

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(12, header.length + 4),
    }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function exportPdf(
  rows: ExportRow[],
  filename = "apostas.pdf",
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("BetManager — Relatório de apostas", 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [190, 18, 60] },
    });
  }

  doc.save(filename);
}
