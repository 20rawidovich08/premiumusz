// Generic CSV export helper. Converts an array of plain objects to CSV
// and triggers a browser download. No external dependency.
export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  // Prepend BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
