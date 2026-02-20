const test = require('node:test');
const assert = require('node:assert/strict');

const { getLegendToggleText, buildLegendItems } = require('../app.js');

test('getLegendToggleText shows hide label when visible', () => {
  assert.equal(getLegendToggleText(true, '凡例'), '凡例を隠す ▲');
});

test('getLegendToggleText shows show label when hidden', () => {
  assert.equal(getLegendToggleText(false, '凡例'), '凡例を表示 ▼');
});

test('buildLegendItems keeps labeled datasets with color', () => {
  const items = buildLegendItems([
    { label: 'A', borderColor: '#111' },
    { label: '', borderColor: '#222' },
    { label: 'B', backgroundColor: '#333' },
  ]);

  assert.deepEqual(items, [
    { label: 'A', color: '#111' },
    { label: 'B', color: '#333' },
  ]);
});
