# Administrasi Ujian SMP

Template Google Apps Script untuk administrasi ujian sekolah:

- validasi data siswa;
- pembagian ruang;
- denah tempat duduk dengan empat pola;
- kartu peserta dan kartu cadangan;
- daftar hadir per mata pelajaran.

## Menjalankan

1. Buat project Google Apps Script dan salin file `.gs`, `.html`, serta `appsscript.json`.
2. Jalankan `setupAwal()` dari editor Apps Script.
3. Isi data pada sheet `CONFIG`, `SISWA`, `RUANG`, dan `JADWAL`.
4. Deploy sebagai Web app.

File data sekolah, konfigurasi deployment, dan aset lokal sengaja tidak disertakan dalam repository ini.

## Pengujian lokal

```bash
node tes_ruang.js
```

File pada folder `test/` adalah pengujian tampilan dengan data contoh sintetis, bukan data siswa asli.
