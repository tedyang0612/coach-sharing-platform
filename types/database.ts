// 教練共課平台 — 資料庫型別
// 依 PRD v4.0（凍版）第六章「系統資料與運作邏輯」整理
// 之後若有 Supabase CLI 存取權，建議改用：
//   supabase gen types typescript --project-id <ref> > types/database.ts

export type CoachApplicationStatus = "pending" | "approved" | "needs_more_info" | "rejected";
export type LicenseStatus = "pending" | "approved" | "rejected";

export type CourseLevel = "unlimited" | "beginner" | "intermediate"; // 不限／初級／中級
export type CourseStatus = "draft" | "published" | "cancelled";

export type SessionStatus =
  | "open" // 招生中
  | "matched" // 已成團
  | "cancelled_unmatched" // 未成團取消
  | "cancelled_by_coach" // 教練取消
  | "completed"; // 已結束

export type RegistrationStatus =
  | "pending_match" // 已報名（待成團）
  | "confirmed" // 訂單成立
  | "cancelled" // 已取消（未扣款）
  | "refunded" // 已退款（全額）
  | "partial_refunded" // 部分退款（扣30%手續費）
  | "completed"; // 課程完成

// MVP 建議的運動項目清單（PRD 1.0：以重訓、瑜珈為主，另含抱石/衝浪/跑酷）
// sport_type 欄位本身是自由文字，不是資料庫層級 enum，之後要加新類型不用跑 migration
export const SPORT_TYPES = ["重訓", "瑜珈", "抱石", "衝浪", "跑酷"] as const;
export type SportType = (typeof SPORT_TYPES)[number] | (string & {});

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachProfile {
  id: string; // = profiles.id
  photo_url: string;
  sport_categories: string[];
  tags: string[]; // 上限 5 個，每個建議 10 字內
  years_experience: number | null;
  bio_education: string;
  bio_competition: string | null;
  bio_intro: string;

  // 審核用，不公開
  contact_phone: string | null;
  contact_line: string | null;
  contact_email: string | null;
  contact_social: string | null;
  criminal_record_url: string | null; // 審核完 7 天後會被排程清掉
  criminal_record_uploaded_at: string;
  criminal_record_deleted: boolean;
  consent_at: string;

  application_status: CoachApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface CoachLicense {
  id: string;
  coach_id: string;
  file_url: string;
  status: LicenseStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  sport_type: SportType;
  level: CourseLevel;

  location_name: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;

  session_date: string; // date
  time_range_start: string; // time
  time_range_end: string; // time
  session_duration_minutes: number;

  price_per_person: number;
  min_participants: number;
  max_participants: number;
  registration_deadline_hours: number; // 預設 24，教練可調更大（更早截止）

  status: CourseStatus;
  is_template: boolean;
  template_source_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  course_id: string;
  start_at: string;
  end_at: string;
  registration_deadline_at: string;
  status: SessionStatus;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  session_id: string;
  learner_id: string;
  health_declaration_agreed: boolean;
  health_declaration_agreed_at: string;
  payment_method: string | null;
  amount: number;
  status: RegistrationStatus;
  charged_at: string | null;
  cancelled_at: string | null;
  refund_amount: number | null;
  refund_fee_amount: number | null;
  payout_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  registration_id: string;
  coach_id: string;
  reviewer_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  session_id: string;
  coach_id: string;
  content: string;
  sent_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  email_sent: boolean;
  is_read: boolean;
  created_at: string;
}

export interface Payout {
  id: string;
  coach_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  platform_fee_amount: number;
  net_amount: number;
  payout_date: string;
  created_at: string;
}

// Insert helper types（省略資料庫會自動帶的欄位：id / created_at / updated_at / 狀態預設值等）
export type ProfileInsert = Pick<Profile, "id" | "display_name">;

export type CoachProfileInsert = Pick<
  CoachProfile,
  | "id"
  | "photo_url"
  | "sport_categories"
  | "bio_education"
  | "bio_intro"
  | "criminal_record_url"
> &
  Partial<
    Pick<
      CoachProfile,
      | "tags"
      | "years_experience"
      | "bio_competition"
      | "contact_phone"
      | "contact_line"
      | "contact_email"
      | "contact_social"
    >
  >;

export type CourseInsert = Pick<
  Course,
  | "coach_id"
  | "title"
  | "sport_type"
  | "level"
  | "location_name"
  | "location_address"
  | "session_date"
  | "time_range_start"
  | "time_range_end"
  | "session_duration_minutes"
  | "price_per_person"
  | "min_participants"
  | "max_participants"
> &
  Partial<Pick<Course, "description" | "notes" | "latitude" | "longitude" | "registration_deadline_hours">>;

export type RegistrationInsert = Pick<Registration, "session_id" | "learner_id" | "health_declaration_agreed"> &
  Partial<Pick<Registration, "payment_method">>;
