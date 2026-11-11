function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Aplikasi Ujian')
    .addItem('Setup awal', 'setupAwal')
    .addSeparator()
    .addItem('Validasi data siswa', 'bukaWizard')
    .addItem('Pembagian ruang', 'bukaPembagianRuang')
    .addItem('Pola kursi & denah', 'bukaPolaKursi')
    .addItem('Kartu peserta', 'bukaKartu')
    .addItem('Daftar peserta', 'bukaDaftarPeserta')
    .addItem('Daftar hadir', 'bukaDaftarHadir')
    .addItem('Cetak terpadu', 'bukaCetakTerpadu')
    .addToUi();
}

function bukaWizard() {
  const html = HtmlService.createHtmlOutputFromFile('Wizard')
    .setWidth(940)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Administrasi Ujian');
}

function bukaPembagianRuang() {
  const html = HtmlService.createHtmlOutputFromFile('PembagianRuang')
    .setWidth(940)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pembagian Ruang');
}

function bukaPolaKursi() {
  const html = HtmlService.createHtmlOutputFromFile('PolaKursi')
    .setWidth(1040)
    .setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pola Kursi & Denah');
}

function bukaKartu() {
  const html = HtmlService.createHtmlOutputFromFile('KartuCetak')
    .setWidth(1040)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'Kartu Peserta');
}

function bukaDaftarPeserta() {
  const html = HtmlService.createHtmlOutputFromFile('DaftarPeserta')
    .setWidth(900)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'Daftar Peserta');
}

function bukaDaftarHadir() {
  const html = HtmlService.createHtmlOutputFromFile('DaftarHadir')
    .setWidth(1100)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'Daftar Hadir');
}

function bukaCetakTerpadu() {
  const html = HtmlService.createHtmlOutputFromFile('CetakTerpadu')
    .setWidth(700)
    .setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cetak Terpadu');
}
