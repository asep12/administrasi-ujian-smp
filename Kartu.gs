function getDataKartu() {
  try {
    const denah = getDataDenah();
    if (!denah.valid) return { valid: false, message: denah.message || 'Data ruang belum siap.' };
    return {
      valid: true,
      config: denah.config,
      rooms: denah.rooms.map(room => ({
        number: room.number,
        students: room.students
          .slice()
          .sort((a, b) => (a.side === b.side ? a.order - b.order : a.side === 'kiri' ? -1 : 1))
          .map(student => ({
            induk: student.induk,
            name: student.name,
            className: student.className,
            participant: student.participant,
            order: student.order,
            side: student.side
          }))
      }))
    };
  } catch (error) {
    throw new Error('Gagal memuat data kartu: ' + error.message);
  }
}
