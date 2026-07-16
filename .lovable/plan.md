## Root cause

Race condition di `src/hooks/spk/FormRuntimeProvider.tsx` (baris 116–127):

```ts
const initialValuesSignature = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);
useEffect(() => {
  if (!initialValues) return;
  setValues((prev) => ({ ...prev, ...initialValues })); // ← initialValues menang
  setIssues({});
}, [initialValuesSignature]);
```

Flow bug:
1. User klik `GOOD` → `values.chk_engine_oil_cond = "good"`.
2. Autosave debounce 500ms → `UPDATE spk_orders` → `onSaved(nextData)` → `setSpkRow({...r, data: nextData})`.
3. `initialValues` (memo dari `spkRow`) recompute → signature berubah → effect di atas jalan.
4. Kalau di antara langkah 2–3 user sudah klik `OK`, `values.chk_engine_oil_cond = "ok"` sudah di runtime, TAPI `initialValues` yang datang dari DB masih `"good"` (belum sempat di-save). Merge `{...prev, ...initialValues}` → `"good"` menang → tombol tampak "kosong lagi" / mundur.

Efeknya muncul intermittently pada klik cepat, konsisten dengan laporan tim QA.

## Fix (small, surgical, presentation-layer only)

### 1. `src/hooks/spk/FormRuntimeProvider.tsx` — hydrate hanya sekali per SPK

Ganti effect hydration supaya:
- Snapshot pertama dari `initialValues` yang non-empty di-seed sekali (menghandle case awal ketika `spkRow` belum load).
- Update `initialValues` berikutnya (yang berasal dari echo autosave/realtime) **tidak** meng-overwrite key yang sudah ada di `values`. Hanya tambahkan key baru yang belum diketahui runtime (mis. server-side field baru).

Pseudo-code:
```ts
const hydratedRef = useRef(false);
useEffect(() => {
  if (!initialValues) return;
  setValues((prev) => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return { ...initialValues, ...prev }; // hydrate awal, edit lokal (jika ada) menang
    }
    // Merge non-destruktif: hanya isi key yang belum ada di runtime
    const next = { ...prev };
    for (const [k, v] of Object.entries(initialValues)) {
      if (!(k in prev)) next[k] = v;
    }
    return next;
  });
}, [initialValuesSignature]);
```

Ini aman karena:
- Autosave sudah punya `PROTECTED_KEYS` untuk field customer/approval — tidak ada masalah dengan signature customer.
- Field canvas (kondisi GOOD/OK/BAD, catatan, tyre, dsb.) hanya ditulis oleh user aktif di device ini, jadi runtime state adalah source of truth begitu sudah ter-hydrate.

### 2. Bonus stabilitas — `OkNotToggle` (Section legacy)

`OkNotToggle` sudah `e.preventDefault(); e.stopPropagation();` — tidak diubah.

Tidak ada perubahan di:
- `ConditionRow.tsx`
- `LampsRow.tsx`
- `TyreCheckPanel.tsx`
- `useSPKAutosave.ts`
- `SPKCanvas.tsx`

## Verifikasi

Setelah patch:
1. Buka `/spk/<id>` sebagai mekanik.
2. Klik cepat GOOD → OK → BAD di beberapa baris berurutan (< 2 detik).
3. Pastikan tombol yang terakhir dipilih tetap aktif setelah indikator autosave menampilkan "Tersimpan".
4. Reload halaman — pilihan terakhir tetap muncul (autosave tetap bekerja).
5. Buka Network tab: `spk_orders` update tetap terkirim, tidak ada regresi.

## Scope

- 1 file diubah: `src/hooks/spk/FormRuntimeProvider.tsx` (efek hydration di baris 120–127).
- Tidak ada perubahan backend, schema, atau visual.
