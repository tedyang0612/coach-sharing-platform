# 共用型別（佔位）

負責人：Ted（跟 Supabase 資料表結構綁在一起，建議統一維護，避免大家各自定義出不一致的型別）

放共用的 TypeScript 型別定義，例如 `Coach`、`Learner`、`Venue`、`Booking` 等，之後可以用 Supabase CLI 產生的型別檔取代（`supabase gen types typescript`）。
