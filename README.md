# 教練共課平台

三方媒合平台（教練／學員／場地）的專題實作骨架。技術棧：**Next.js（App Router）+ Supabase**。

---

## 開發模式

分支模型：`main + feature branch`（暫不使用 staging，等衝突變多再視情況加回）。

```text
main（正式版，只有 Ted 有寫入權限）
 ├── feat/a-xxx
 ├── feat/b-xxx
 └── feat/c-xxx
```

完整協作規則、角色權限、PR 規則、Claude Code 固定 prompt 規範，請看團隊的「Vibe Coding 協作規則」文件（Ted 保管連結）。

---

## 第一次拿到專案怎麼開始

1. Clone 專案：
   ```bash
   git clone <repo網址>
   cd coach-sharing-platform
   npm install
   ```
2. 複製環境變數範本，填入 Supabase 的 URL 跟 anon key（跟 Ted 要，或看 Supabase 專案 Settings → API）：
   ```bash
   cp .env.example .env.local
   ```
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
   打開 [http://localhost:3000](http://localhost:3000) 應該會看到畫面。
4. 開始寫自己的 Task 前，先從最新的 `main` 建立自己的 feature branch：
   ```bash
   git checkout main
   git pull
   git checkout -b feat/<姓名縮寫>-<task編號>-<簡短說明>
   ```

---

## 資料夾結構

```text
app/              前端頁面（Next.js App Router，檔案即路由）
app/api/          後端 API（Route Handlers）—— 佔位，待模組分工
components/       共用前端元件 —— 佔位，待模組分工
lib/supabase/     Supabase client 設定（瀏覽器端 / 伺服器端）—— 共用，勿隨意修改
lib/matching/     配對／推薦邏輯 —— 佔位，待模組分工
types/            共用 TypeScript 型別 —— 由 Ted 統一維護
docs/             規格文件（PRD、架構、資料模型等）—— 由 Ted 維護
tasks/            各人的 Task 說明文件 —— 由 Ted 建立、分派
```

各資料夾實際的負責人，等 PRD／模組拆分定案後會補進協作文件裡的 Ownership 表。

---

## 給 Claude Code 的固定開場 Prompt

每次開新任務前，先貼這段：

```text
這個專案使用：Next.js（App Router）+ Supabase。

請執行：<任務描述>。

開始前請先回答（先不要修改任何程式）：
1. 你理解的任務
2. 可以修改的路徑（Allowed Paths）
3. 不能修改的路徑（Forbidden Paths）
4. 預計會改哪些檔案

不得修改 Allowed Paths 之外的檔案。
不得自行修改別人的模組、根目錄設定（package.json、.env、lock 檔等）。
不得改用別的框架（例如純 React / Vite / 別的後端），統一使用 Next.js + Supabase。
如果發現需要跨模組修改，請停下來並告訴我原因。

確認理解正確後再開始實作。
```

---

## 部署

建議用 [Vercel](https://vercel.com/new) 一鍵部署，連接這個 GitHub repo 即可，環境變數要在 Vercel 專案設定裡填一次（跟 `.env.local` 內容一樣）。
