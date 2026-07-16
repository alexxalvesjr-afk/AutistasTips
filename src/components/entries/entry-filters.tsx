"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookmakers, useSports } from "@/hooks/use-lookups";
import { resultLabels } from "@/lib/chart-colors";
import type { EntryFilterParams } from "@/hooks/use-entries";

const ALL = "__all__";

const periodPresets = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
] as const;

export type PeriodPreset = (typeof periodPresets)[number]["value"] | typeof ALL;

export function resolvePeriod(preset: string): {
  dateFrom?: string;
  dateTo?: string;
} {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startOfDay = (d: Date) => iso(d);

  switch (preset) {
    case "today":
      return { dateFrom: startOfDay(today), dateTo: iso(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { dateFrom: iso(y), dateTo: iso(y) };
    }
    case "7d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { dateFrom: iso(d) };
    }
    case "30d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return { dateFrom: iso(d) };
    }
    case "year":
      return { dateFrom: `${today.getFullYear()}-01-01` };
    default:
      return {};
  }
}

type EntryFiltersBarProps = {
  filters: EntryFilterParams & { period?: string };
  onChange: (filters: EntryFilterParams & { period?: string }) => void;
};

export function EntryFiltersBar({ filters, onChange }: EntryFiltersBarProps) {
  const { data: sports } = useSports();
  const { data: bookmakers } = useBookmakers();

  const hasFilters = Boolean(
    filters.search ||
      filters.sportId ||
      filters.bookmakerId ||
      filters.result ||
      filters.period ||
      filters.dateFrom ||
      filters.dateTo,
  );

  function set(partial: Partial<EntryFilterParams & { period?: string }>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Pesquisar jogo, mercado, campeonato…"
          className="pl-8"
        />
      </div>

      <Select
        value={filters.period ?? ALL}
        onValueChange={(value) => {
          if (value === ALL) {
            set({ period: undefined, dateFrom: undefined, dateTo: undefined });
          } else if (value === "custom") {
            set({ period: value });
          } else {
            set({ period: value, ...resolvePeriod(value) });
          }
        }}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todo período</SelectItem>
          {periodPresets.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.period === "custom" ? (
        <>
          <Input
            type="date"
            className="w-36"
            value={filters.dateFrom ?? ""}
            onChange={(e) => set({ dateFrom: e.target.value })}
            aria-label="Data inicial"
          />
          <Input
            type="date"
            className="w-36"
            value={filters.dateTo ?? ""}
            onChange={(e) => set({ dateTo: e.target.value })}
            aria-label="Data final"
          />
        </>
      ) : null}

      <Select
        value={filters.sportId ?? ALL}
        onValueChange={(v) => set({ sportId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Esporte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos esportes</SelectItem>
          {sports?.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.bookmakerId ?? ALL}
        onValueChange={(v) => set({ bookmakerId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Casa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas casas</SelectItem>
          {bookmakers?.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.result ?? ALL}
        onValueChange={(v) => set({ result: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Resultado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos resultados</SelectItem>
          {Object.entries(resultLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ page: 1, pageSize: filters.pageSize, sortBy: filters.sortBy, sortOrder: filters.sortOrder })
          }
        >
          <X /> Limpar
        </Button>
      ) : null}
    </div>
  );
}
