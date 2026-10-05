import Link from "next/link";
import {
  isRegistrationActionable,
  REGISTRATION_BUTTON_LABELS,
  type RegistrationState,
} from "@/app/registrations/_lib/registration-rules";
import { loginHref } from "@/lib/courses/loginHref";
import { registerHref } from "@/lib/courses/registerHref";

const BUTTON_CLASS =
  "rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";

// 不能按時的文案：教練本人用設計稿 S05 的字；取消與結束分開寫，學員看得出原因
function disabledLabel(state: RegistrationState) {
  if (state.kind === "own_course") return "你是這堂課的教練，無法報名";
  if (state.kind === "unavailable") {
    if (state.reason === "cancelled") return "已取消";
    if (state.reason === "ended") return "已結束";
  }
  return REGISTRATION_BUTTON_LABELS[state.kind];
}

// 場次列上的報名按鈕，狀態由 Ted 的 getRegistrationState 決定
export default function SessionRegisterButton({
  state,
  courseId,
  sessionId,
}: {
  state: RegistrationState;
  courseId: string;
  sessionId: string;
}) {
  if (state.kind === "login_required") {
    // 登入後回到這一頁（#32）
    return (
      <Link href={loginHref(`/courses/${courseId}`)} className={BUTTON_CLASS}>
        {REGISTRATION_BUTTON_LABELS.login_required}
      </Link>
    );
  }

  if (state.kind === "can_register") {
    const href = registerHref(courseId, sessionId);
    if (href) {
      return (
        <Link href={href} className={BUTTON_CLASS}>
          {REGISTRATION_BUTTON_LABELS.can_register}
        </Link>
      );
    }
    // 報名流程畫面還沒有，先保持可按的樣子、沒有動作
    return (
      <button type="button" className={BUTTON_CLASS}>
        {REGISTRATION_BUTTON_LABELS.can_register}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!isRegistrationActionable(state)}
      className={BUTTON_CLASS}
    >
      {disabledLabel(state)}
    </button>
  );
}
