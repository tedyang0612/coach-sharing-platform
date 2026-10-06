import Image from "next/image";
import knob from "./icons/misc/progress-knob.svg";

// Figma「Group Progress」25:787：報名進度（P03 詳情、S08 報名成功）。
// 上排「差 N 人開課／已達開課人數」＋「已報名／最低開課人數」，下排滑桿式進度條（軌道＋圓形旋鈕）。
// 進度以「最低開課人數」為滿格（Figma 範例 2 / 5 人＝40%）。
export function GroupProgress({
  enrolled,
  minParticipants,
}: {
  enrolled: number;
  minParticipants: number;
}) {
  const reached = enrolled >= minParticipants;
  const percent = Math.min(100, Math.round((enrolled / Math.max(1, minParticipants)) * 100));
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* Figma 字級 16px（tokens 沒有 16px 字級，已列待確認） */}
        <span className="text-[16px] font-medium leading-[18px] text-text-primary">
          {reached ? "已達開課人數" : `差 ${minParticipants - enrolled} 人開課`}
        </span>
        <span className="flex-1" />
        <span className="text-[16px] leading-5 text-text-secondary">
          <span className="font-[family-name:var(--font-latin)] font-medium">
            {enrolled} / {minParticipants}
          </span>{" "}
          人
        </span>
      </div>
      <div
        className="relative h-6 w-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={minParticipants}
        aria-valuenow={Math.min(enrolled, minParticipants)}
      >
        <div className="absolute inset-x-0 top-[7px] h-2.5 rounded-pill bg-tint-blue-200" />
        <div
          className="absolute left-0 top-[7px] h-2.5 rounded-pill bg-brand-blue"
          style={{ width: `${percent}%` }}
        />
        <Image
          src={knob}
          alt=""
          width={28}
          height={28}
          className="absolute top-[-3px] -translate-x-1/2"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}
