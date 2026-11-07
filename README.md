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

## Menambahkan logo sekolah

Logo disimpan pada sheet tersembunyi `ASSET`, sel `A2`.

1. Jalankan `setupAwal()` satu kali jika sheet `ASSET` belum ada.
2. Di Google Sheets, buka **View → Hidden sheets → ASSET**.
3. Siapkan logo PNG dengan ukuran file kecil, lalu ubah menjadi Base64. Di Windows PowerShell:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("logo.png")) | Set-Clipboard
   ```

4. Tempel hasil Base64 ke `ASSET!A2`. Jangan menambahkan awalan `data:image/png;base64,`.
5. Biarkan `ASSET!A1` tetap bernilai `logo_base64`, lalu sembunyikan kembali sheet tersebut.

Ukuran Base64 dibatasi sekitar 50.000 karakter. Logo pada `ASSET!A2` menjadi prioritas; `Logo.gs` hanya menjadi logo cadangan jika sel tersebut kosong.

## Pengujian lokal

```bash
node tes_ruang.js
```

File pada folder `test/` adalah pengujian tampilan dengan data contoh sintetis, bukan data siswa asli.
