function getDataMulai() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('CONFIG');
  if (!sheet) throw new Error('Sheet CONFIG belum tersedia. Jalankan Setup awal.');
  const lastRow = sheet.getLastRow();
  const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues() : [];
  const config = Object.fromEntries(rows.map(([key, value]) => [key, value]));
  const mode = config.mode_tingkat || '7-8';
  _tingkatMode(mode);
  return {
    mode,
    namaUjian: config.nama_ujian || 'Penilaian Sumatif Akhir Tahun',
    tahunPelajaran: config.tahun_pelajaran || ''
  };
}

function simpanMulai(data) {
  const mode = data && data.mode;
  _tingkatMode(mode);
  const namaUjian = String(data.namaUjian || '').trim();
  const tahunPelajaran = String(data.tahunPelajaran || '').trim();
  if (!namaUjian || !tahunPelajaran) throw new Error('Nama ujian dan tahun pelajaran wajib diisi.');
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('Pengaturan ujian sedang diproses. Coba lagi sebentar.');
  try {
    _simpanConfigEntries({ mode_tingkat: mode, nama_ujian: namaUjian, tahun_pelajaran: tahunPelajaran });
    return { saved: true };
  } catch (error) {
    throw new Error('Pilihan ujian gagal disimpan: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

function validasiDanRapikanSiswa() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('Data sedang diproses. Coba lagi sebentar.');
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('SISWA');
    if (!sheet) throw new Error('Sheet SISWA belum tersedia. Jalankan Setup awal dari menu Aplikasi Ujian.');
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) throw new Error('Header SISWA belum tersedia. Jalankan Setup awal terlebih dahulu.');
    const headers = sheet.getRange(1, 1, 1, HEADER_SISWA.length).getDisplayValues()[0];
    const rows = sheet.getRange(1, 1, lastRow, 5).getDisplayValues();
    if (HEADER_SISWA.some((header, index) => headers[index] !== header)) {
      throw new Error('Header SISWA tidak sesuai. Data tidak diubah.');
    }

    const seen = new Map();
    const issues = [];
    const fixes = [];
    const counts = {};
    const byClass = {};
    const changed = rows.slice(1).map((row, index) => {
      const sheetRow = index + 2;
      if (row.slice(0, 4).every(value => value.trim() === '')) {
        row[4] = '';
        return { row, sheetRow, messages: [] };
      }
      const messages = [];
      let [induk, nama, lp, kelas] = row;
      const original = [induk, nama, lp, kelas];
      induk = induk.trim();
      nama = nama.trim().replace(/\s+/g, ' ');
      lp = lp.trim().toUpperCase();
      kelas = kelas.trim().toUpperCase().replace(/\s+/g, '');

      if (!induk) messages.push('Nomor induk kosong.');
      if (/\d+(?:\.\d+)?E[+-]?\d+/i.test(induk)) messages.push('Nomor induk terbaca sebagai notasi ilmiah; periksa sumber data.');
      if (/^\d{9}$/.test(induk)) messages.push('Nomor induk 9 digit perlu diperiksa; aplikasi tidak menambahkan nol otomatis.');
      if (!nama) messages.push('Nama kosong.');
      if (lp !== 'L' && lp !== 'P') messages.push('Jenis kelamin harus L atau P.');
      const match = kelas.match(/^([789])([A-J])$/);
      if (!match) messages.push('Kelas tidak dikenal: ' + (kelas || '(kosong)') + '.');
      if (induk && seen.has(induk)) messages.push('Nomor induk ganda dengan baris ' + seen.get(induk) + '.');
      if (induk && !seen.has(induk)) seen.set(induk, sheetRow);

      const fixed = [induk, nama, lp, kelas];
      fixed.forEach((value, column) => {
        if (value !== original[column]) fixes.push({ row: sheetRow, field: HEADER_SISWA[column], before: original[column], after: value });
      });
      if (match) {
        row[4] = match[1];
        counts[match[1]] = (counts[match[1]] || 0) + 1;
        byClass[kelas] = (byClass[kelas] || 0) + 1;
      }
      row.splice(0, 4, ...fixed);
      return { row, sheetRow, messages };
    });

    if (changed.length) {
      sheet.getRange(2, 1, changed.length, 5).setValues(changed.map(item => item.row));
      const backgrounds = changed.map(item => {
        if (item.messages.length) {
          issues.push({ row: item.sheetRow, messages: item.messages });
        }
        return Array(HEADER_SISWA.length).fill(item.messages.length ? '#fef7e0' : null);
      });
      sheet.getRange(2, 1, changed.length, HEADER_SISWA.length).setBackgrounds(backgrounds);
    }
    return {
      total: changed.filter(item => item.row.slice(0, 4).some(value => value !== '')).length,
      counts,
      byClass,
      fixes,
      issues,
      valid: issues.length === 0
    };
  } catch (error) {
    throw new Error('Validasi siswa gagal: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}
