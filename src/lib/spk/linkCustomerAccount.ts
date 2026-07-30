// Penautan SPK ↔ akun pelanggan + kendaraan.
// Dipakai oleh /spk/new (saat intake) dan kartu Bagikan SPK (penautan susulan).
// Semua operasi privileged dijalankan lewat edge function `admin-user-ops`
// yang sudah mengecek peran admin/staff.
import { invokeAdminUserOps } from "@/lib/adminUserOps";

export interface LinkVehicleInput {
  brand: string;
  model: string;
  year?: string | number | null;
  plate: string;
}

export interface LinkAccountInput {
  fullName: string;
  phone: string;
  vehicle?: LinkVehicleInput | null;
  /** Akun sudah diketahui (mis. dipilih dari daftar pelanggan). */
  existingCustomerId?: string | null;
}

export interface LinkAccountResult {
  customerId: string | null;
  vehicleId: string | null;
  /** Pesan non-fatal (mis. kendaraan gagal disimpan, SPK tetap dibuat). */
  warning: string | null;
}

/** `08123…` / `+62812…` → `62812…` (format yang dipakai backend). */
export function normalizeWaPhone(raw?: string | null): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

/**
 * Pastikan pelanggan punya akun (dibuat bila belum ada, dipakai ulang bila
 * nomor WA-nya sudah terdaftar) dan kendaraannya tersimpan di akun tersebut.
 * Tidak pernah melempar untuk kegagalan kendaraan — kembalikan `warning`
 * supaya pembuatan SPK tetap bisa lanjut.
 */
export async function ensureCustomerAccount(
  input: LinkAccountInput,
): Promise<LinkAccountResult> {
  const fullName = (input.fullName ?? "").trim();
  const phone = normalizeWaPhone(input.phone);
  let customerId = input.existingCustomerId ?? null;
  let warning: string | null = null;

  if (!customerId) {
    if (!fullName || !phone) {
      return {
        customerId: null,
        vehicleId: null,
        warning: "Nama dan nomor WhatsApp pelanggan wajib diisi untuk membuat akun.",
      };
    }
    const res = await invokeAdminUserOps<any>({
      action: "create_customer",
      fullName,
      phone,
    });
    customerId = res?.customer?.id ?? res?.user_id ?? res?.userId ?? null;
    if (!customerId) {
      return {
        customerId: null,
        vehicleId: null,
        warning: "Akun pelanggan gagal dibuat.",
      };
    }
  }

  let vehicleId: string | null = null;
  const v = input.vehicle;
  if (v && v.brand?.trim() && v.plate?.trim()) {
    try {
      const yearNum =
        v.year === null || v.year === undefined || v.year === ""
          ? null
          : Number(String(v.year).replace(/\D/g, "")) || null;
      const res = await invokeAdminUserOps<any>({
        action: "add_vehicle",
        userId: customerId,
        brand: v.brand.trim(),
        model: (v.model || v.brand).trim(),
        year: yearNum,
        license_plate: v.plate.trim().toUpperCase(),
        reuseExisting: true,
      });
      vehicleId = res?.vehicle?.id ?? null;
    } catch (err) {
      warning =
        err instanceof Error ? err.message : "Kendaraan gagal disimpan ke akun pelanggan.";
    }
  }

  return { customerId, vehicleId, warning };
}