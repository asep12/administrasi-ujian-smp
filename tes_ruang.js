const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

vm.runInThisContext(fs.readFileSync('Ruang.gs', 'utf8'));
vm.runInThisContext(fs.readFileSync('DenahLogic.gs', 'utf8'));
assert.deepEqual(_bagiRata(38, 2), [19, 19]);
assert.deepEqual(_bagiRata(37, 2), [19, 18]);
assert.deepEqual(_validasiAlokasi(['7', '8'], { '7': 385, '8': 331 }, {
  '7': [...Array(5).fill(20), ...Array(15).fill(19)],
  '8': [...Array(8).fill(20), ...Array(9).fill(19)]
}).roomCount, 20);
assert.equal(_validasiAlokasi(['7', '8'], { '7': 21, '8': 1 }, { '7': [21], '8': [1] }).roomCount, 1);
assert.equal(_validasiAlokasi(['7'], { '7': 38 }, { '7': [38] }).roomCount, 1);
assert.equal(_validasiAlokasi(['7', '8'], { '7': 58, '8': 20 }, { '7': [20, 38], '8': [20] }).commonRooms, 1);
assert.equal(_validasiAlokasi(['7', '8'], { '7': 54, '8': 18 }, { '7': [18, 36], '8': [18] }, 18, 36).roomCount, 2);
assert.throws(() => _validasiAlokasi(['7', '8'], { '7': 19, '8': 18 }, { '7': [19], '8': [18] }, 18, 36), /kapasitas 36/);

const placement = _susunPenempatan(['7', '8'], ['7', '8'], 1, { '7': [2, 3], '8': [1, 2] }, { '7': [10, 11, 12, 13, 14], '8': [20, 21, 22] });
assert.deepEqual(placement[10], [1, 1, 'kiri']);
assert.deepEqual(placement[20], [1, 1, 'kanan']);
assert.deepEqual(placement[14], [2, 3, 'kiri']);
const single = _susunPenempatan(['7'], ['7'], 0, { '7': [38] }, { '7': Array.from({length:38}, (_, i) => i) });
assert.deepEqual(single[19], [1, 20, 'kiri']);
assert.deepEqual(single[20], [1, 21, 'kanan']);
assert.equal(new Set(Object.keys(single)).size, 38);
const pairedWithSingle = _susunPenempatan(['7', '8'], ['7', '8'], 1, { '7': [20, 38], '8': [20] }, { '7': Array.from({length:58}, (_, i) => i), '8': Array.from({length:20}, (_, i) => i + 100) });
assert.deepEqual(pairedWithSingle[20], [2, 1, 'kiri']);
assert.deepEqual(pairedWithSingle[57], [2, 38, 'kanan']);
const grid = mode => {
  const cells = Array.from({length:5}, () => Array(4));
  for (let n=1;n<=20;n++) { const p=posisiKursi(n,5,4,mode,'kiri-depan');cells[p.row][p.col]=n; }
  return cells;
};
assert.deepEqual(grid(1), [[1,2,3,4],[8,7,6,5],[9,10,11,12],[16,15,14,13],[17,18,19,20]]);
assert.deepEqual(grid(2), [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]);
assert.deepEqual(grid(3), [[1,10,11,20],[2,9,12,19],[3,8,13,18],[4,7,14,17],[5,6,15,16]]);
assert.deepEqual(grid(4), [[1,6,11,16],[2,7,12,17],[3,8,13,18],[4,9,14,19],[5,10,15,20]]);
assert.deepEqual(posisiKursi(1,5,4,1,'kanan-depan'), {row:0,col:3});
assert.equal(posisiKursi(21,5,4,1,'kiri-depan'), null);
console.log('Uji pembagian ruang lulus.');
