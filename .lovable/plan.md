Di `src/components/mobile/home/PopularServices.tsx`, `useEffect` yang memanggil `endRef.scrollIntoView({ block: "end" })` ikut jalan pada render pertama saat `messages` masih kosong. Karena `endRef` berada jauh di bawah halaman (di dalam section Konsultasi Online), browser memaksa scroll window ke bawah — sehingga setelah refresh tampilan pertama yang muncul adalah seperti screenshot #1 (hero hilang, header kosong, halaman berhenti di booking form / chat), bukan paling atas seperti screenshot #2.

Perbaikan: tambahkan early-return di efek tersebut agar tidak scroll saat belum ada pesan dan tidak sedang loading.

```ts
useEffect(() => {
  if (messages.length === 0 && !loading) return;
  endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages, loading]);
```

Perilaku auto-scroll ke pesan baru saat user benar-benar chatting tetap berfungsi. Tidak ada perubahan lain.