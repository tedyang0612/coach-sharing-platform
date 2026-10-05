// Demo 排程頁的項目定義與結果文案（PRD 第六章 6「Demo 建議」）。
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
  { title: string; description: string; confirmText: string; pending: (o: DemoOverview) => string }
> = {
  matching: {
    title: "開課確認",
    description: "已到報名截止的場次：人數達下限就確定開課並扣款，未達下限就取消（不扣款），並發通知給學員與教練。",
    confirmText: "會立刻處理所有已到報名截止的場次，並發出通知。",
    pending: (o) => `待處理 ${o.matching_pending} 個場次`,
  },
  reminders: {
    title: "上課提醒",
    description: "對開課前 24 小時內、已確定開課的場次，發送【上課時間地點】提醒給學員。",
    confirmText: "會立刻對符合條件的場次發出上課提醒。",
    pending: (o) => `待發送 ${o.reminders_pending} 個場次`,
  },
  complete: {
    title: "課程完成",
    description: "已結束的場次標為完成，報名改為課程完成，並發評價邀請給學員。",
    confirmText: "會立刻把已結束的場次標為完成，並發出評價邀請。",
    pending: (o) => `待處理 ${o.complete_pending} 個場次`,
  },
  payouts: {
    title: "每週撥款",
    description: "結算上週一到週日完成的課程（扣 5% 媒合費），以及 24 小時內取消的教練補償，產生撥款紀錄並通知教練。",
    confirmText: "會立刻產生撥款紀錄並通知教練（以今天為撥款日）。",
    pending: (o) => `待撥款 ${o.payout_registrations} 筆，預估 NT$ ${Math.round(o.payout_net_estimate).toLocaleString("zh-TW")}`,
  },
};

/** 執行完成後顯示在卡片下方的結果 */
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
      return `已產生 ${result.processed} 筆撥款，實收合計 NT$ ${Math.round(result.net_total ?? 0).toLocaleString("zh-TW")}${
        comp > 0 ? `（含取消補償 NT$ ${Math.round(comp).toLocaleString("zh-TW")}）` : ""
      }。`;
    }
  }
}
