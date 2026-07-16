"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import type { StatsData } from "@/types/api";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltipContent } from "@/components/charts/chart-tooltip";
import {
  chartColors,
  profitColor,
  resultColors,
  resultLabels,
} from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function heatColor(profit: number, max: number): string {
  if (profit === 0) return "hsl(240 4% 14%)";
  const intensity = Math.min(1, Math.abs(profit) / (max || 1));
  const alpha = 0.15 + intensity * 0.75;
  return profit > 0
    ? `rgb(18 165 148 / ${alpha})`
    : `rgb(220 61 67 / ${alpha})`;
}

export default function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsData>("/api/stats"),
  });

  const pieData =
    data?.resultDistribution.filter((d) => d.count > 0) ?? [];
  const maxCalendarProfit = Math.max(
    1,
    ...(data?.calendar ?? []).map((d) => Math.abs(d.profit)),
  );
  const maxHeatmapProfit = Math.max(
    1,
    ...(data?.heatmap ?? []).map((d) => Math.abs(d.profit)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Estatísticas</h2>
        <p className="text-sm text-muted-foreground">
          Análise visual do seu desempenho.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Distribuição de resultados"
          description="Entradas liquidadas por resultado"
          loading={isLoading}
          empty={pieData.length === 0}
        >
          <div className="flex h-full items-center gap-6">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="result"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  stroke="hsl(240 5% 7%)"
                  strokeWidth={2}
                >
                  {pieData.map((item) => (
                    <Cell key={item.result} fill={resultColors[item.result]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltipContent
                        items={[
                          {
                            name: resultLabels[String(payload[0].name)],
                            value: Number(payload[0].value),
                            color: resultColors[String(payload[0].name)],
                            kind: "number",
                          },
                        ]}
                      />
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 text-sm">
              {pieData.map((item) => (
                <li key={item.result} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: resultColors[item.result] }}
                  />
                  <span className="text-muted-foreground">
                    {resultLabels[item.result]}
                  </span>
                  <span className="font-medium tabular-nums">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard
          title="Lucro acumulado"
          description="Linha de evolução do lucro"
          loading={isLoading}
          empty={!data?.profitLine.length}
        >
          <ResponsiveContainer>
            <LineChart data={data?.profitLine ?? []}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatDate(v)}
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={formatDate(String(label))}
                      items={[
                        {
                          name: "Lucro acumulado",
                          value: Number(payload[0].value),
                          color: chartColors.line,
                          kind: "currency",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={chartColors.line}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Lucro por casa de aposta"
          description="Resultado líquido por casa"
          loading={isLoading}
          empty={!data?.byBookmaker.length}
        >
          <ResponsiveContainer>
            <BarChart data={data?.byBookmaker ?? []} layout="vertical">
              <CartesianGrid stroke={chartColors.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="bookmaker"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                cursor={{ fill: "hsl(240 4% 14% / 0.5)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={String(label)}
                      items={[
                        {
                          name: "Lucro",
                          value: Number(payload[0].value),
                          color: profitColor(Number(payload[0].value)),
                          kind: "currency",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {(data?.byBookmaker ?? []).map((item) => (
                  <Cell key={item.bookmaker} fill={profitColor(item.profit)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Distribuição de odds"
          description="Volume de entradas por faixa de odd"
          loading={isLoading}
          empty={!data?.oddsDistribution.some((d) => d.count > 0)}
        >
          <ResponsiveContainer>
            <BarChart data={data?.oddsDistribution ?? []}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(240 4% 14% / 0.5)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={`Odd ${label}`}
                      items={[
                        {
                          name: "Entradas",
                          value: Number(payload[0].value),
                          color: chartColors.line,
                          kind: "number",
                        },
                        {
                          name: "Lucro",
                          value: Number(
                            (payload[0].payload as { profit: number }).profit,
                          ),
                          color: profitColor(
                            Number(
                              (payload[0].payload as { profit: number }).profit,
                            ),
                          ),
                          kind: "currency",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar
                dataKey="count"
                fill={chartColors.line}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Distribuição de stake"
          description="Volume de entradas por faixa de valor"
          loading={isLoading}
          empty={!data?.stakeDistribution.some((d) => d.count > 0)}
        >
          <ResponsiveContainer>
            <BarChart data={data?.stakeDistribution ?? []}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(240 4% 14% / 0.5)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={`Stake ${label}`}
                      items={[
                        {
                          name: "Entradas",
                          value: Number(payload[0].value),
                          color: chartColors.line,
                          kind: "number",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar
                dataKey="count"
                fill={chartColors.positive}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Desempenho por dia da semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {(data?.heatmap ?? []).map((cell) => (
                <UiTooltip key={cell.weekday}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex h-20 cursor-default flex-col items-center justify-center rounded-md border text-xs"
                      style={{
                        backgroundColor: heatColor(cell.profit, maxHeatmapProfit),
                      }}
                    >
                      <span className="font-medium">
                        {WEEKDAYS[cell.weekday]}
                      </span>
                      <span className="mt-1 tabular-nums text-muted-foreground">
                        {cell.entries}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {WEEKDAYS[cell.weekday]}: {formatCurrency(cell.profit)} em{" "}
                    {cell.entries} entrada(s)
                  </TooltipContent>
                </UiTooltip>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Verde = lucro · Vermelho = prejuízo · Intensidade = magnitude
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calendário de resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.calendar.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem dados liquidados ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.calendar.map((day) => (
                <UiTooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className="h-6 w-6 cursor-default rounded-sm border"
                      style={{
                        backgroundColor: heatColor(day.profit, maxCalendarProfit),
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDate(day.date)}: {formatCurrency(day.profit)} em{" "}
                    {day.entries} entrada(s)
                  </TooltipContent>
                </UiTooltip>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
