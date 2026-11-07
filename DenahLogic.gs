function posisiKursi(n, rows, columns, pattern, direction) {
  if (![rows, columns].every(Number.isSafeInteger) || rows < 1 || columns < 1) {
    throw new Error('Ukuran denah harus berupa bilangan bulat positif.');
  }
  const index = n - 1;
  if (!Number.isInteger(index) || index < 0 || index >= rows * columns) return null;
  let row;
  let col;
  if (pattern === 1 || pattern === 2) {
    row = Math.floor(index / columns);
    col = index % columns;
    if (pattern === 1 && row % 2 === 1) col = columns - 1 - col;
  } else if (pattern === 3 || pattern === 4) {
    col = Math.floor(index / rows);
    row = index % rows;
    if (pattern === 3 && col % 2 === 1) row = rows - 1 - row;
  } else {
    throw new Error('Pola kursi harus bernilai 1 sampai 4.');
  }
  if (direction === 'kanan-depan') col = columns - 1 - col;
  return { row, col };
}

function getDataDenah() {
  try {
    const ss = SpreadsheetApp.getActive();
    const config = _konfigurasiDenah();
    config.logoDataUri = _logoDataUri();
    const roomSheet = ss.getSheetByName('RUANG');
    const studentSheet = ss.getSheetByName('SISWA');
    if (!roomSheet || !studentSheet) throw new Error('Sheet SISWA atau RUANG belum tersedia. Jalankan Setup awal.');

    const roomLastRow = roomSheet.getLastRow();
    const sourceRooms = roomLastRow > 1
      ? roomSheet.getRange(2, 1, roomLastRow - 1, HEADER_RUANG.length).getDisplayValues()
      : [];
    const rooms = sourceRooms.filter(row => row[0] !== '').map(row => ({
      number: Number(row[0]),
      leftLevel: row[1], leftCount: Number(row[2]) || 0,
      rightLevel: row[3], rightCount: Number(row[4]) || 0,
      supervisor: row[5], students: [],
      combined: Boolean(row[1] && row[3]),
      shared: Boolean(row[1] && row[3] && (Number(row[2]) > Math.floor(_kapasitasDenah().single / 2) || Number(row[4]) > Math.floor(_kapasitasDenah().single / 2)))
    }));
    if (!rooms.length) return { valid: false, message: 'Belum ada pembagian ruang. Selesaikan Tahap 2 terlebih dahulu.', config, rooms: [], issues: [] };
    const roomByNumber = new Map();
    const issues = [];
    const capacityIssues = [];
    rooms.forEach(room => {
      if (!Number.isSafeInteger(room.number) || room.number < 1 || roomByNumber.has(room.number)) {
        issues.push('Nomor ruang tidak valid atau ganda: ' + room.number + '.');
      } else roomByNumber.set(room.number, room);
    });

    const studentLastRow = studentSheet.getLastRow();
    const rows = studentLastRow > 1
      ? studentSheet.getRange(2, 1, studentLastRow - 1, HEADER_SISWA.length).getDisplayValues()
      : [];
    const included = new Set(rooms.flatMap(room => [room.leftLevel, room.rightLevel]).filter(Boolean));
    let unassigned = 0;
    rows.forEach((row, index) => {
      const [induk, name, , className, level, participant, roomValue, orderValue, side] = row;
      if (!induk && !name && !className) return;
      const student = { induk, name, className, level, participant, row: index + 2, order: Number(orderValue), side };
      if (!roomValue) {
        if (included.has(level)) unassigned++;
        return;
      }
      const room = roomByNumber.get(Number(roomValue));
      if (!room) {
        issues.push('Baris SISWA ' + (index + 2) + ' merujuk ruang yang tidak ada: ' + roomValue + '.');
        return;
      }
      if (!Number.isSafeInteger(student.order) || student.order < 1 || !['kiri', 'kanan'].includes(side)) {
        issues.push('Urutan kursi atau sisi tidak valid pada baris SISWA ' + (index + 2) + '.');
      }
      if (room.combined && level !== (side === 'kiri' ? room.leftLevel : room.rightLevel)) {
        issues.push('Tingkat atau sisi siswa tidak sesuai pada baris SISWA ' + (index + 2) + '.');
      }
      room.students.push(student);
    });
    if (unassigned) issues.push(unassigned + ' siswa pada tingkat yang dibagi belum memiliki ruang.');

    const sideCapacity = config.rows * config.tables;
    const singleCapacity = sideCapacity * config.seats;
    rooms.forEach(room => {
      const leftStudents = room.students.filter(student => room.combined ? student.side === 'kiri' : true);
      const rightStudents = room.students.filter(student => room.combined && student.side === 'kanan');
      if (room.combined) {
        if (leftStudents.length !== room.leftCount) issues.push('Jumlah siswa sisi kiri ruang ' + room.number + ' tidak sesuai dengan RUANG.');
        if (rightStudents.length !== room.rightCount) issues.push('Jumlah siswa sisi kanan ruang ' + room.number + ' tidak sesuai dengan RUANG.');
        if (room.leftCount + room.rightCount > singleCapacity) capacityIssues.push('Ruang ' + room.number + ' melebihi kapasitas ' + singleCapacity + ' siswa.');
      } else {
        if (leftStudents.length !== room.leftCount + room.rightCount) issues.push('Jumlah siswa ruang tunggal ' + room.number + ' tidak sesuai dengan RUANG.');
        if (leftStudents.length > singleCapacity) capacityIssues.push('Ruang tunggal ' + room.number + ' melebihi kapasitas ' + singleCapacity + '.');
      }
       const capacity = room.shared ? singleCapacity : room.combined ? sideCapacity : singleCapacity;
      room.overflow = room.students.filter(student => student.order > capacity);
      if (room.overflow.length) capacityIssues.push('Ruang ' + room.number + ' memiliki ' + room.overflow.length + ' siswa di luar kapasitas denah.');
       const seatLists = room.shared ? [room.students] : room.combined ? [leftStudents, rightStudents] : [room.students];
      seatLists.forEach(list => {
        const seen = new Set();
        list.forEach(student => {
          if (seen.has(student.order)) issues.push('Nomor kursi ganda pada ruang ' + room.number + '.');
          seen.add(student.order);
        });
      });
      room.students.sort((a, b) => a.order - b.order);
    });
    return { valid: true, config, rooms: rooms.sort((a, b) => a.number - b.number), issues, capacityIssues, sideCapacity, singleCapacity };
  } catch (error) {
    throw new Error('Gagal memuat denah: ' + error.message);
  }
}

function _logoDataUri() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('ASSET');
  const value = sheet ? sheet.getRange('A2').getDisplayValue().trim() : '';
  const base64 = value || (typeof LOGO_SEKOLAH_BASE64 === 'string' ? LOGO_SEKOLAH_BASE64 : '');
  if (!base64) return '';
  if (base64.length > 50000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Logo di ASSET bukan base64 PNG yang valid atau melebihi batas 50.000 karakter.');
  }
  return 'data:image/png;base64,' + base64;
}

function _signatureDataUri(value) {
  value = String(value || '').trim();
  if (!value) return '';
  if (value.length > 50000 || !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('Tanda tangan harus berupa gambar PNG/JPG/WebP dan tidak melebihi batas penyimpanan.');
  }
  return value;
}

function simpanTandaTanganKepala(dataUri) {
  const signature = _signatureDataUri(dataUri);
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('Penyimpanan sedang diproses. Coba lagi sebentar.');
  try {
    _simpanConfigEntries({ ttd_kepala_data_uri: signature });
    return { saved: true };
  } catch (error) {
    throw new Error('Tanda tangan gagal disimpan: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

function simpanPengaturanDenah(settings) {
  const pattern = Number(settings && settings.pattern);
  const direction = settings && settings.direction;
  const preset = settings && settings.preset;
  if (![1, 2, 3, 4].includes(pattern)) throw new Error('Pilih pola kursi 1 sampai 4.');
  if (!['kiri-depan', 'kanan-depan'].includes(direction)) throw new Error('Arah mulai tidak valid.');
  if (!['4x5', '6x6'].includes(preset)) throw new Error('Preset denah tidak dikenal.');

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('Pengaturan sedang diproses. Coba lagi sebentar.');
  try {
    const values = {
      pola_kursi: String(pattern),
      arah_mulai: direction,
      preset_denah: preset,
      baris_denah: preset === '6x6' ? '6' : '5',
      kolom_meja: preset === '6x6' ? '3' : '4',
      kursi_per_meja: '2'
    };
    _simpanConfigEntries(values);
    return { saved: true };
  } catch (error) {
    throw new Error('Pengaturan denah gagal disimpan: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

function _konfigurasiDenah() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('CONFIG');
  if (!sheet) throw new Error('Sheet CONFIG belum tersedia. Jalankan Setup awal.');
  const lastRow = sheet.getLastRow();
  const entries = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues() : [];
  const values = Object.fromEntries(entries.map(([key, value]) => [key, value]));
  const preset = values.preset_denah || '4x5';
  if (!['4x5', '6x6'].includes(preset)) throw new Error('Preset denah CONFIG harus 4x5 atau 6x6.');
  const rows = preset === '6x6' ? 6 : _ukuranDenah(values.baris_denah, 5, 'baris_denah');
  const tables = preset === '6x6' ? 3 : _ukuranDenah(values.kolom_meja, 4, 'kolom_meja');
  const seats = preset === '6x6' ? 2 : _ukuranDenah(values.kursi_per_meja, 2, 'kursi_per_meja');
  const pattern = Number(values.pola_kursi) || 1;
  if (!Number.isSafeInteger(pattern) || pattern < 1 || pattern > 4) throw new Error('Pola kursi CONFIG harus bernilai 1 sampai 4.');
  const direction = values.arah_mulai || 'kiri-depan';
  if (!['kiri-depan', 'kanan-depan'].includes(direction)) throw new Error('Arah mulai CONFIG tidak dikenal.');
  return {
    school: values.nama_sekolah || '',
    year: values.tahun_pelajaran || '',
    exam: values.nama_ujian || '',
    address: values.alamat_sekolah || '',
    city: values.kota || 'Serang',
    headTitle: values.jabatan_kepala_sekolah || '',
    headName: values.nama_kepala_sekolah || '',
    headNip: values.nip_kepala_sekolah || '',
    headSignatureDataUri: _signatureDataUri(values.ttd_kepala_data_uri || ''),
    printDate: values.tanggal_cetak || '',
    attendanceOrientation: values.orientasi_daftar_hadir || 'landscape',
    backupPages: Math.max(0, Number(values.halaman_kartu_cadangan) || 2),
    pattern,
    direction,
    preset, rows, tables, seats,
    columns: preset === '6x6' ? 6 : tables * seats,
    sideColumns: tables
  };
}

function _ukuranDenah(value, fallback, key) {
  const size = Number(value) || fallback;
  if (!Number.isSafeInteger(size) || size < 1 || size > 12) {
    throw new Error(key + ' harus bilangan bulat antara 1 sampai 12.');
  }
  return size;
}
