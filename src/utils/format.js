export const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);

export const date = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  if (isMobile) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};

export const display = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return value.name || value.title || value.studentId || value.code || "-";
  if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
  return String(value);
};
