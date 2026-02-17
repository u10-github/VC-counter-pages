# VC-counter Pages

このリポジトリは、`VC-counter` の **本番公開用** Web UI を GitHub Pages で配信するためのリポジトリです。

## 編集責務
- このリポジトリ: 本番用の静的UI（`index.html`, `app.js`, `style.css`）
- `VC-counter`: backend / JSON生成 / push制御（UIは編集しない）
- `VC-counter-pages-dev`: 開発検証用 UI

## 送信経路マトリクス
- DS218 dev → `VC-counter-pages-dev` / `develop`
- DS218 prod → `VC-counter-pages` / `main`

## 運用方針
- 公開ブランチ: `main`
- `data/timeseries_6m.json` と `data/meta.json` は DS218 prod から自動更新される
- `data/*.json` の手動編集は原則行わない
