# 教練共課平台 — 環境設置教學

接受 GitHub 邀請後，照著以下步驟做，直到瀏覽器出現「教練共課平台」畫面，就代表你的環境準備好了。

> 💡 只是想先看一下目前畫面長怎樣、不想開終端機？直接打開這個網址就好，不用做以下任何步驟：
> **https://coach-sharing-platform.vercel.app/**
> 這是自動部署的版本，Ted 每次把新東西推上 main，這個網址就會自動更新。
> 但如果你要**實際寫程式、開發功能**，還是要照下面步驟把專案設置到自己電腦上。

---

## 1. 接受 GitHub 邀請

去信箱或 GitHub 網站右上角小鈴鐺通知，找到邀請點 **Accept invitation**。

確認方式：登入 GitHub，打開 repo 網址 `https://github.com/tedyang0612/coach-sharing-platform`，能正常看到內容代表邀請已生效。

---

## 2. Clone 專案到自己電腦

打開終端機（Terminal / CMD），先 `cd` 到你想放專案的資料夾，再執行：

```bash
git clone https://github.com/tedyang0612/coach-sharing-platform.git
cd coach-sharing-platform
```

如果跳出登入視窗，用自己的 GitHub 帳號登入授權即可。

**常見卡關：**
- `Repository not found` / `Permission denied` → 邀請可能還沒接受
- 沒有 `git` 指令 → 先安裝 Git（Windows 到 [git-scm.com](https://git-scm.com) 下載，Mac 通常內建）

---

## 3. 安裝套件

```bash
npm install
```

需要先裝好 [Node.js](https://nodejs.org)（建議 18 以上版本）。

---

## 4. 設定環境變數

> ⚠️ **注意：這個 repo 裡沒有 `.env.example` 範本檔**（`.gitignore` 把所有 `.env*` 檔案都排除在外，包含範本），所以不要執行 `cp .env.example .env.local`，會出現 `找不到指定的檔案`。改成手動建立：

1. 在 `coach-sharing-platform` 資料夾裡，用記事本／VS Code **新增一個檔案**，命名為 `.env.local`
   （Windows 用記事本存檔時，「存檔類型」記得選「所有檔案」，不然會被自動加上 `.txt`）
2. 貼進去這兩行：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**把這兩個值換成真實的 Supabase 專案資訊 —— 跟 Ted 要（他會提供 Project URL 和 Publishable/anon key）**，貼上後存檔。

> ⚠️ `.env.local` 不會被 git 追蹤，每個人都要自己設定一次，不會自動同步。

---

## 5. 啟動開發伺服器

```bash
npm run dev
```

看到終端機顯示：

```
✓ Ready in ...ms
Local: http://localhost:3000
```

代表伺服器啟動成功（終端機會停在這裡持續執行，屬正常現象，不是當機；要停止的話按 `Ctrl + C`）。

---

## 6. 打開瀏覽器確認

瀏覽器輸入：

```
http://localhost:3000
```

看到「**教練共課平台**」的畫面，就代表你的環境完全設置成功！

---

## 常見問題

| 狀況 | 可能原因 |
| --- | --- |
| `git clone` 失敗 | 邀請還沒接受，或沒裝 Git |
| `npm install` 報錯／卡住 | Node.js 版本太舊，建議升級到 18+ |
| `cp .env.example .env.local` 出現「找不到指定的檔案」 | repo 裡沒有這個範本檔，改照第 4 步手動建立 `.env.local` |
| 網頁打不開或空白 | `.env.local` 沒填對，先跟 Ted 確認 Supabase 的值 |

有卡住的地方，截圖回報給 Ted 就好。
