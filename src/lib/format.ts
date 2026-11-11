const NBSP = " ";

export function formatUzs(amount: number, locale: string): string {
  const grouped = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${grouped}${NBSP}${locale === "uz" ? "so'm" : "сум"}`;
}

export const localized = (locale: string, ru: string, uz: string) => (locale === "uz" ? uz : ru);
