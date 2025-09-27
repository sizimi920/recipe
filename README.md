# 楽天レシピ検索アプリ

React + TypeScript + Vite で構築した、楽天レシピAPI (CategoryList / CategoryRanking) 対応の検索アプリです。カテゴリ階層と任意のキーワードでレシピランキング（上位4件固定）を取得し、材料・調理時間・費用目安などを閲覧できます。

## セットアップ

1. 依存パッケージをインストールします。

   ```bash
   npm install
   ```

2. 環境変数を設定します。`.env.sample` をコピーして `.env` を作成し、[楽天ウェブサービス](https://webservice.rakuten.co.jp/)から取得したアプリIDを設定してください。

   ```bash
   cp .env.sample .env
   # .env を編集して VITE_RAKUTEN_APP_ID=xxxxxx を入力
   ```

3. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

   ブラウザで `http://localhost:5173` を開くとアプリを確認できます。

## 主な機能

- カテゴリ（大→中→小）階層選択＋任意キーワード検索
- 楽天レシピカテゴリ別ランキング API の上位4件固定表示
- 材料の一部抜粋表示（3件＋残数表示）
- 調理時間 / 費用目安 / 公開日メタ情報表示
- 画像フォールバック (medium → food → small) + ロード失敗時プレースホルダー
- Web Share API による共有（未対応環境は無害フォールバック）
- AbortController による検索キャンセル / 再検索安全化
- 完全日本語のエラーメッセージ表示 + 再試行導線

## 技術スタック

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- TypeScript
- 楽天レシピ API (CategoryList 20170426 / CategoryRanking 20170426)

## 環境変数

| 変数名 | 必須 | 説明 |
| ------ | ---- | ---- |
| `VITE_RAKUTEN_APP_ID` | ✅ | 楽天ウェブサービスで発行したアプリID |

`.env.sample` を参考に `.env` を作成してください。

## 開発メモ / 実装上の注意

- CategoryRanking API は常に 4 件固定。任意件数指定や sort パラメータは受け付けないため UI も用意しない。
- 取得後にキーワードフィルタをクライアント側で適用し、最大 4 件にトリム。
- ランキング番号が欠落している場合は (page - 1)*4 + index + 1 で補完。
- 画像は `mediumImageUrl || foodImageUrl || smallImageUrl` の優先順。
- 画像 onError で `<img>` 非表示 + 親要素に placeholder クラス付与。
- 外部リンクは target="_blank" rel="noopener noreferrer" を必ず付与。
- クレジットスニペットは HTML コメント含め改変禁止 (`dangerouslySetInnerHTML`)。

## ライセンス / 利用上の注意

このプロジェクトは学習用途のサンプルです。商用利用や二次配布時は楽天ウェブサービス利用規約・各種 API 規約を必ず確認してください。
