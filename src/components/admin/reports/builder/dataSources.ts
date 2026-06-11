/**
 * Whitelist of data sources for the Custom Report Builder.
 * Only fields listed here can be selected as dimensions/measures/filters.
 */
export type FieldKind = "string" | "number" | "date" | "datetime" | "boolean";

export interface DSField {
  key: string;
  label: string;
  kind: FieldKind;
  /** True if can be summed/averaged. */
  measure?: boolean;
}

export interface DataSource {
  id: string;
  label: string;
  table: string;
  /** Date column used for the period filter. */
  dateField: string;
  /** Whether this source has a `branch` column for branch filter. */
  hasBranch?: boolean;
  fields: DSField[];
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "bookings",
    label: "Booking",
    table: "bookings",
    dateField: "booking_date",
    hasBranch: true,
    fields: [
      { key: "booking_date", label: "Tanggal", kind: "date" },
      { key: "branch", label: "Cabang", kind: "string" },
      { key: "service_name", label: "Layanan", kind: "string" },
      { key: "status", label: "Status", kind: "string" },
      { key: "customer_name", label: "Customer", kind: "string" },
      { key: "car_type", label: "Tipe Kendaraan", kind: "string" },
      { key: "service_price", label: "Harga Layanan", kind: "number", measure: true },
    ],
  },
  {
    id: "payments",
    label: "Pembayaran",
    table: "payments",
    dateField: "created_at",
    fields: [
      { key: "created_at", label: "Tanggal", kind: "datetime" },
      { key: "payment_method", label: "Metode", kind: "string" },
      { key: "payment_status", label: "Status", kind: "string" },
      { key: "amount", label: "Nilai", kind: "number", measure: true },
    ],
  },
  {
    id: "promo_claims",
    label: "Klaim Promo",
    table: "promo_claims",
    dateField: "claimed_at",
    fields: [
      { key: "claimed_at", label: "Tanggal", kind: "datetime" },
      { key: "promo_code", label: "Kode Promo", kind: "string" },
      { key: "discount_amount", label: "Diskon", kind: "number", measure: true },
    ],
  },
  {
    id: "loyalty_transactions",
    label: "Loyalty",
    table: "loyalty_transactions",
    dateField: "created_at",
    fields: [
      { key: "created_at", label: "Tanggal", kind: "datetime" },
      { key: "transaction_type", label: "Tipe", kind: "string" },
      { key: "points", label: "Point", kind: "number", measure: true },
    ],
  },
  {
    id: "referral_commissions",
    label: "Referral",
    table: "referral_commissions",
    dateField: "created_at",
    fields: [
      { key: "created_at", label: "Tanggal", kind: "datetime" },
      { key: "referrer_id", label: "Referrer", kind: "string" },
      { key: "commission_amount", label: "Komisi", kind: "number", measure: true },
    ],
  },
  {
    id: "profiles",
    label: "Customer (Profiles)",
    table: "profiles",
    dateField: "created_at",
    fields: [
      { key: "created_at", label: "Tanggal Daftar", kind: "datetime" },
      { key: "is_verified", label: "Verified", kind: "boolean" },
    ],
  },
  {
    id: "tire_orders",
    label: "Order Ban",
    table: "tire_orders",
    dateField: "created_at",
    fields: [
      { key: "created_at", label: "Tanggal", kind: "datetime" },
      { key: "brand", label: "Brand", kind: "string" },
      { key: "size", label: "Ukuran", kind: "string" },
      { key: "pattern", label: "Pattern", kind: "string" },
      { key: "status", label: "Status", kind: "string" },
      { key: "qty", label: "Qty", kind: "number", measure: true },
      { key: "total_price", label: "Total", kind: "number", measure: true },
    ],
  },
];

export const getDataSource = (id: string) => DATA_SOURCES.find((d) => d.id === id);

export const BUILDER_ROW_LIMIT = 10000;