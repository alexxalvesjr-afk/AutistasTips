import { z } from "zod";

/** Filtros de período/segmentação para relatórios e estatísticas. */
export const periodFiltersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sportId: z.string().trim().min(1).max(40).optional(),
  bookmakerId: z.string().trim().min(1).max(40).optional(),
});

export type PeriodFilters = z.infer<typeof periodFiltersSchema>;
