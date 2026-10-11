// 教練總覽（設計稿 C02）的計算。純函式、不碰資料庫，資料來自 Ted 的 listMyCourses()。
// 場次狀態與取消條件一律沿用 app/courses/_lib/session-rules.ts，這裡不重寫規則。

import type { CourseWithSessions, SessionWithRoster } from "@/app/courses/_lib/queries";
import {
  canCoachCancelSession,
  sessionDisplayStatus,
  type SessionDisplayStatus,
} from "@/app/courses/_lib/session-rules";

const TZ = "Asia/Taipei";

export type UpcomingSession = {
  course: CourseWithSessions;
  session: SessionWithRoster;
  status: Extract<SessionDisplayStatus, "recruiting" | "matched">;
  // 還差幾人才達最低開課人數；已達就是 0
  shortBy: number;
  // 同一堂課有任何場次有人報名，課程共用資料就鎖定（PRD 1.0 規格 4）
  courseLocked: boolean;
  canCancel: boolean;
  // 卡片上那一行提示文字
  hint: string;
};

/** 台灣日期 YYYY-MM-DD 與星期（週一=1…週日=7） */
function taipeiDay(date: Date): { ymd: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdays[get("weekday")] };
}

function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 本週的範圍（台灣時間的週一到週日），回傳 YYYY-MM-DD */
export function taipeiWeekRange(now: Date): { start: string; end: string } {
  const today = taipeiDay(now);
  const start = addDays(today.ymd, 1 - today.weekday);
  return { start, end: addDays(start, 6) };
}

function buildHint(item: Omit<UpcomingSession, "hint">, cancelReason: string | undefined): string {
  if (item.status === "matched") return "確定開課後系統不提供取消場次。";
  if (item.session.active_count > 0) return "已有人報名，僅能編輯公告、QA 與封面圖。";
  if (item.courseLocked) return "同一堂課已有場次有人報名，僅能調整本場次的時間。";
  if (!item.canCancel && cancelReason) return `${cancelReason}。尚無人報名，可編輯所有欄位。`;
  return "尚無人報名，可編輯所有欄位。";
}

/** 還沒上課的場次（招生中、確定開課），依開課時間由近到遠 */
export function listUpcomingSessions(courses: CourseWithSessions[], now: Date): UpcomingSession[] {
  const items: UpcomingSession[] = [];
  for (const course of courses) {
    if (course.status === "draft") continue;
    const courseLocked = course.sessions.some((session) => session.active_count > 0);
    for (const session of course.sessions) {
      const status = sessionDisplayStatus(session, now);
      if (status !== "recruiting" && status !== "matched") continue;
      const cancel = canCoachCancelSession(session, session.active_count);
      const base = {
        course,
        session,
        status,
        shortBy: Math.max(0, course.min_participants - session.active_count),
        courseLocked,
        canCancel: cancel.ok,
      };
      items.push({ ...base, hint: buildHint(base, cancel.ok ? undefined : cancel.reason) });
    }
  }
  return items.sort((a, b) => a.session.start_at.localeCompare(b.session.start_at));
}

/** 本週（台灣時間週一到週日）還沒上課的場次數 */
export function countThisWeek(
  upcoming: UpcomingSession[],
  now: Date
): { total: number; recruiting: number; matched: number } {
  const week = taipeiWeekRange(now);
  const inWeek = upcoming.filter((item) => {
    const day = taipeiDay(new Date(item.session.start_at)).ymd;
    return day >= week.start && day <= week.end;
  });
  return {
    total: inWeek.length,
    recruiting: inWeek.filter((item) => item.status === "recruiting").length,
    matched: inWeek.filter((item) => item.status === "matched").length,
  };
}

/** 「10/22（三）」 */
export function formatPayoutDate(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}/${day}（${weekday}）`;
}
