/**
 * Minimal CSV utilities. Uses RFC 4180 quoting (double-quote escaping) and
 * prepends the UTF-8 BOM so Excel opens accented characters correctly.
 */

const needsQuote = /[",\n\r;]/;

function escape(cell: unknown): string {
  const s = cell == null ? "" : String(cell);
  if (!needsQuote.test(s)) return s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((r) => r.map(escape).join(",")).join("\r\n");
}

/** Trigger a browser download for the given CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
