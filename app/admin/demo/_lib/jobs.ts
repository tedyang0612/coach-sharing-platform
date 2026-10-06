// Demo 排程頁的項目定義與結果文案（PRD 第六章 6「Demo 建議」；版型與文案對照 Figma A01）。
// 純資料與純函式，頁面（Server Component）、卡片（Client Component）與 server action 共用。

export const DEMO_JOBS = ["matching", "reminders", "complete", "payouts"] as const;
export type DemoJob = (typeof DEMO_JOBS)[number];

export function isDemoJob(value: string): value is DemoJob {
  return (DEMO_JOBS as readonly string[]).includes(value);
}

/** admin_demo_overview() 的回傳 */
export type DemoOverview = {
  matching_pending: number;
  reminders_pending: number;
  complete_pending: number;
  payout_registrations: number;
  payout_net_estimate: number;
};

/** admin_run_demo_job() 的回傳（依項目不同，只會有其中幾個欄位） */
export type DemoJobResult = {
  job: DemoJob;
  processed: number;
  confirmed?: number;
  cancelled?: number;
  net_total?: number;
  compensation_total?: number;
};

export type DemoJobState = { ok: true; result: DemoJobResult } | { ok?: undefined; error: string };

export const DEMO_JOB_INFO: Record<
  DemoJob,
  {
    title: string;
    description: string;
    button: string;
    confirmText: string;
    /** 卡片上的待處理數量 */
    pending: (o: DemoOverview) => string;
    /** 「最近一次」那行的結果文字 */
    resultLabel: (n: number) => string;
  }
> = {
  matching: {
    title: "開課確認",
    description: "對到報名截止時間的場次：達人數下限就確定開課並扣款、發開課確認通知；未達就取消、不扣款。",
    button: "執行開課確認",
    confirmText: "會立刻處理所有已到報名截止的場次，並發出通知。",
    pending: (o) => `待處理 ${o.matching_pending} 個場次`,
    resultLabel: (n) => `處理 ${n} 個場次`,
  },
  reminders: {
    title: "上課提醒",
    description: "開課前 24 小時，對確定開課的場次寄送【上課時間地點】提醒。",
    button: "執行上課提醒",
    confirmText: "會立刻對符合條件的場次發出上課提醒。",
    pending: (o) => `待發送 ${o.reminders_pending} 個場次`,
    resultLabel: (n) => `提醒 ${n} 個場次`,
  },
  complete: {
    title: "場次結束",
    description: "上課時間結束的場次改為已結束，報名改為課程完成，發評價邀請，教練款項轉為待撥款。",
    button: "執行場次結束",
    confirmText: "會立刻把已結束的場次標為完成，並發出評價邀請。",
    pending: (o) => `待處理 ${o.complete_pending} 個場次`,
    resultLabel: (n) => `結束 ${n} 個場次`,
  },
  payouts: {
    title: "每週撥款",
    description: "結算上週一到週日的待撥款（不管哪一天按都是這個區間），含 24 小時內取消的教練補償，更新教練收益看板為已撥款。",
    button: "執行每週撥款",
    confirmText: "會立刻產生撥款紀錄並通知教練（撥款日為今天，結算上週一到週日完成的課程）。",
    pending: (o) => `待撥款 ${o.payout_registrations} 筆，預估 NT$ ${Math.round(o.payout_net_estimate).toLocaleString("zh-TW")}`,
    resultLabel: (n) => `撥款 ${n} 位教練`,
  },
};

const ntd = (n: number) => `NT$ ${Math.round(n).toLocaleString("zh-TW")}`;

/** 執行完成後顯示在卡片下方的結果（比「最近一次」那行詳細） */
export function formatJobResult(result: DemoJobResult): string {
  if (result.processed === 0) return "沒有符合條件的項目，所以沒有任何變動。";
  switch (result.job) {
    case "matching":
      return `已處理 ${result.processed} 個場次：${result.confirmed ?? 0} 個確定開課、${result.cancelled ?? 0} 個未達人數取消。`;
    case "reminders":
      return `已對 ${result.processed} 個場次發送上課提醒。`;
    case "complete":
      return `已將 ${result.processed} 個場次標為完成，並發出評價邀請。`;
    case "payouts": {
      const comp = result.compensation_total ?? 0;
      return `已產生 ${result.processed} 筆撥款，實收合計 ${ntd(result.net_total ?? 0)}${comp > 0 ? `（含取消補償 ${ntd(comp)}）` : ""}。`;
    }
  }
}
