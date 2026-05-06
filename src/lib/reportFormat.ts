export const formatRupiah = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
};

export const formatNumber = (n: number | null | undefined): string =>
  Number(n ?? 0).toLocaleString("id-ID");

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const formatDateID = (input: string | Date | null | undefined): string => {
  if (!input) return "-";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatDateTimeID = (input: string | Date | null | undefined): string => {
  if (!input) return "-";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateID(d)} ${hh}:${mm}`;
};

export const fileStamp = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export const percent = (n: number, total: number): string => {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
};