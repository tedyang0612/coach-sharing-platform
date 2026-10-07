// 教練群發公告的長度上限。PRD 沒有規定，先設一個合理的上限避免貼入過長內容
export const ANNOUNCEMENT_MAX_LENGTH = 500;

// 會收到公告的報名狀態：未取消的報名學員，含待確認開課（PRD 7.0 規格 4）。
// 已取消、已退款、部分退款、課程完成都不算。
export const ACTIVE_REGISTRATION_STATUSES = ["pending_match", "confirmed"] as const;
