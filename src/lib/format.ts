export const euro = (n: number): string =>
  "€" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const euroExact = (n: number): string =>
  "€" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const signedEuro = (n: number): string =>
  (n >= 0 ? "+" : "") + "€" + Math.abs(n).toLocaleString("en-US");
