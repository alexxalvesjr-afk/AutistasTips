"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  Percent,
  ListChecks,
  Trophy,
  Coins,
  CalendarRange,
  CalendarDays,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import type { DashboardData } from "@/types/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltipContent } from "@/components/charts/chart-tooltip";
import { chartColors, profitColor } from "@/lib/chart-colors";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });

  const cards = data?.cards;
  const charts = data?.charts;

  const statCards = [
    {
      title: "Saldo Total",
      value: formatCurrency(cards?.totalBalance ?? 0),
      icon: Wallet,
      tone: "default" as const,
    },
    {
      title: "Lucro",
      value: formatCurrency(cards?.totalProfit ?? 0),
      icon: TrendingUp,
      tone:
        (cards?.totalProfit ?? 0) > 0
          ? ("positive" as const)
          : (cards?.totalProfit ?? 0) < 0
            ? ("negative" as const)
            : ("default" as const),
    },
    {
      title: "ROI",
      value: `${formatNumber(cards?.roi ?? 0)}%`,
      icon: Percent,
      tone:
        (cards?.roi ?? 0) > 0
          ? ("positive" as const)
          : (cards?.roi ?? 0) < 0
            ? ("negative" as const)
            : ("default" as const),
    },
    {
      title: "Entradas",
      value: String(cards?.totalEntries ?? 0),
      hint: `${cards?.pendingEntries ?? 0} pendente(s)`,
      icon: ListChecks,
      tone: "default" as const,
    },
    {
      title: "Win Rate",
      value: `${formatNumber(cards?.winRate ?? 0)}%`,
      icon: Trophy,
      tone: "default" as const,
    },
    {
      title: "Stake Média",
      value: formatCurrency(cards?.avgStake ?? 0),
      icon: Coins,
      tone: "default" as const,
    },
    {
      title: "Lucro Mensal",
      value: formatCurrency(cards?.monthProfit ?? 0),
      icon: CalendarRange,
      tone:
        (cards?.monthProfit ?? 0) > 0
          ? ("positive" as const)
          : (cards?.monthProfit ?? 0) < 0
            ? ("negative" as const)
            : ("default" as const),
    },
    {
      title: "Lucro Semanal",
      value: formatCurrency(cards?.weekProfit ?? 0),
      icon: CalendarDays,
      tone:
        (cards?.weekProfit ?? 0) > 0
          ? ("positive" as const)
          : (cards?.weekProfit ?? 0) < 0
            ? ("negative" as const)
            : ("default" as const),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        {statCards.map((card, index) => (
          <StatCard key={card.title} {...card} loading={isLoading} index={index} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Evolução da banca"
          description="Saldo acumulado por dia liquidado"
          loading={isLoading}
          empty={!charts?.evolution.length}
        >
          <ResponsiveContainer>
            <AreaChart data={charts?.evolution ?? []}>
              <defs>
                <linearGradient id="evo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.line} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chartColors.line} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                          name: "Saldo",
                          value: Number(payload[0].value),
                          color: chartColors.line,
                          kind: "currency",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={chartColors.line}
                strokeWidth={2}
                fill="url(#evo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Lucro por esporte"
          description="Resultado líquido por modalidade"
          loading={isLoading}
          empty={!charts?.bySport.length}
        >
          <ResponsiveContainer>
            <BarChart data={charts?.bySport ?? []} layout="vertical">
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
                dataKey="sport"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={110}
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
                {(charts?.bySport ?? []).map((item) => (
                  <Cell key={item.sport} fill={profitColor(item.profit)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="ROI mensal"
          description="Retorno sobre o investimento por mês"
          loading={isLoading}
          empty={!charts?.byMonth.length}
        >
          <ResponsiveContainer>
            <BarChart data={charts?.byMonth ?? []}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="month"
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
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: "hsl(240 4% 14% / 0.5)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={String(label)}
                      items={[
                        {
                          name: "ROI",
                          value: Number(payload[0].value),
                          color: profitColor(Number(payload[0].value)),
                          kind: "percent",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {(charts?.byMonth ?? []).map((item) => (
                  <Cell key={item.month} fill={profitColor(item.roi)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Lucro diário"
          description="Últimos 30 dias"
          loading={isLoading}
          empty={!charts?.dailyProfit.some((d) => d.profit !== 0)}
        >
          <ResponsiveContainer>
            <BarChart data={charts?.dailyProfit ?? []}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatDate(v).slice(0, 5)}
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
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
                cursor={{ fill: "hsl(240 4% 14% / 0.5)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipContent
                      label={formatDate(String(label))}
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
              <Bar dataKey="profit" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {(charts?.dailyProfit ?? []).map((item) => (
                  <Cell key={item.date} fill={profitColor(item.profit)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
