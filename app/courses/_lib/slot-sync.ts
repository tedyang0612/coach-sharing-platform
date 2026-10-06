// 已發布課程的場次編輯（PRD v4.8 1.0 規格 4、AC 10）。純函式、不碰資料庫，畫面與 server action 共用。
//
// 規則：
// - 同一堂課只要任何一個場次有人報名，課程共用資料（名稱、地點、價格、人數…）就全部鎖定（由 course-input 的欄位清單與資料庫 trigger 把關）
// - 場次的時間各自判斷：有人報名的場次不能改時間、不能刪除；沒有人報名的場次仍可調整時間、刪除，也可以新增場次
// - 「有人報名」這裡採保守定義：該場次有任何一筆報名紀錄（含已取消、已退款），或場次已經不是招生中
//   （刪除場次會連帶刪除報名紀錄，不能把歷史紀錄一起刪掉）

import { cleanSlots, toHHMM, toTaipeiDate, validateSlots, type SessionSlotInput } from "./course-input";

export type ExistingSession = {
  id: string;
  status: string;
  start_at: string;
  end_at: string;
  /** 該場次的報名紀錄筆數（任何狀態） */
  registrationCount: number;
};

/** 這個場次是不是已鎖定：有報名紀錄，或已經不是招生中（確定開課、已結束、已取消） */
export function isSessionTimeLocked(session: Pick<ExistingSession, "status" | "registrationCount">): boolean {
  return session.registrationCount > 0 || session.status !== "open";
}

/** 場次的時間轉成「課程日期那天」的 HH:MM（台灣時間）；結束在隔天 00:00 會是 24:00 */
export function sessionToTimes(session: Pick<ExistingSession, "start_at" | "end_at">, date: string): { start: string; end: string } {
  const dayStart = toTaipeiDate(date, "00:00").getTime();
  const minutes = (iso: string) => Math.round((Date.parse(iso) - dayStart) / 60000);
  return { start: toHHMM(minutes(session.start_at)), end: toHHMM(minutes(session.end_at)) };
}

/** 編輯畫面的初始時間表：依場次組出來（照開始時間排序），每一堂帶著場次 id 與是否鎖定 */
export function sessionsToSlots(sessions: ExistingSession[], date: string): SessionSlotInput[] {
  return [...sessions]
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .map((s) => {
      const slot: SessionSlotInput = { ...sessionToTimes(s, date), sessionId: s.id };
      if (isSessionTimeLocked(s)) slot.locked = true;
      return slot;
    });
}

export type SlotRow = { startAt: Date; endAt: Date; registrationDeadlineAt: Date };

export type SlotPlan = {
  inserts: SlotRow[];
  updates: (SlotRow & { sessionId: string })[];
  deletes: string[];
};

function toRow(date: string, slot: { start: string; end: string }, deadlineHours: number): SlotRow {
  const startAt = toTaipeiDate(date, slot.start);
  return {
    startAt,
    endAt: toTaipeiDate(date, slot.end),
    registrationDeadlineAt: new Date(startAt.getTime() - deadlineHours * 60 * 60 * 1000),
  };
}

function deadlineError(index: number, hours: number): string {
  return `第 ${index + 1} 堂的報名截止時間已過（需在開課前 ${hours} 小時以前設定）`;
}

/**
 * 把「教練調整後的時間表」和「資料庫現有的場次」比對，算出要新增、更新、刪除哪些場次。
 * 任何一條規則不符就回傳錯誤，不做任何變更。
 */
export function planSlotSync(input: {
  date: string;
  deadlineHours: number;
  existing: ExistingSession[];
  slots: SessionSlotInput[];
  now?: Date;
}): { ok: true; plan: SlotPlan } | { ok: false; error: string } {
  const { date, deadlineHours, existing, slots, now = new Date() } = input;

  const slotError = validateSlots(slots);
  if (slotError) return { ok: false, error: slotError };

  const byId = new Map(existing.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const plan: SlotPlan = { inserts: [], updates: [], deletes: [] };

  for (const [i, slot] of slots.entries()) {
    if (!slot.sessionId) {
      const row = toRow(date, slot, deadlineHours);
      if (row.registrationDeadlineAt <= now) return { ok: false, error: deadlineError(i, deadlineHours) };
      plan.inserts.push(row);
      continue;
    }

    const session = byId.get(slot.sessionId);
    if (!session) return { ok: false, error: `第 ${i + 1} 堂對應的場次不存在，請重新整理頁面後再試` };
    if (seen.has(session.id)) return { ok: false, error: `第 ${i + 1} 堂與其他堂重複，請重新整理頁面後再試` };
    seen.add(session.id);

    const current = sessionToTimes(session, date);
    const changed = current.start !== slot.start || current.end !== slot.end;
    if (!changed) continue;

    if (isSessionTimeLocked(session)) {
      return { ok: false, error: `第 ${i + 1} 堂已有學員報名，時間無法修改` };
    }
    const row = toRow(date, slot, deadlineHours);
    if (row.registrationDeadlineAt <= now) return { ok: false, error: deadlineError(i, deadlineHours) };
    plan.updates.push({ sessionId: session.id, ...row });
  }

  for (const session of existing) {
    if (seen.has(session.id)) continue;
    if (isSessionTimeLocked(session)) {
      const times = sessionToTimes(session, date);
      return { ok: false, error: `${times.start}–${times.end} 這一堂已有學員報名，無法刪除` };
    }
    plan.deletes.push(session.id);
  }

  return { ok: true, plan };
}

/**
 * 畫面用：新增的一堂、或時間被改過的一堂，報名截止時間要還沒過。
 * 沒動過的場次（包含已經過了截止時間、有人報名的）不檢查，不然這堂課就再也不能存檔了。
 */
export function changedSlotsDeadlineError(input: {
  date: string;
  deadlineHours: number;
  slots: SessionSlotInput[];
  initialSlots: SessionSlotInput[];
  now?: Date;
}): string | null {
  const { date, deadlineHours, slots, initialSlots, now = new Date() } = input;
  if (!date) return null;
  const initialById = new Map(initialSlots.filter((s) => s.sessionId).map((s) => [s.sessionId, s]));
  for (const [i, slot] of slots.entries()) {
    if (!slot.start || !slot.end) continue;
    const initial = slot.sessionId ? initialById.get(slot.sessionId) : undefined;
    const unchanged = initial && initial.start === slot.start && initial.end === slot.end;
    if (unchanged) continue;
    if (toRow(date, slot, deadlineHours).registrationDeadlineAt <= now) return deadlineError(i, deadlineHours);
  }
  return null;
}

/** 寫回 courses 的時間表欄位（session_slots 與舊的 time_range_*、第一堂時長）；時間表已通過驗證才能呼叫 */
export function courseSlotColumns(slots: SessionSlotInput[]): {
  session_slots: { start: string; end: string }[];
  time_range_start: string;
  time_range_end: string;
  session_duration_minutes: number;
} {
  const clean = cleanSlots(slots);
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const first = clean[0];
  return {
    session_slots: clean,
    time_range_start: first.start,
    time_range_end: clean[clean.length - 1].end,
    session_duration_minutes: minutes(first.end) - minutes(first.start),
  };
}
