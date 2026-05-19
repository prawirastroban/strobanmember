# Perbaiki Edit Cabang Penempatan (Ubah Role)

## Masalah
Saat membuka kembali dialog **Ubah Role** untuk user yang sudah ber-role `admin_cabang` di `src/components/admin/CustomerList.tsx`:

1. Dropdown **Cabang Penempatan** muncul kosong — `newBranch` tidak di-prefill dari `assigned_branch` user.
2. Tombol **Simpan Role** dinonaktifkan saat `newRole === current role`, sehingga **tidak bisa hanya mengganti cabang** tanpa mengganti role.
3. Setelah simpan sukses, baris di tabel tidak ikut ter-update `assigned_branch`-nya (perlu refresh).

## Perubahan (hanya 1 file: `src/components/admin/CustomerList.tsx`)

### 1. Prefill cabang saat membuka dialog
Di handler dropdown "Ubah Role" (~line 411-418), set juga `newBranch` dari `c.assigned_branch`:
```ts
setNewRole(c.role);
setNewBranch(c.assigned_branch || "");
setRoleChangeDialog(c);
```

### 2. Izinkan simpan ketika cabang berubah
Ubah `disabled` di tombol Simpan Role (~line 883) supaya tetap aktif jika role sama tapi cabang berbeda:
```ts
disabled={
  isChangingRole ||
  (newRole === roleChangeDialog?.role &&
   (newRole !== "admin_cabang" || newBranch === (roleChangeDialog?.assigned_branch || "")))
}
```

### 3. Update state lokal `assigned_branch` setelah sukses
Di `handleChangeRole` (~line 265), perbarui juga `assigned_branch` pada baris customer:
```ts
setCustomers((prev) => prev.map((c) =>
  c.id === roleChangeDialog.id
    ? { ...c, role: newRole, assigned_branch: newRole === "admin_cabang" ? newBranch : null }
    : c
));
```

### 4. Reset `newBranch` saat dialog ditutup via tombol Batal/overlay
Sudah ada — tidak perlu perubahan.

## Catatan
- Edge function `admin-user-ops` (`set_role`) sudah menerima `assignedBranch` dan menyimpannya ke `profiles.assigned_branch`, jadi tidak perlu perubahan backend.
- Tidak ada perubahan skema database atau RLS.
