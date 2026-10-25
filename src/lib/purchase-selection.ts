export const starsPurchaseUrl = (amount: number) => `/stars?amount=${amount}`;

export const readStarsAmount = (value: string | null, minimum = 50) => {
  if (!value || !/^\d+$/.test(value)) return Math.max(100, minimum);
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= minimum ? amount : Math.max(100, minimum);
};

export const safeReturnPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/profile";
  try {
    const parsed = new URL(value, "https://store.invalid");
    if (parsed.origin !== "https://store.invalid" || parsed.pathname === "/auth" || parsed.pathname.startsWith("/admin")) return "/profile";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/profile";
  }
};

export const signInUrl = (path: string) => `/auth?next=${encodeURIComponent(safeReturnPath(path))}`;