function getDataDaftarHadir() {
  try {
    const data = getDataDenah();
    if (!data.valid) return { valid: false, message: data.message || 'Data ruang belum siap.' };
    const sheet = SpreadsheetApp.getActive().getSheetByName('JADWAL');
    if (!sheet) throw new Error('Sheet JADWAL belum tersedia. Jalankan Setup awal.');
    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, HEADER_JADWAL.length).getDisplayValues() : [];
    const schedule = rows.filter(row => row[0] || row[4]).map(row => ({
      order: row[0], date: row[1], start: row[2], end: row[3], subject: row[4], short: row[5] || row[4], level: row[6]
    }));
    const sections = [];
    data.rooms.forEach(room => {
      const levels = room.combined ? [room.leftLevel, room.rightLevel] : [room.leftLevel || room.rightLevel];
      levels.filter(Boolean).forEach(level => {
        const students = room.students.filter(student => !room.combined || student.level === level).sort((a, b) => a.order - b.order);
        const columns = schedule.filter(item => !item.level || item.level === level);
        sections.push({ room: room.number, level, supervisor: room.supervisor, students, schedule: columns });
      });
    });
    return { valid: true, config: data.config, sections };
  } catch (error) {
    throw new Error('Gagal memuat daftar hadir: ' + error.message);
  }
}
