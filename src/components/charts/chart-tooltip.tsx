"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

type Item = {
  name: string;
  value: number;
  color?: string;
  kind?: "currency" | "number" | "percent";
};

type ChartTooltipProps = {
  label?: string;
  items: Item[];
};

/** Tooltip padrão dos gráficos — fundo popover, texto em tokens de texto. */
export function ChartTooltipContent({ label, items }: ChartTooltipProps) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? (
        <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      ) : null}
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          {item.color ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ) : null}
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium tabular-nums text-popover-foreground">
            {item.kind === "currency"
              ? formatCurrency(item.value)
              : item.kind === "percent"
                ? `${formatNumber(item.value)}%`
                : formatNumber(item.value, 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
