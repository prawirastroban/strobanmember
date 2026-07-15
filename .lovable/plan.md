## Tujuan

Tambahkan tombol **"Lewati & Lanjut"** di bawah setiap Textarea di SPK Canvas. Muncul saat textarea kosong (tidak ada catatan / part replacement), sehingga user bisa langsung loncat ke section berikutnya tanpa mengetik apa-apa.

## Komponen baru

**`src/components/spk/canvas/SkipToNextButton.tsx`**
- Props: `sectionId: string`, `show: boolean`.
- Membaca `useSPKUXSafe()` untuk mengambil daftar `sections` dan helper `jumpTo`.
- Menghitung `next = sections[currentIndex + 1]` dari `sectionId` yang diberikan.
- Jika `!show` atau tidak ada `next` → render `null`.
- Render tombol kecil ghost: label "Lewati & lanjut ke {next.label}" + icon `ArrowRight`. Menempel di kanan (justify-end), tinggi `min-h-tap`, warna muted → hover primary.
- On click: panggil `ux.jumpTo(next.id)`.

## Tempat pemasangan (semua Textarea di canvas)

Tambahkan `<SkipToNextButton sectionId="sec-…" show={value.trim().length === 0} />` tepat setelah masing-masing `<Textarea>`:

| File | Textarea | sectionId | show |
| --- | --- | --- | --- |
| `ComplaintCard.tsx` | complaint_note | `sec-complaint` | `!note.trim()` |
| `ServiceOrderCard.tsx` | service_others | `sec-service-order` | `!others.trim()` |
| `InspectionSuspensionCard.tsx` | insp_suspension_part_replacement (textarea line 28) | `sec-suspension` | `!parts.trim()` |
| `InspectionEngineCard.tsx` | engine_service_lainnya (textarea line 87) | `sec-engine` | `!value.trim()` |
| `ACCheckCard.tsx` | ac_remarks (textarea line 36) | `sec-ac` | `!value.trim()` |
| `MechanicNotesCard.tsx` | mechanic_note (line 19) | `sec-notes` | `!note.trim()` |
| `MechanicNotesCard.tsx` | mechanic_catatan_jeda (line 31) | `sec-notes` | `!pause.trim()` |

Untuk MechanicNotesCard yang punya dua textarea di section yang sama, tombol muncul di masing-masing textarea; keduanya menuju section berikutnya (`sec-time`). Aman: klik satu → langsung loncat.

## Yang **tidak** berubah

- Runtime binding, autosave, workflow, role profiles.
- Auto-collapse/auto-scroll di `SPKUXContext` — tetap berjalan begitu section jadi "complete" via required fields. Tombol ini murni escape hatch untuk textarea opsional.
- Tidak menambah state, tidak menyentuh DB.

## Verifikasi

- Buka SPK di `/spk/:id` → gulung ke section Complaint, kosongkan textarea → tombol muncul; ketik 1 huruf → tombol hilang.
- Klik tombol → scroll halus ke section berikutnya sesuai urutan `SECTIONS`.
- Uji di 5 section mekanik + 2 admin — semua muncul konsisten.
