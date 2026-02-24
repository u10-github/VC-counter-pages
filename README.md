# VC-counter-pages

`VC-counter` が出力した `data/timeseries_6m.json` / `data/meta.json` を可視化する  
静的ダッシュボード（GitHub Pages公開用）です。

## 構成

- `index.html`: 画面レイアウト
- `app.js`: グラフ描画・凡例表示・集計表示ロジック
- `style.css`: スタイル
- `data/`: 表示データJSON
- `tests/`: Node組み込みテスト

## ローカル確認

```bash
python3 -m http.server 4173
```

ブラウザで `http://127.0.0.1:4173/` を開いて確認します。

## テスト

```bash
node --test tests/legend-toggle.test.js
```

## 公開先

- GitHub Pages: `https://u10-github.github.io/VC-counter-pages/`
