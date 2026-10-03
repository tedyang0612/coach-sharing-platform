"use client";

// 場次時間設定（10/3 組員討論後的版本）：教練逐堂設定開始／結束時間，每堂時長可以不同。
//   第 1 堂  [14]:[00] – [15]:[00]  [＋ 新增一堂]
//   第 2 堂  [15]:[00] – [16]:[30]  ✕
// - 時間拆成「小時（00–23）」與「分鐘（00、10…50）」兩個下拉選單；選了小時就自動帶分鐘（沿用原本的分鐘或 00）
// - 選了開始時間，結束時間自動帶 +60 分鐘；之後再調開始時間，結束時間跟著平移、保持時長
// - 「＋ 新增一堂」接續上一堂的結束時間、沿用上一堂的時長
// - 第 2 堂以後的開始時間只列出「上一堂結束之後」的選項；結束時間只列出晚於開始的選項
// - 堂與堂之間可以有空檔，但不能重疊（驗證在 validateSlots）

import {
  DEFAULT_DURATION_MINUTES,
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

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 60 / TIME_STEP_MINUTES }, (_, i) => pad(i * TIME_STEP_MINUTES));

const SELECT_CLASS =
  "w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink disabled:cursor-not-allowed disabled:opacity-60 sm:w-[4.5rem]";

/**
 * 一個時間＝小時＋分鐘兩個下拉選單。
 * min：可選的最早時間（含）；早於它的小時／分鐘不列出。目前選的值一定保留（例如上一堂延長後，
 * 這一堂的開始時間早於可選範圍，仍顯示實際的值，搭配下方的重疊錯誤）。
 */
function TimeSelect({
  value,
  min,
  onChange,
  disabled,
  label,
}: {
  value: string;
  min?: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
}) {
  const [hour, minute] = value ? value.split(":") : ["", ""];
  const minMinutes = min ? minutesOf(min) : 0;

  // 小時：這個小時裡至少有一個分鐘 ≥ min 才列出
  const hours = HOURS.filter((h) => h === hour || Number(h) * 60 + 50 >= minMinutes);
  // 分鐘：同一個小時時只列 ≥ min 的分鐘
  const minutes = MINUTES.filter((m) => m === minute || !hour || Number(hour) * 60 + Number(m) >= minMinutes);

  function pickHour(h: string) {
    // 沿用原本的分鐘；沒選過或會早於 min 時，改成這個小時裡最早可選的分鐘
    const keep = minute && Number(h) * 60 + Number(minute) >= minMinutes ? minute : undefined;
    const first = MINUTES.find((m) => Number(h) * 60 + Number(m) >= minMinutes) ?? "00";
    onChange(`${h}:${keep ?? first}`);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
      <select
        aria-label={`${label}（時）`}
        value={hour}
        disabled={disabled}
        onChange={(e) => pickHour(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="" disabled>
          時
        </option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-neutral-400">:</span>
      <select
        aria-label={`${label}（分）`}
        value={minute}
        disabled={disabled || !hour}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className={SELECT_CLASS}
      >
        <option value="" disabled>
          分
        </option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

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
        // 改開始時間時，結束時間跟著平移、保持原本的時長（還沒有時長就用預設 60 分鐘），
        // 例：14:00–15:00 把分鐘改成 30 → 14:30–15:30。超過當天最晚時間時保留原本的結束時間，交給驗證提示
        if (patch.start) {
          const prevDuration = slot.start && slot.end ? minutesOf(slot.end) - minutesOf(slot.start) : 0;
          const shifted = addMinutes(updated.start, prevDuration > 0 ? prevDuration : DEFAULT_DURATION_MINUTES);
          updated.end = shifted ?? (updated.end > updated.start ? updated.end : "");
        }
        return updated;
      })
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-neutral-800">場次時間 *</span>

      <ol className="flex flex-col gap-3 sm:gap-2">
        {slots.map((slot, i) => {
          const prevEnd = i > 0 ? slots[i - 1].end : undefined;
          return (
            // 手機：第一行「第 N 堂 ……… ＋／✕」，第二行時間；sm 以上排成一行
            <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap">
              <span className="w-12 shrink-0 text-sm font-semibold text-neutral-600">第 {i + 1} 堂</span>

              <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto">
                <TimeSelect
                  label={`第 ${i + 1} 堂開始時間`}
                  value={slot.start}
                  min={prevEnd || undefined}
                  onChange={(start) => update(i, { start })}
                  disabled={disabled}
                />
                <span className="text-neutral-400">–</span>
                <TimeSelect
                  label={`第 ${i + 1} 堂結束時間`}
                  value={slot.end}
                  min={slot.start ? addMinutes(slot.start, TIME_STEP_MINUTES) ?? toHHMM(LATEST_TIME) : undefined}
                  onChange={(end) => update(i, { end })}
                  disabled={disabled}
                />
              </div>

              <div className="order-2 ml-auto shrink-0 sm:order-3 sm:ml-0">
                {i === 0 ? (
                  <button
                    type="button"
                    onClick={() => next && onChange([...slots, next])}
                    disabled={!canAdd}
                    aria-label="新增一堂"
                    title={addBlockedReason ?? "新增一堂"}
                    className="h-10 rounded-xl border border-brand px-3 text-xs font-bold text-brand transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
                  >
                    ＋ 新增一堂
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
