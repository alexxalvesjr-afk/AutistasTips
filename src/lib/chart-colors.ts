/**
 * Cores de dados (status semânticos de aposta, não séries categóricas):
 * teal = ganho, vermelho = perda, cinza = neutro. Nunca usadas sem
 * rótulo/legenda ao lado (regra de acessibilidade para daltonismo).
 */
export const chartColors = {
  positive: "#12a594",
  positiveSoft: "#7ce0d3",
  negative: "#dc3d43",
  negativeSoft: "#f76e7f",
  neutral: "#8d8d99",
  line: "#e5484d",
  grid: "hsl(240 4% 16%)",
  axis: "hsl(240 4% 58%)",
} as const;

export const resultColors: Record<string, string> = {
  WIN: chartColors.positive,
  HALF_WIN: chartColors.positiveSoft,
  VOID: chartColors.neutral,
  HALF_LOSS: chartColors.negativeSoft,
  LOSS: chartColors.negative,
  PENDING: "#5b5bd6",
};

export const resultLabels: Record<string, string> = {
  WIN: "Win",
  HALF_WIN: "Half Win",
  VOID: "Void",
  HALF_LOSS: "Half Loss",
  LOSS: "Loss",
  PENDING: "Pendente",
};

export function profitColor(value: number): string {
  if (value > 0) return chartColors.positive;
  if (value < 0) return chartColors.negative;
  return chartColors.neutral;
}
