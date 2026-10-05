// Input／Select／Textarea 共用的欄位外觀（Figma 32:1051／32:1084／32:1107）：
// Default／Focused／Error／Disabled 由 CSS 狀態處理；邊框變 2px 時內距各少 1px，避免跳動。
export const FIELD_CLASSES =
  "text-body w-full rounded-md border border-border-default bg-brand-white px-4 py-3 text-text-primary outline-none transition placeholder:text-text-secondary focus:border-2 focus:border-brand-blue focus:px-[15px] focus:py-[11px] aria-invalid:border-2 aria-invalid:border-state-error aria-invalid:bg-state-error-bg aria-invalid:px-[15px] aria-invalid:py-[11px] disabled:bg-state-disabled-bg disabled:text-state-disabled-text";
