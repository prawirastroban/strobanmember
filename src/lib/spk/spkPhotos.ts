// Lampiran foto SPK (foto formulir kertas, bukti keluhan, temuan mekanik).
// Disimpan di bucket privat `spk-photos`; URL dibuat sebagai signed URL
// berumur panjang agar bisa dibuka lewat link share / QR tanpa login.
import { supabase } from "@/integrations/supabase/client";

export interface SpkPhoto {
  url: string;
  path: string;
  uploaded_at: string;
  uploaded_by_name?: string;
}

export const SPK_PHOTO_BUCKET = "spk-photos";
export const SPK_PHOTO_MAX_BYTES = 8 * 1024 * 1024; // 8MB sebelum kompresi
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // ~5 tahun

/** Resize sisi terpanjang ke maks 1600px & encode JPEG q0.8. */
export async function compressToJpegBlob(file: File): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Gagal memuat gambar"));
    el.src = dataUrl;
  });
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8),
  );
  return blob ?? file;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(body ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function putBlob(
  blob: Blob,
  folder: string,
  uploadedByName?: string,
): Promise<SpkPhoto> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(SPK_PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data: signed, error: signErr } = await supabase.storage
    .from(SPK_PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Gagal membuat URL foto");
  return {
    url: signed.signedUrl,
    path,
    uploaded_at: new Date().toISOString(),
    uploaded_by_name: uploadedByName,
  };
}

/** Folder tujuan: pakai id SPK bila sudah ada, jika belum pakai folder intake. */
export function spkPhotoFolder(spkId?: string | null) {
  return spkId ? `spk/${spkId}` : `intake/${new Date().toISOString().slice(0, 10)}`;
}

export async function uploadSpkPhoto(
  file: File,
  opts: { spkId?: string | null; uploadedByName?: string } = {},
): Promise<SpkPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar");
  if (file.size > SPK_PHOTO_MAX_BYTES) throw new Error("Ukuran foto maksimal 8MB");
  const blob = await compressToJpegBlob(file);
  return putBlob(blob, spkPhotoFolder(opts.spkId), opts.uploadedByName);
}

/** Simpan hasil kompresi Scan SPK (data URL) sebagai lampiran foto SPK asli. */
export async function uploadSpkPhotoFromDataUrl(
  dataUrl: string,
  opts: { spkId?: string | null; uploadedByName?: string } = {},
): Promise<SpkPhoto> {
  return putBlob(dataUrlToBlob(dataUrl), spkPhotoFolder(opts.spkId), opts.uploadedByName);
}

export async function deleteSpkPhoto(path: string): Promise<void> {
  await supabase.storage.from(SPK_PHOTO_BUCKET).remove([path]);
}

/** Normalisasi nilai dari `spk_orders.data` menjadi array SpkPhoto. */
export function normalizeSpkPhotos(raw: unknown): SpkPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, path: "", uploaded_at: "" } as SpkPhoto;
      }
      if (item && typeof item === "object" && typeof (item as any).url === "string") {
        const o = item as any;
        return {
          url: o.url,
          path: typeof o.path === "string" ? o.path : "",
          uploaded_at: typeof o.uploaded_at === "string" ? o.uploaded_at : "",
          uploaded_by_name:
            typeof o.uploaded_by_name === "string" ? o.uploaded_by_name : undefined,
        } as SpkPhoto;
      }
      return null;
    })
    .filter(Boolean) as SpkPhoto[];
}
