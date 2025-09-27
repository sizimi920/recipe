# Repository Guidelines

## Project Structure & Module Organization
- `src/` はアプリ本体。`components/` は UI、`api/` は楽天レシピ API クライアント、`types/` は共有型定義、`assets/` は静的アセット。エントリポイントは `main.tsx` と `App.tsx`。
- `public/` は静的ファイルをそのまま提供し、`index.html` が Vite ビルドの起点。
- `.env` に `VITE_RAKUTEN_APP_ID` を設定し、秘密情報は Git に含めない。

## Build, Test, and Development Commands
- `npm run dev` で Vite 開発サーバー (既定で `http://localhost:5173`) を起動。
- `npm run build` は `tsc` 型チェック後に本番ビルドを `dist/` へ生成。
- `npm run preview` で直近の本番ビルドをローカル検証。

## Coding Style & Naming Conventions
- TypeScript + React 関数コンポーネントとフックを使用。コンポーネント・プロバイダーは `PascalCase`、フックやユーティリティは `camelCase`、CSS/ファイルは `kebab-case`。
- インデントは 2 スペース、文字列はシングルクォートを基本とし、TypeScript が要求する場面を除きセミコロンは省略。
- `npx eslint src --max-warnings=0` で静的解析を実施。設定は `@eslint/js`、`typescript-eslint`、React Hooks の推奨ルールを継承。

## Testing Guidelines
- テストは `src/__tests__/` もしくは対象モジュールと同階層に `*.test.tsx` を配置し、対象名をファイル名に反映。
- Vitest + React Testing Library を推奨。必要に応じて `npm install --save-dev vitest @testing-library/react` を追加し、`npx vitest run` で実行。検索・カテゴリ取得など重要フローは概ね 80% 以上のカバレッジを目標。
- 楽天 API への通信はスタブ化し、テストを決定論的に保つ。

## Commit & Pull Request Guidelines
- コミットサマリは命令形で短く (例: `Fix recipe search to use keyword-aware API`)。複数領域を跨ぐ場合は本文に詳細を補足。
- Issue がある場合は `Fixes #ID` で紐付け、UI 変更はスクリーンショットを添付。
- PR 説明には目的、検証結果 (`npm run build` や `npx vitest`) 、フォローアップ事項を明記。
