/**
 * Sanitização de entrada: remove caracteres de controle e espaços
 * excedentes. A defesa principal contra XSS é o escape automático do
 * React na renderização — aqui garantimos dados limpos no banco.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
}

/** Variante que preserva quebras de linha (observações, textos longos). */
export function sanitizeMultiline(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

/**
 * Prefixos que fazem planilhas interpretarem células como fórmula.
 * Neutraliza CSV/Excel injection na exportação (OWASP CSV Injection).
 */
export function escapeSpreadsheetCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}
