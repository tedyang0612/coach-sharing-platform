import Link from "next/link";
import {
  isRegistrationActionable,
  REGISTRATION_BUTTON_LABELS,
  type RegistrationState,
} from "@/app/registrations/_lib/registration-rules";
import { registerHref } from "@/app/registrations/_lib/routes";
import { loginHref } from "@/lib/courses/loginHref";

const BUTTON_CLASS =
  "text-button rounded-full bg-(--color-brand-blue) px-5 py-2 text-(--color-text-inverse) transition hover:bg-(--color-brand-blue-pressed) disabled:cursor-not-allowed disabled:bg-(--color-state-disabled-bg) disabled:text-(--color-state-disabled-text)";

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
  fullWidth = false,
}: {
  state: RegistrationState;
  courseId: string;
  sessionId: string;
  // 英雄區的主按鈕要撐滿資訊卡寬度
  fullWidth?: boolean;
}) {
  // 連結（<a>）預設是行內元素，撐滿寬度要加 block
  const buttonClass = fullWidth ? `${BUTTON_CLASS} block w-full text-center` : BUTTON_CLASS;
  if (state.kind === "login_required") {
    // 登入後回到這一頁（#32）
    return (
      <Link href={loginHref(`/courses/${courseId}`)} className={buttonClass}>
        {REGISTRATION_BUTTON_LABELS.login_required}
      </Link>
    );
  }

  if (state.kind === "can_register") {
    // 報名流程（健康聲明 → 結帳 → 成功頁）的入口由 Ted 的 routes.ts 提供，不自己組網址
    return (
      <Link href={registerHref(sessionId)} className={buttonClass}>
        {REGISTRATION_BUTTON_LABELS.can_register}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={!isRegistrationActionable(state)}
      className={buttonClass}
    >
      {disabledLabel(state)}
    </button>
  );
}
