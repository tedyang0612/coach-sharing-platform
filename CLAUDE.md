@AGENTS.md

# 教練共課平台（夠練 GoLand）團隊慣例

這份文件記錄團隊六人共同開發時要遵守的慣例，目的是讓不同模組、不同時間、不同人（或不同 Claude Code 對話）接手時，風格與規則能保持一致。寫 code 前請先看過這份文件。

## 品牌識別

- 產品名稱：**夠練 GoLand**（不是「拼咖 Pika」，任何頁面、文案、圖示都不應該殘留舊名稱）。
- 品牌色 token（定義在 `app/globals.css`，透過 Tailwind v4 `@theme inline` 對應）：
  - `--brand: #2f6f4e` → `--color-brand`
  - `--brand-ink: #eaf3ed` → `--color-brand-ink`
- 新元件要用品牌色時，一律用 `bg-brand` / `text-brand` / `text-brand-ink` 這類 Tailwind class，不要寫死 hex。

## 共用 UI 元件

開發新頁面前先檢查這裡有沒有現成的，不要重複造輪子：

| 元件 | 路徑 | 用途 |
|---|---|---|
| `Button` | `components/ui/button.tsx` | 所有按鈕（含 loading 文案自行傳入） |
| `TextField` | `components/ui/text-field.tsx` | 文字輸入框，內建 label + error 顯示 |
| `CheckboxField` | `components/ui/checkbox.tsx` | 勾選框，內建 label |
| `FormError` | `components/ui/form-error.tsx` | 表單錯誤提示（圖示 + 紅框），支援 `\n` 換行多行文案 |
| `LogoBadge` | `components/brand/logo-badge.tsx` | 品牌標誌 |

新增表單類頁面時，錯誤訊息一律用 `FormError`，不要自己寫 `<p>` 紅字。

## Next.js 16.3.6 注意事項

這個版本跟訓練資料裡認識的 Next.js 不一樣：

- 寫 code 前先讀 `node_modules/next/dist/docs/` 底下對應的說明（`AGENTS.md` 會自動提醒，但真的要照做）。
- 用 `proxy.ts`，不是 `middleware.ts`。
- `AGENTS.md` 內容是 `next dev` 自動產生/還原的，不要手動刪除，commit 進去沒關係。

## Supabase／資料庫慣例

- `profiles` **沒有單一 `role` 欄位**。身分是動態判斷的：
  - 每個帳號只要有 `profiles` row 就是學員身分（註冊即具備）。
  - 教練身分：看 `coach_profiles` 是否有審核通過（approved）的申請。
  - 管理員身分：看 `profiles.is_admin`（boolean），只能由資料庫層手動設定，沒有自助升級管道。
  - 詳見 `supabase/migrations/20261001000009_profiles.sql` 的註解與 `handle_new_user()`。
- Supabase Auth 的 **Confirm email 設定目前是關閉**的。這會影響重複註冊 Email 的錯誤處理：
  - 關閉時：`supabase.auth.signUp()` 對重複 Email 會直接回傳 `error`（訊息含 `already registered` / `already exists` / `user already`）。
  - 開啟時：不會回傳 error（防帳號列舉），而是回傳 `identities` 為空陣列的假 user。
  - **兩種情況都要處理**，不要只判斷其中一種（可參考 `app/actions/auth.ts` 的寫法）。
- RLS 一定要開（10 張表目前全部已開啟），新增資料表時記得一起加 policy，不要等事後補。

### Schema 變動一律走 migration 檔，不要叫 Ted 貼 SQL Editor

這條是 2026-10-03 補上的規則，起因是線上共用專案曾經因為 schema 改動被手動貼到 SQL Editor 執行、沒走 migration 檔，導致 CLI 的追蹤表（`supabase_migrations.schema_migrations`）跟實際資料庫狀態對不上，`supabase db push` 直接報錯中斷（花了不少力氣才用 `supabase migration repair` 修復）。

- **任何 `CREATE TABLE`／`ALTER TABLE`／`CREATE POLICY`／`CREATE OR REPLACE FUNCTION`／`CREATE TRIGGER` 等 schema 層級的改動，一律寫成新的 migration 檔**放進 `supabase/migrations/`（檔名延續現有的時間戳格式），**不要叫 Ted 直接貼到 Supabase SQL Editor 執行**。想驗證的話用 `npx supabase db push --dry-run`（線上）或 `npx supabase db reset`（本機 Docker），確認沒問題後用 `npx supabase db push` 正式套用。
- 新增欄位時，順便檢查這張表有沒有既有的「鎖欄位」guard trigger（例如 `guard_coach_application_fields()`、`guard_registration_insert()`），需不需要同步調整白名單，避免新欄位被悄悄鎖死或忽略不更新。
- **純測試資料（INSERT／UPDATE／SELECT，不含 schema 變動）不受這條限制**，可以直接請 Ted 貼到 SQL Editor 執行，這類操作不會被 CLI 追蹤，也不會造成 `db push` 衝突。

## 時間與時區慣例（場次相關模組必讀）

平台只在台灣營運，所有「教練填的日期／時間」都是台灣時間（UTC+8，無日光節約）。資料庫 `timestamptz` 實際存的是 UTC，Supabase 的 DB 與 Vercel 的 server 預設時區也都是 UTC，所以「沒指定時區」的地方都會差 8 小時。

- **不要呼叫 `generate_sessions_for_course()`**（Task 00 的 `20261001000011_courses_sessions.sql`）：它用 `date + time` 組時間時沒帶時區，14:00 會被存成台灣時間 22:00；而且它是 `security definer` 又沒檢查呼叫者身分，會刪掉 open 場次並 cascade 刪除報名紀錄。場次一律在應用層切，用 `app/courses/_lib/course-input.ts` 的 `computeSessionSlots()`（Task 1.0 PR 合併後才會在 main 上）。之後會另開 migration 移除或修正這支 function，修好前請當它不存在。
- **寫入時間**：自己組時間字串一律帶 `+08:00`（例：`2026-11-01T14:00:00+08:00`），或用同一支檔案的 `toTaipeiDate()`；不要用 `new Date("2026-11-01 14:00")` 這種沒時區的寫法（在 Vercel 上會被當成 UTC）。
- **顯示時間**：一律指定台灣時區格式化，例如 `new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", ... })` 或 `toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })`，不要依賴執行環境的預設時區。
- **比較時間**（截止了沒、開課前幾小時）：直接比 `timestamptz`／`Date.getTime()` 即可，這兩者本身跟時區無關，不需要轉換。
- **依「台灣日期」篩選**（例如學員端「列出某天的課」）：SQL 用 `start_at at time zone 'Asia/Taipei'` 取日期，或在應用層把當天 00:00／24:00 用 `+08:00` 組好再用 `gte`／`lt` 查，不要直接拿 UTC 日期比。
- **seed／測試資料**：手寫 SQL 插入場次時同樣要帶 `+08:00`，不然測出來的時間會和畫面對不起來。

## Git 分支與 PR 慣例

- 分支命名：`feat/<姓名縮寫>-<任務編號>-<簡短說明>`，例如 `feat/ted-00-schema-auth`。
- **每個模組請開獨立分支與獨立 PR**，不要像 8.0 模組一樣因為忘記切分支而併進別的任務分支（這是已知的一次性疏失，不要重複發生）。
- `main` 只有 Ted 有寫入權限，其他人透過 PR + Vercel Preview Deployment 驗證。
- Repo 目前是 Public（Vercel Hobby 方案的多人協作在 Private repo 會被擋，所以設為 Public），寫 code 時留意不要把任何密鑰（`service_role` key 等）寫進程式碼或 commit 訊息。

## AC（驗收標準）自我驗收與 PR 文件慣例

- 每個模組開發完成後，開發者本人先依照 `驗收標準-AC總表.md`（存在 claude.ai Project 裡）逐項自我驗收，再請鯨魚（QA）複查，不要跳過自我驗收直接丟給 QA。
- AC 項目分兩類：
  - **PRD 原文 AC**：PRD 本來就列出的項目。
  - **本次新增（非 PRD 原文）**：開發過程中額外發現、值得驗收但 PRD 沒寫的項目。
- 勾選規則（這點容易混淆，務必照規則標示，否則 QA 不好分辨）：
  - 真的測過且通過 → `- [x]`。
  - 因為依賴的功能還沒開發、現在完全無法測 → `- [ ]`，並在項目後面加註 **「（無法測：原因）」**，不要勾起來假裝測過，也不要跟「測過但還沒做好」混在一起用同一種標示。
  - 不要用「暫緩」這種模糊字眼，統一用「無法測」+ 具體原因，讓 QA 一看就懂差別。
- 把自我驗收結果整理成留言貼到對應 PR（若因疏失併在別的 PR，要在留言裡說明原因，像 8.0 模組那樣），並同步更新 claude.ai Project 裡的 `驗收標準-AC總表.md`，讓之後回來查不會對不上。
- Markdown 的 `- [x]` / `- [ ]` 在 GitHub 上會顯示成真正的勾選框圖示，不是純文字，貼留言前不用擔心看起來像打 X。

## 協作模式慣例

- 每個模組建議用獨立的 Claude Code session（而不是一直延續同一個對話），避免對話過長、記憶被壓縮。這份 `CLAUDE.md` 就是為了讓不同 session 之間還能共用同一套慣例而存在——**新開 session 時請先讓 Claude 讀過這份文件**。
- 如果這份文件之後有新慣例要補，直接更新這個檔案並 commit，不要另開一份文件。
