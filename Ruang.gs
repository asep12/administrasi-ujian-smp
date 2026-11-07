function getDataPembagianRuang(mode) {
  const levels = _tingkatMode(mode);
  const validation = validasiDanRapikanSiswa();
  if (!validation.valid) return { valid: false, validation };

  const counts = _jumlahSiswaPerTingkat();
  const capacities = _kapasitasDenah();
  const active = levels.filter(level => counts[level] > 0);
  if (mode === '7-8-9') {
    const triplePlan = _rencanaTigaTingkat(counts, capacities.side);
    return { valid: true, mode, levels, counts, triple: true, roomPlans: triplePlan.plans, tripleGroups: triplePlan.groups, tripleSingles: { '7': 0, '8': 0, '9': 0 }, singleCapacity: capacities.single, sideCapacity: capacities.side };
  }
  if (!active.length) return { valid: false, message: 'Tidak ada siswa pada tingkat yang dipilih.' };
  const paired = active.length === 2;
  const allocations = {};
  levels.forEach(level => {
    const total = counts[level] || 0;
    const capacity = paired ? capacities.side : capacities.single;
    allocations[level] = total ? _bagiRata(total, Math.ceil(total / capacity)) : [];
  });
  return { valid: true, mode, levels, counts, allocations, singleCapacity: capacities.single, sideCapacity: capacities.side };
}

function simpanPembagianRuang(data) {
  const levels = _tingkatMode(data && data.mode);
  const validation = validasiDanRapikanSiswa();
  if (!validation.valid) throw new Error('Perbaiki data siswa terlebih dahulu.');

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('Data sedang diproses. Coba lagi sebentar.');
  try {
    const ss = SpreadsheetApp.getActive();
    const siswa = ss.getSheetByName('SISWA');
    const ruang = ss.getSheetByName('RUANG');
    if (!siswa || !ruang) throw new Error('Sheet SISWA atau RUANG belum tersedia. Jalankan Setup awal.');

    const lastRow = siswa.getLastRow();
    const values = lastRow > 1
      ? siswa.getRange(2, 1, lastRow - 1, HEADER_SISWA.length).getValues()
      : [];
    const counts = {};
    const roster = {};
    levels.forEach(level => { counts[level] = 0; roster[level] = []; });
    values.forEach((row, index) => {
      if (row.slice(0, 4).every(value => String(value || '').trim() === '')) return;
      const level = String(row[4] || '').trim();
      if (roster[level]) {
        counts[level]++;
        roster[level].push(index);
      }
    });

    if (levels.length === 3) return _simpanPembagianTigaTingkat(ss, siswa, ruang, values, levels, counts, roster, data);

    const allocations = data && data.allocations;
    const active = levels.filter(level => counts[level] > 0);
    if (!active.length) throw new Error('Tidak ada siswa pada tingkat yang dipilih.');
    const capacities = _kapasitasDenah();
    const allocationInfo = _validasiAlokasi(levels, counts, allocations, capacities.side, capacities.single);
    const commonRooms = allocationInfo.commonRooms;

    const oldRoomLastRow = ruang.getLastRow();
    const previousRooms = oldRoomLastRow > 1
      ? ruang.getRange(2, 1, oldRoomLastRow - 1, HEADER_RUANG.length).getDisplayValues()
      : [];
    const hasExisting = values.some(row => row.slice(6, 9).some(value => value !== '' && value != null)) || previousRooms.length > 0;
    if (hasExisting && !data.confirmOverwrite) {
      return { needsConfirmation: true, roomCount: Math.max(...levels.map(level => allocations[level].length)) };
    }

    const placed = _susunPenempatan(levels, active, commonRooms, allocations, roster, capacities.side);

    const roomCount = allocationInfo.roomCount;
    const supervisorByRoom = new Map(previousRooms.map(row => [String(row[0]), row[5]]));
    const roomRows = Array.from({ length: roomCount }, (_, index) => {
      const left = allocations[levels[0]];
      const right = levels[1] ? allocations[levels[1]] : [];
      const leftExists = index < left.length;
      const rightExists = index < right.length;
      return [
        index + 1,
        leftExists ? levels[0] : '', leftExists ? left[index] : 0,
        rightExists ? levels[1] : '', rightExists ? right[index] : 0,
        supervisorByRoom.get(String(index + 1)) || ''
      ];
    });
    if (roomRows.length) ruang.getRange(2, 1, roomRows.length, HEADER_RUANG.length).setValues(roomRows);
    if (oldRoomLastRow > roomRows.length + 1) {
      ruang.getRange(roomRows.length + 2, 1, oldRoomLastRow - roomRows.length - 1, HEADER_RUANG.length).clearContent();
    }
    if (values.length) {
      siswa.getRange(2, 7, values.length, 3).setValues(values.map((_, index) => placed[index] || ['', '', '']));
    }
    ss.toast('Pembagian tersimpan: ' + roomCount + ' ruang.', 'Aplikasi Ujian', 6);
    return { saved: true, roomCount };
  } catch (error) {
    throw new Error('Pembagian ruang gagal: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

function _tingkatMode(mode) {
  const modes = { '7-8': ['7', '8'], '8-9': ['8', '9'], '7-9': ['7', '9'], '7-8-9': ['7', '8', '9'], '7': ['7'], '8': ['8'], '9': ['9'] };
  if (!mode || !modes[mode]) throw new Error('Mode tingkat tidak dikenal.');
  return modes[mode];
}

function _rencanaTigaTingkat(counts, capacity) {
  const groupCounts = { a: 10, b: 8, c: 10 };
  while ((counts['7'] || 0) > capacity * (groupCounts.a + groupCounts.c)) groupCounts.c++;
  while ((counts['8'] || 0) > capacity * (groupCounts.b + groupCounts.c)) groupCounts.c++;
  while ((counts['9'] || 0) > capacity * (groupCounts.a + groupCounts.b)) groupCounts.b++;
  const plans = [];
  [['7', '9', groupCounts.a], ['8', '9', groupCounts.b], ['7', '8', groupCounts.c]].forEach(([left, right, total]) => {
    for (let i = 0; i < total; i++) plans.push({ leftLevel: left, rightLevel: right, leftCount: 0, rightCount: 0 });
  });
  ['7', '8', '9'].forEach(level => {
    const eligible = plans.map((plan, index) => ({ plan, index })).filter(item => item.plan.leftLevel === level || item.plan.rightLevel === level);
    const amounts = _bagiRata(counts[level] || 0, eligible.length);
    eligible.forEach((item, index) => {
      if (item.plan.leftLevel === level) item.plan.leftCount = amounts[index];
      else item.plan.rightCount = amounts[index];
    });
    if (amounts.some(value => value > capacity)) throw new Error('Kapasitas sisi tidak cukup untuk tingkat ' + level + '.');
  });
  return { plans, groups: groupCounts };
}

function _simpanPembagianTigaTingkat(ss, siswa, ruang, values, levels, counts, roster, data) {
  const plans = data && data.roomPlans;
  if (!Array.isArray(plans) || !plans.length) throw new Error('Rencana ruang tiga tingkat belum diisi.');
  const capacity = _kapasitasDenah().side;
  const totals = { '7': 0, '8': 0, '9': 0 };
  const placed = {};
  const cursor = { '7': 0, '8': 0, '9': 0 };
  plans.forEach((plan, roomIndex) => {
    const left = String(plan.leftLevel || '');
    const right = String(plan.rightLevel || '');
    const leftCount = Number(plan.leftCount);
    const rightCount = Number(plan.rightCount);
    if (!levels.includes(left) || (right && (!levels.includes(right) || left === right))) throw new Error('Pasangan tingkat pada ruang ' + (roomIndex + 1) + ' tidak valid.');
    const single = !right;
    if (![leftCount, rightCount].every(value => Number.isSafeInteger(value) && value >= 0) || (single ? rightCount !== 0 || leftCount > capacity * 2 : leftCount + rightCount > capacity * 2)) throw new Error('Jumlah siswa ruang ' + (roomIndex + 1) + ' melebihi kapasitas 40 siswa.');
    const shared = !single && (leftCount > capacity || rightCount > capacity);
    [[left, leftCount, single ? 'tunggal' : 'kiri'], [right, rightCount, 'kanan']].forEach(([level, amount, side], sideIndex) => {
      if (!level) return;
      totals[level] += amount;
      const offset = shared && sideIndex === 1 ? leftCount : 0;
      for (let seat = 1; seat <= amount; seat++) placed[roster[level][cursor[level]++]] = [roomIndex + 1, offset + seat, side === 'tunggal' ? (seat <= capacity ? 'kiri' : 'kanan') : side];
    });
  });
  levels.forEach(level => { if (totals[level] !== counts[level]) throw new Error('Total tingkat ' + level + ' harus sama dengan ' + counts[level] + ' siswa.'); });
  const oldRoomLastRow = ruang.getLastRow();
  const previousRooms = oldRoomLastRow > 1 ? ruang.getRange(2, 1, oldRoomLastRow - 1, HEADER_RUANG.length).getDisplayValues() : [];
  const hasExisting = values.some(row => row.slice(6, 9).some(value => value !== '' && value != null)) || previousRooms.length > 0;
  if (hasExisting && !data.confirmOverwrite) return { needsConfirmation: true, roomCount: plans.length };
  const supervisorByRoom = new Map(previousRooms.map(row => [String(row[0]), row[5]]));
  const roomRows = plans.map((plan, index) => [index + 1, plan.leftLevel, Number(plan.leftCount), plan.rightLevel, Number(plan.rightCount), supervisorByRoom.get(String(index + 1)) || '']);
  if (roomRows.length) ruang.getRange(2, 1, roomRows.length, HEADER_RUANG.length).setValues(roomRows);
  if (oldRoomLastRow > roomRows.length + 1) ruang.getRange(roomRows.length + 2, 1, oldRoomLastRow - roomRows.length - 1, HEADER_RUANG.length).clearContent();
  if (values.length) siswa.getRange(2, 7, values.length, 3).setValues(values.map((_, index) => placed[index] || ['', '', '']));
  ss.toast('Pembagian tersimpan: ' + roomRows.length + ' ruang.', 'Aplikasi Ujian', 6);
  return { saved: true, roomCount: roomRows.length };
}

function _jumlahSiswaPerTingkat() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('SISWA');
  const lastRow = sheet.getLastRow();
  const counts = { '7': 0, '8': 0, '9': 0 };
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues().forEach(row => {
      if (row.slice(0, 4).every(value => value.trim() === '')) return;
      const level = row[4].trim();
      if (Object.prototype.hasOwnProperty.call(counts, level)) counts[level]++;
    });
  }
  return counts;
}

function _bagiRata(total, rooms) {
  if (!rooms) return [];
  const dasar = Math.floor(total / rooms);
  const sisa = total % rooms;
  return Array.from({ length: rooms }, (_, index) => dasar + (index < sisa ? 1 : 0));
}

function _kapasitasDenah() {
  const config = _konfigurasiDenah();
  const single = config.rows * config.tables * config.seats;
  return { single, side: Math.floor(single / 2) };
}

function _validasiAlokasi(levels, counts, allocations, sideCapacity, singleCapacity) {
  if (sideCapacity === undefined) sideCapacity = 20;
  if (singleCapacity === undefined) singleCapacity = 40;
  const active = levels.filter(level => counts[level] > 0);
  const lists = {};
  levels.forEach(level => {
    const list = allocations && allocations[level];
    if (!Array.isArray(list)) throw new Error('Rincian ruang tingkat ' + level + ' tidak valid.');
    if (list.some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('Jumlah siswa per ruang harus berupa bilangan bulat nol atau lebih.');
    }
    if (list.reduce((sum, value) => sum + value, 0) !== (counts[level] || 0)) {
      throw new Error('Total tingkat ' + level + ' harus sama dengan ' + (counts[level] || 0) + ' siswa.');
    }
    if (!counts[level] && list.length) throw new Error('Tingkat ' + level + ' kosong, jumlah ruangnya harus nol.');
    lists[level] = list;
  });
  const commonRooms = active.length === 2
    ? Math.min(...active.map(level => lists[level].length))
    : 0;
  levels.forEach(level => lists[level].forEach((quantity, index) => {
    const capacity = active.length === 2 && index < commonRooms ? singleCapacity : singleCapacity;
    if (quantity > capacity) throw new Error('Ruang ' + (index + 1) + ' tingkat ' + level + ' melebihi kapasitas ' + capacity + '.');
  }));
  if (active.length === 2) for (let index = 0; index < commonRooms; index++) {
    if (lists[active[0]][index] + lists[active[1]][index] > singleCapacity) throw new Error('Ruang ' + (index + 1) + ' melebihi kapasitas ' + singleCapacity + ' siswa.');
  }
  return { commonRooms, roomCount: Math.max(...levels.map(level => lists[level].length)) };
}

function _susunPenempatan(levels, active, commonRooms, allocations, roster, sideCapacity) {
  sideCapacity = sideCapacity || 20;
  const placed = {};
  levels.forEach((level, sideIndex) => {
    let cursor = 0;
    allocations[level].forEach((quantity, roomIndex) => {
      const shared = active.length === 2 && roomIndex < commonRooms && allocations[active[0]][roomIndex] + allocations[active[1]][roomIndex] > sideCapacity;
      const offset = shared && sideIndex === 1 ? allocations[active[0]][roomIndex] : 0;
      for (let seat = 1; seat <= quantity; seat++) {
        const rosterIndex = roster[level][cursor++];
        const single = !(active.length === 2 && roomIndex < commonRooms);
        placed[rosterIndex] = [roomIndex + 1, offset + seat, single ? (seat <= sideCapacity ? 'kiri' : 'kanan') : (sideIndex === 0 ? 'kiri' : 'kanan')];
      }
    });
  });
  return placed;
}
