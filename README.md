# VC-counter Pages

このリポジトリは、`VC-counter` の Web UI を GitHub Pages で公開するための配信専用リポジトリです。

## 役割
- ダッシュボード表示用の静的ファイル（`index.html`, `app.js`, `style.css`）を保持する
- DS218 上で生成されたデータ（`data/timeseries_6m.json`, `data/meta.json`）の公開先として利用する

## 運用方針
- `develop`：検証用
- `main`：本番公開用

データファイルは自動更新されるため、手動編集は原則行いません。
