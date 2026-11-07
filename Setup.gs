const HEADER_SISWA = ['induk', 'nama', 'lp', 'kelas', 'tingkat', 'nomor_peserta', 'ruang', 'urut_di_ruang', 'sisi'];
const HEADER_RUANG = ['no_ruang', 'tingkat_kiri', 'jumlah_kiri', 'tingkat_kanan', 'jumlah_kanan', 'pengawas'];
const HEADER_JADWAL = ['urutan', 'tanggal', 'jam_mulai', 'jam_selesai', 'mapel', 'singkatan', 'tingkat'];

function setupAwal() {
  try {
    const ss = SpreadsheetApp.getActive();
    const config = _ensureSheet(ss, 'CONFIG', ['Pengaturan', 'Nilai']);
    _seedConfig(config);
    const siswa = _ensureSheet(ss, 'SISWA', HEADER_SISWA);
    _ensureSheet(ss, 'RUANG', HEADER_RUANG);
    const jadwal = _ensureSheet(ss, 'JADWAL', HEADER_JADWAL);
    _seedJadwal(jadwal);
    const asset = _ensureSheet(ss, 'ASSET', ['logo_base64']);
    _seedLogo(asset);
    asset.hideSheet();

    siswa.getRange('A:A').setNumberFormat('@');
    siswa.getRange('D:F').setNumberFormat('@');
    [config, siswa, ss.getSheetByName('RUANG'), jadwal, asset].forEach(_protectHeader);
    ss.toast('Setup selesai. Tempel data ke SISWA kolom induk, nama, lp, kelas.', 'Aplikasi Ujian', 6);
    return 'Setup selesai.';
  } catch (error) {
    throw new Error('Setup awal gagal: ' + error.message);
  }
}

function _ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const first = ss.getSheets().length === 1 ? ss.getSheets()[0] : null;
    if (first && first.getLastRow() === 0 && first.getLastColumn() === 0) {
      sheet = first.setName(name);
    } else {
      sheet = ss.insertSheet(name);
    }
  }
  const row = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (row.every(value => value === '')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (headers.some((header, index) => row[index] !== header)) {
    throw new Error('Header sheet ' + name + ' tidak sesuai. Data tidak diubah.');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function _protectHeader(sheet) {
  const description = 'Header aplikasi - ' + sheet.getName();
  const exists = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .some(protection => protection.getDescription() === description);
  if (!exists) {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect()
      .setDescription(description);
  }
}

function _seedConfig(sheet) {
  const defaults = [
    ['nama_sekolah', 'SMP NEGERI 3 KOTA SERANG'],
    ['alamat_sekolah', 'Jl. Ki Sahal No. 3, Lopang - Serang, Kota Serang 42113'],
    ['nama_ujian', 'Penilaian Sumatif Akhir Tahun'],
    ['tahun_pelajaran', '2025/2026'],
    ['mode_tingkat', '7-8'],
    ['tanggal_cetak', ''],
    ['kota', 'Serang'],
    ['jabatan_kepala_sekolah', 'PLT Kepala Sekolah'],
    ['nama_kepala_sekolah', 'Isi Nama Kepala Sekolah'],
    ['nip_kepala_sekolah', ''],
    ['ttd_kepala_data_uri', ''],
    ['pola_kursi', '1'],
    ['arah_mulai', 'kiri-depan'],
    ['preset_denah', '4x5'],
    ['baris_denah', '5'],
    ['kolom_meja', '4'],
    ['kursi_per_meja', '2'],
    ['orientasi_daftar_hadir', 'landscape'],
    ['halaman_kartu_cadangan', '2']
  ];
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat()
    : [];
  const missing = defaults.filter(([key]) => !existing.includes(key));
  if (missing.length) sheet.getRange(lastRow + 1, 1, missing.length, 2).setValues(missing);
}

function _simpanConfigEntries(values) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('CONFIG');
  if (!sheet) throw new Error('Sheet CONFIG belum tersedia. Jalankan Setup awal.');
  const lastRow = sheet.getLastRow();
  const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
  const rowByKey = new Map(rows.map((row, index) => [String(row[0]), index]));
  const missing = [];
  Object.entries(values).forEach(([key, value]) => {
    const index = rowByKey.get(key);
    if (index === undefined) missing.push([key, value]);
    else rows[index][1] = value;
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  if (missing.length) sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, 2).setValues(missing);
}

function _seedJadwal(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 10, 7).setValues([
    [1, 'Senin, 20 April 2026', '07.30', '09.30', 'Bahasa Indonesia', 'B. Indo', ''],
    [2, 'Senin, 20 April 2026', '10.00', '11.30', 'Pendidikan Pancasila', 'Pancasila', ''],
    [3, 'Selasa, 21 April 2026', '07.30', '09.00', 'Matematika', 'MTK', ''],
    [4, 'Selasa, 21 April 2026', '09.30', '11.30', 'PABP', 'PABP', ''],
    [5, 'Rabu, 22 April 2026', '07.30', '09.00', 'Bahasa Inggris', 'B. Ing', ''],
    [6, 'Rabu, 22 April 2026', '09.30', '11.30', 'Informatika', 'Info', ''],
    [7, 'Kamis, 23 April 2026', '07.30', '09.00', 'IPS', 'IPS', ''],
    [8, 'Kamis, 23 April 2026', '09.30', '11.30', 'PJOK', 'PJOK', ''],
    [9, "Jum'at, 24 April 2026", '07.30', '09.00', 'IPA', 'IPA', ''],
    [10, "Jum'at, 24 April 2026", '09.30', '11.30', 'Prakarya', 'Prakarya', '']
  ]);
}
