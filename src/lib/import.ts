"use client";

import Papa from "papaparse";

export type ParsedRow = Record<string, string | number | null>;

/** Aliases aceitos para cada campo do sistema (detecção automática). */
const FIELD_ALIASES: Record<string, string[]> = {
  date: ["data", "date", "dia"],
  bookmakerName: ["casa", "casa de aposta", "bookmaker", "book", "site"],
  sportName: ["esporte", "sport", "modalidade"],
  competition: ["campeonato", "liga", "competition", "torneio", "league"],
  game: ["jogo", "evento", "partida", "game", "event", "match"],
  market: ["mercado", "market", "tipo de aposta"],
  selection: ["selecao", "seleção", "selection", "pick", "aposta"],
  odd: ["odd", "odds", "cotacao", "cotação"],
  stake: ["stake", "valor", "valor investido", "investido", "aposta (r$)"],
  result: ["resultado", "result", "status"],
  notes: ["observacoes", "observações", "obs", "notes", "nota"],
};

const RESULT_ALIASES: Record<string, string> = {
  win: "WIN",
  green: "WIN",
  ganhou: "WIN",
  vitoria: "WIN",
  "half win": "HALF_WIN",
  "meio green": "HALF_WIN",
  loss: "LOSS",
  red: "LOSS",
  perdeu: "LOSS",
  derrota: "LOSS",
  "half loss": "HALF_LOSS",
  "meio red": "HALF_LOSS",
  void: "VOID",
  anulada: "VOID",
  reembolso: "VOID",
  cashout: "VOID",
  pendente: "PENDING",
  pending: "PENDING",
  aberta: "PENDING",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Detecta automaticamente o campo do sistema para cada coluna do arquivo. */
export function detectColumns(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const column of columns) {
    const normalized = normalize(column);
    let matched = "";
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (used.has(field)) continue;
      if (aliases.some((alias) => normalized === normalize(alias))) {
        matched = field;
        break;
      }
    }
    if (!matched) {
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (used.has(field)) continue;
        if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
          matched = field;
          break;
        }
      }
    }
    if (matched) used.add(matched);
    mapping[column] = matched;
  }
  return mapping;
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedRow[]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: reject,
      });
    });
  }

  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => {
    headers[col] = String(cell.value ?? `Coluna ${col}`);
  });

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const parsed: ParsedRow = {};
    row.eachCell((cell, col) => {
      const header = headers[col];
      if (!header) return;
      const value = cell.value;
      if (value instanceof Date) {
        parsed[header] = value.toISOString().slice(0, 10);
      } else if (value && typeof value === "object" && "result" in value) {
        parsed[header] = String(value.result ?? "");
      } else if (value && typeof value === "object" && "text" in value) {
        parsed[header] = String(value.text ?? "");
      } else {
        parsed[header] = value == null ? null : (value as string | number);
      }
    });
    if (Object.values(parsed).some((v) => v !== null && v !== "")) {
      rows.push(parsed);
    }
  });
  return rows;
}

function parseDate(value: string | number | null): string | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();

  // dd/mm/yyyy ou dd-mm-yyyy
  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return null;
}

function parseNumber(value: string | number | null): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3})/g, "");
  const parsed = Number(cleaned.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseResult(value: string | number | null): string {
  if (value == null) return "PENDING";
  const normalized = normalize(String(value));
  return RESULT_ALIASES[normalized] ?? "PENDING";
}

/** Converte as linhas do arquivo no payload da API usando o mapeamento. */
export function rowsToImportPayload(
  rows: ParsedRow[],
  mapping: Record<string, string>,
): Record<string, unknown>[] {
  const fieldByColumn = Object.entries(mapping).filter(([, field]) => field);
  const payload: Record<string, unknown>[] = [];

  for (const row of rows) {
    const record: Record<string, unknown> = {};
    for (const [column, field] of fieldByColumn) {
      record[field] = row[column];
    }

    const date = parseDate(record.date as string | number | null);
    const odd = parseNumber(record.odd as string | number | null);
    const stake = parseNumber(record.stake as string | number | null);
    const game = record.game ? String(record.game).trim() : "";

    if (!date || !game || !odd || odd <= 1 || !stake || stake <= 0) continue;

    payload.push({
      date,
      game: game.slice(0, 160),
      odd,
      stake,
      result: parseResult(record.result as string | number | null),
      competition: record.competition
        ? String(record.competition).slice(0, 120)
        : null,
      market: record.market ? String(record.market).slice(0, 120) : null,
      selection: record.selection
        ? String(record.selection).slice(0, 160)
        : null,
      notes: record.notes ? String(record.notes).slice(0, 1000) : null,
      sportName: record.sportName
        ? String(record.sportName).slice(0, 60)
        : null,
      bookmakerName: record.bookmakerName
        ? String(record.bookmakerName).slice(0, 80)
        : null,
    });
  }
  return payload;
}
