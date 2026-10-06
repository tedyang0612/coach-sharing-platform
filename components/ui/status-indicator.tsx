import Image from "next/image";
import full from "./icons/status/full.svg";
import nearlyFull from "./icons/status/nearly-full.svg";
import reached from "./icons/status/reached.svg";
import recruiting from "./icons/status/recruiting.svg";

// Figma「Status Indicator」16:64：圓點＋狀態文字。學員端用「開課」，不使用「成團」。
export type SessionProgress =
  | { kind: "recruiting"; remaining: number } // 差 N 人開課（N ≥ 2）
  | { kind: "nearly-full" } // 差 1 人開課（螢光綠圓點）
  | { kind: "reached" } // 已達開課人數
  | { kind: "full" }; // 已額滿

const DOTS = { recruiting, "nearly-full": nearlyFull, reached, full };

/** 依報名人數算出進度：未達最低人數＝差 N 人開課；已達＝已達開課人數；達上限＝已額滿 */
export function getSessionProgress(input: {
  enrolled: number;
  minParticipants: number;
  maxParticipants: number;
}): SessionProgress {
  const { enrolled, minParticipants, maxParticipants } = input;
  if (enrolled >= maxParticipants) return { kind: "full" };
  if (enrolled >= minParticipants) return { kind: "reached" };
  const remaining = minParticipants - enrolled;
  return remaining === 1 ? { kind: "nearly-full" } : { kind: "recruiting", remaining };
}

export function progressLabel(progress: SessionProgress): string {
  switch (progress.kind) {
    case "full":
      return "已額滿";
    case "reached":
      return "已達開課人數";
    case "nearly-full":
      return "差 1 人開課";
    case "recruiting":
      return `差 ${progress.remaining} 人開課`;
  }
}

export function StatusIndicator({ progress }: { progress: SessionProgress }) {
  const dotSize = progress.kind === "nearly-full" ? 12 : 8;
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <Image src={DOTS[progress.kind]} alt="" width={dotSize} height={dotSize} />
      <span
        className={`text-label whitespace-nowrap ${progress.kind === "full" ? "text-text-secondary" : "text-text-primary"}`}
      >
        {progressLabel(progress)}
      </span>
    </span>
  );
}
