import { z } from "zod";
import { sanitizeText, sanitizeMultiline } from "@/lib/sanitize";

export const ENTRY_RESULTS = [
  "PENDING",
  "WIN",
  "LOSS",
  "VOID",
  "HALF_WIN",
  "HALF_LOSS",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v ? sanitizeText(v) : v))
    .transform((v) => (v === "" ? null : v))
    .nullish();

const idSchema = z.string().trim().min(1).max(40);

export const entryInputSchema = z.object({
  date: z.coerce.date(),
  bookmakerId: idSchema.nullish(),
  sportId: idSchema.nullish(),
  competition: optionalText(120),
  game: z.string().trim().min(1, "Informe o jogo/evento").max(160).transform(sanitizeText),
  market: optionalText(120),
  selection: optionalText(160),
  odd: z.coerce
    .number()
    .min(1.001, "Odd deve ser maior que 1")
    .max(10000, "Odd inválida"),
  stake: z.coerce
    .number()
    .positive("Stake deve ser positiva")
    .max(100_000_000, "Stake inválida"),
  result: z.enum(ENTRY_RESULTS).default("PENDING"),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v ? sanitizeMultiline(v) : v))
    .transform((v) => (v === "" ? null : v))
    .nullish(),
  tagIds: z.array(idSchema).max(10).optional(),
});

export const entryUpdateSchema = entryInputSchema.partial();

export const entryFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sportId: idSchema.optional(),
  bookmakerId: idSchema.optional(),
  competition: z.string().trim().max(120).optional(),
  result: z.enum(ENTRY_RESULTS).optional(),
  tagId: idSchema.optional(),
  profitMin: z.coerce.number().optional(),
  profitMax: z.coerce.number().optional(),
  sortBy: z
    .enum(["date", "odd", "stake", "profit", "createdAt", "game"])
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const bulkActionSchema = z.object({
  action: z.enum(["delete", "duplicate"]),
  ids: z.array(idSchema).min(1).max(200),
});

export const importRowSchema = entryInputSchema.extend({
  sportName: optionalText(60),
  bookmakerName: optionalText(80),
});

export const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(2000),
});

export type EntryInput = z.infer<typeof entryInputSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
export type EntryFilters = z.infer<typeof entryFiltersSchema>;
