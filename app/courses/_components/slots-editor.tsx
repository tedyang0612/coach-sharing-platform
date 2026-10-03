"use client";

// 場次時間設定（10/3 組員討論後的版本）：教練逐堂設定開始／結束時間，每堂時長可以不同。
//   第 1 堂  [14:00] – [15:00]  [＋ 新增一堂]
//   第 2 堂  [15:00] – [16:30]  ✕
// - 第一堂選了開始時間、結束時間還沒選（或早於開始）時，結束時間自動帶 +60 分鐘
// - 「＋ 新增一堂」接續上一堂的結束時間、沿用上一堂的時長
// - 第 2 堂以後的開始時間只列出「上一堂結束之後」的選項；結束時間只列出晚於開始的選項，
//   打開下拉選單時就從合理的時間開始，不用從 06:00 往下捲
// - 堂與堂之間可以有空檔，但不能重疊（驗證在 validateSlots）

import {
  DEFAULT_DURATION_MINUTES,
  EARLIEST_TIME,
  LATEST_TIME,
  MAX_SESSIONS,
  TIME_STEP_MINUTES,
  addMinutes,
  minutesOf,
  nextSlot,
  serializeSlots,
  toHHMM,
  type SessionSlotInput,
} from "../_lib/course-input";

const TIME_GROUPS: { label: string; from: number; to: number }[] = [
  { label: "上午", from: 0, to: 12 * 60 },
  { label: "下午", from: 12 * 60, to: 18 * 60 },
  { label: "晚上", from: 18 * 60, to: 24 * 60 },
];

const ALL_TIMES: string[] = [];
for (let m = EARLIEST_TIME; m <= LATEST_TIME; m += TIME_STEP_MINUTES) ALL_TIMES.push(toHHMM(m));

/** 時間選項：列出 min（含）～max（含）之間的時間，加上目前選的值；舊資料不在格點上的值也保留，避免編輯時被清掉 */
function TimeOptions({ current, min, max }: { current: string; min?: string; max?: string }) {
  const times = current && !ALL_TIMES.includes(current) ? [...ALL_TIMES, current].sort() : ALL_TIMES;
  // 目前選的值一定保留：例如上一堂延長後，這一堂的開始時間變成「早於可選範圍」，
  // 下拉選單仍要顯示實際的值，搭配下方的重疊錯誤，不能默默顯示成別的時間
  const visible = times.filter((t) => t === current || ((!min || t >= min) && (!max || t <= max)));
  return (
    <>
      <option value="" disabled>
        請選擇
      </option>
      {TIME_GROUPS.map((g) => {
        const items = visible.filter((t) => minutesOf(t) >= g.from && minutesOf(t) < g.to);
        return items.length === 0 ? null : (
          <optgroup key={g.label} label={g.label}>
            {items.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

const SELECT_CLASS =
  "w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2.5 sm:px-3 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink disabled:cursor-not-allowed disabled:opacity-60";

type Props = {
  slots: SessionSlotInput[];
  onChange: (slots: SessionSlotInput[]) => void;
  disabled?: boolean;
  error?: string;
};

export function SlotsEditor({ slots, onChange, disabled = false, error }: Props) {
  const next = nextSlot(slots);
  const last = slots.at(-1);
  const lastFilled = !!last?.start && !!last?.end;
  const canAdd = !disabled && slots.length < MAX_SESSIONS && next !== null;
  // 不能新增時告訴教練原因（上一堂還沒填完不用提示，填完自然就能按）
  const addBlockedReason = disabled
    ? null
    : slots.length >= MAX_SESSIONS
      ? `已達上限 ${MAX_SESSIONS} 堂`
      : lastFilled && next === null
        ? "下一堂會超過晚上 12:00，無法再新增"
        : null;

  function update(index: number, patch: Partial<SessionSlotInput>) {
    onChange(
      slots.map((slot, i) => {
        if (i !== index) return slot;
        const updated = { ...slot, ...patch };
        // 改了開始時間、結束時間還沒選或變成早於開始：結束時間自動帶入（沿用原本時長，沒有就 60 分鐘）
        if (patch.start && (!updated.end || updated.end <= updated.start)) {
          const prevDuration = slot.start && slot.end ? minutesOf(slot.end) - minutesOf(slot.start) : 0;
          updated.end = addMinutes(updated.start, prevDuration > 0 ? prevDuration : DEFAULT_DURATION_MINUTES) ?? "";
        }
        return updated;
      })
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-neutral-800">場次時間 *</span>

      <ol className="flex flex-col gap-2">
        {slots.map((slot, i) => {
          const prevEnd = i > 0 ? slots[i - 1].end : undefined;
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-11 shrink-0 text-xs font-semibold text-neutral-600 sm:w-12 sm:text-sm">第 {i + 1} 堂</span>
              <select
                aria-label={`第 ${i + 1} 堂開始時間`}
                value={slot.start}
                disabled={disabled}
                onChange={(e) => update(i, { start: e.target.value })}
                className={SELECT_CLASS}
              >
                <TimeOptions current={slot.start} min={prevEnd || undefined} max={toHHMM(LATEST_TIME - TIME_STEP_MINUTES)} />
              </select>
              <span className="text-neutral-400">–</span>
              <select
                aria-label={`第 ${i + 1} 堂結束時間`}
                value={slot.end}
                disabled={disabled}
                onChange={(e) => update(i, { end: e.target.value })}
                className={SELECT_CLASS}
              >
                <TimeOptions current={slot.end} min={slot.start ? addMinutes(slot.start, TIME_STEP_MINUTES) ?? undefined : undefined} />
              </select>
              {/* 手機寬度只顯示「＋」，把空間留給時間選單；sm 以上顯示完整文字 */}
              <div className="w-10 shrink-0 sm:w-28">
                {i === 0 ? (
                  <button
                    type="button"
                    onClick={() => next && onChange([...slots, next])}
                    disabled={!canAdd}
                    aria-label="新增一堂"
                    title={addBlockedReason ?? "新增一堂"}
                    className="h-10 w-full rounded-xl border border-brand text-base font-bold text-brand sm:text-xs transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
                  >
                    <span aria-hidden>＋</span>
                    <span className="hidden sm:inline"> 新增一堂</span>
                  </button>
                ) : (
                  !disabled && (
                    <button
                      type="button"
                      onClick={() => onChange(slots.filter((_, j) => j !== i))}
                      aria-label={`刪除第 ${i + 1} 堂`}
                      className="h-10 w-10 rounded-xl text-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {addBlockedReason && <p className="text-xs text-amber-700">{addBlockedReason}</p>}

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          每一堂都是獨立場次，各自計算名額與成團。「＋ 新增一堂」會接續上一堂、沿用上一堂的時長，最多 {MAX_SESSIONS} 堂。
        </p>
      )}

      <input type="hidden" name="session_slots" value={serializeSlots(slots)} />
    </div>
  );
}
