export interface PromoLike {
  id: string;
  title: string;
  discount_type: string; // "percentage" | "fixed"
  discount_value: number;
}

export function computeDiscount(promo: PromoLike | null | undefined, basePrice: number) {
  if (!promo || !basePrice || basePrice <= 0) {
    return { discount: 0, finalPrice: basePrice, label: "" };
  }
  let raw = 0;
  if (promo.discount_type === "percentage") {
    raw = (basePrice * Number(promo.discount_value || 0)) / 100;
  } else {
    raw = Number(promo.discount_value || 0);
  }
  const discount = Math.max(0, Math.min(Math.floor(raw), basePrice));
  const finalPrice = Math.max(0, basePrice - discount);
  const label =
    promo.discount_type === "percentage"
      ? `${promo.discount_value}%`
      : `Rp ${Number(promo.discount_value).toLocaleString("id-ID")}`;
  return { discount, finalPrice, label };
}

export function formatRp(n: number) {
  return `Rp ${Math.max(0, Math.floor(n)).toLocaleString("id-ID")}`;
}