"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Percent,
  Coins,
  Hash,
  Flame,
  Snowflake,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { ReportsData, ReportRow } from "@/types/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { resolvePeriod } from "@/components/entries/entry-filters";

const periodOptions = [
  { value: "all", label: "Todo período" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "year", label: "Este ano" },
] as const;

const granularities = [
  { key: "byDay", label: "Diário" },
  { key: "byWeek", label: "Semanal" },
  { key: "byMonth", label: "Mensal" },
  { key: "byYear", label: "Anual" },
] as const;

function ReportTable({ rows }: { rows: ReportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem dados liquidados no período.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Período</TableHead>
          <TableHead className="text-right">Entradas</TableHead>
          <TableHead className="text-right">Apostado</TableHead>
          <TableHead className="text-right">Lucro</TableHead>
          <TableHead className="text-right">ROI</TableHead>
          <TableHead className="text-right">Win Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">{row.entries}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(row.staked)}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium tabular-nums",
                row.profit > 0 && "text-success",
                row.profit < 0 && "text-destructive",
              )}
            >
              {formatCurrency(row.profit)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.roi)}%
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.winRate)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<string>("all");
  const [granularity, setGranularity] =
    useState<(typeof granularities)[number]["key"]>("byMonth");

  const { dateFrom, dateTo } = period === "all" ? {} : resolvePeriod(period);
  const qs = new URLSearchParams();
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo) qs.set("dateTo", dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", qs.toString()],
    queryFn: () => api.get<ReportsData>(`/api/reports?${qs.toString()}`),
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Relatórios</h2>
          <p className="text-sm text-muted-foreground">
            Desempenho consolidado por período.
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        <StatCard
          title="Lucro"
          value={formatCurrency(summary?.totalProfit ?? 0)}
          icon={TrendingUp}
          tone={
            (summary?.totalProfit ?? 0) > 0
              ? "positive"
              : (summary?.totalProfit ?? 0) < 0
                ? "negative"
                : "default"
          }
          loading={isLoading}
          index={0}
        />
        <StatCard
          title="ROI / Yield"
          value={`${formatNumber(summary?.yield ?? 0)}%`}
          icon={Percent}
          loading={isLoading}
          index={1}
        />
        <StatCard
          title="Odd média"
          value={formatNumber(summary?.avgOdd ?? 0)}
          icon={Hash}
          loading={isLoading}
          index={2}
        />
        <StatCard
          title="Stake média"
          value={formatCurrency(summary?.avgStake ?? 0)}
          icon={Coins}
          loading={isLoading}
          index={3}
        />
        <StatCard
          title="Sequência WIN"
          value={String(summary?.maxWinStreak ?? 0)}
          hint="maior sequência"
          icon={Flame}
          loading={isLoading}
          index={4}
        />
        <StatCard
          title="Sequência LOSS"
          value={String(summary?.maxLossStreak ?? 0)}
          hint="maior sequência"
          icon={Snowflake}
          loading={isLoading}
          index={5}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distribuição de resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Green: {summary?.wins ?? 0}</Badge>
              <Badge variant="success">Half Win: {summary?.halfWins ?? 0}</Badge>
              <Badge variant="muted">Void: {summary?.voids ?? 0}</Badge>
              <Badge variant="destructive">
                Half Loss: {summary?.halfLosses ?? 0}
              </Badge>
              <Badge variant="destructive">Red: {summary?.losses ?? 0}</Badge>
              <Badge variant="secondary">
                Pendentes: {summary?.pendingEntries ?? 0}
              </Badge>
              <Badge variant="outline">
                Total apostado: {formatCurrency(summary?.totalStaked ?? 0)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Lucro por período</CardTitle>
          <Select
            value={granularity}
            onValueChange={(v) =>
              setGranularity(v as (typeof granularities)[number]["key"])
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {granularities.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ReportTable rows={data?.[granularity] ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
