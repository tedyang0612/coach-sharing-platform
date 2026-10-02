// 共用錯誤提示樣式：圖示 + 粉底紅框，登入／註冊頁共用，避免兩邊各寫一套。
// 文字支援 \n 換行（white-space: pre-line），用於「此 Email 已被註冊...」這類多行訊息。
export function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-1.5 shrink-0"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p className="whitespace-pre-line text-sm font-bold leading-[1.75] text-red-700">
        {message}
      </p>
    </div>
  );
}
