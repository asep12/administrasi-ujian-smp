# Administrasi Ujian SMP

Template Google Apps Script untuk administrasi ujian sekolah:

- validasi data siswa;
- pembagian ruang;
- denah tempat duduk dengan empat pola;
- kartu peserta dan kartu cadangan;
- daftar peserta per ruangan;
- daftar hadir per mata pelajaran.

## Menjalankan

1. Buat project Google Apps Script dan salin file `.gs`, `.html`, serta `appsscript.json`.
2. Jalankan `setupAwal()` dari editor Apps Script.
3. Isi data pada sheet `CONFIG`, `SISWA`, `RUANG`, dan `JADWAL`.
4. Deploy sebagai Web app.

File data sekolah, konfigurasi deployment, dan aset lokal sengaja tidak disertakan dalam repository ini.

## Mengganti logo sekolah

Logo utama aplikasi berada di file `Logo.gs`, pada baris:

```javascript
const LOGO_SEKOLAH_BASE64 = '...';
```

Logo bawaan ini sengaja tetap menjadi sumber utama agar logo aplikasi tidak berubah hanya karena isi sheet `ASSET` berbeda. Sheet `ASSET!A2` hanya menjadi cadangan.

### Cara mengubah gambar menjadi Base64 di Windows

1. Siapkan gambar logo dalam format **PNG**. JPG juga bisa, tetapi PNG lebih baik untuk logo karena latar transparan tetap terjaga.
2. Letakkan file, misalnya `logo.png`, di Desktop.
3. Buka **PowerShell**: tekan tombol Windows, ketik `PowerShell`, lalu buka aplikasinya.
4. Jalankan perintah ini. Ganti bagian path jika lokasi file berbeda:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\Desktop\logo.png")) | Set-Clipboard
   ```

   Perintah tersebut membaca file `logo.png`, mengubahnya menjadi teks Base64, lalu menyalin teks itu ke Clipboard. Tidak mengirim file ke internet.

5. Buka `Logo.gs` di project Apps Script.
6. Pada `const LOGO_SEKOLAH_BASE64`, hapus **hanya teks panjang di antara tanda kutip**, lalu tekan `Ctrl+V` untuk menempel Base64 baru. Jangan menghapus `const`, nama variabel, tanda kutip, atau titik koma.
7. Simpan, push, dan deploy versi baru Apps Script.

### Batas ukuran logo

- **Maksimal:** sekitar **37 KB ukuran file asli**, agar hasil Base64 tetap di bawah batas sekitar **50.000 karakter**.
- **Minimal:** tidak ada batas teknis, tetapi gunakan minimal sekitar **300×300 piksel** agar logo tidak pecah saat dicetak.
- Rekomendasi praktis: PNG transparan, lebar/tinggi **500–1200 piksel**, ukuran file **10–30 KB**.

Jika hasil terlalu besar, kecilkan dimensi atau kompres gambar terlebih dahulu. Jangan menambahkan awalan `data:image/png;base64,` ke nilai Base64.

## Pengujian lokal

```bash
node tes_ruang.js
```

File pada folder `test/` adalah pengujian tampilan dengan data contoh sintetis, bukan data siswa asli.
