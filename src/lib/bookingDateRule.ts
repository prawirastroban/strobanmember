/**
 * Rule: status check_in / in_progress / completed hanya boleh di-set
 * jika tanggal booking sudah tiba (hari ini atau sebelumnya).
 */

const RESTRICTED_STATUSES = ["checked_in", "in_progress", "completed"] as const;

/**
 * Bandingkan dua tanggal hanya pada bagian Y-M-D, lokal device.
 * Mengembalikan true jika `bookingDate` <= today.
 */
export const isBookingDateReached = (bookingDate: string): boolean => {
  if (!bookingDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bd = new Date(bookingDate + "T00:00:00");
  bd.setHours(0, 0, 0, 0);
  return bd.getTime() <= today.getTime();
};

export const isStatusRestricted = (status: string): boolean =>
  (RESTRICTED_STATUSES as readonly string[]).includes(status);

/**
 * @returns true jika transisi `targetStatus` boleh dilakukan untuk booking
 * dengan tanggal `bookingDate`. False = harus diblok.
 */
export const canMoveToStatus = (
  targetStatus: string,
  bookingDate: string
): boolean => {
  if (!isStatusRestricted(targetStatus)) return true;
  return isBookingDateReached(bookingDate);
};

export const formatBookingDate = (bookingDate: string): string => {
  try {
    return new Date(bookingDate + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return bookingDate;
  }
};

export const restrictedReasonMessage = (bookingDate: string): string =>
  `Bookingan baru bisa dilanjutkan ke Check-In, Sedang Dikerjakan, atau Selesai pada tanggal ${formatBookingDate(
    bookingDate
  )}. Saat ini tanggal booking belum tiba.`;