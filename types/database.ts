/**
 * 手寫的資料庫型別，對應 supabase/migrations/ 底下的 schema。
 *
 * 之後跑過 migration、專案有 Supabase CLI 連線後，建議改用官方指令重新產生，
 * 會更準確（尤其是 Postgres 的 enum/nullable 細節）：
 *
 *   supabase gen types typescript --project-id <你的 project ref> > types/database.ts
 *
 * 在那之前，團隊先共用這份手寫版本就好，改 schema 記得回來同步更新。
 */

export type UserRole = "coach" | "learner";

export type CertificationStatus = "unverified" | "pending" | "verified";

export type CourseStatus = "draft" | "published" | "cancelled" | "completed";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export type RegistrationStatus =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "cancelled";

export type ReportStatus = "open" | "reviewed" | "dismissed";

/**
 * 建議的運動類型選項（UI 下拉選單用）。
 * courses.sport_type 在資料庫層是一般文字欄位，不是寫死的 enum，
 * 所以之後要加新類型，直接在這裡加一個字串就好，不用跑 migration。
 */
export const SPORT_TYPES = [
  "重訓",
  "瑜伽",
  "跑步",
  "游泳",
  "羽球",
  "籃球",
  "桌球",
  "其他",
] as const;

export type SportType = (typeof SPORT_TYPES)[number] | (string & {});

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  phone: string | null;
  coach_tagline: string | null;
  certification_status: CertificationStatus;
  certification_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  sport_type: SportType;
  level: CourseLevel;
  location: string;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string;
  min_participants: number;
  max_participants: number;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  course_id: string;
  learner_id: string;
  status: RegistrationStatus;
  health_declaration_agreed: boolean;
  health_declaration_agreed_at: string;
  created_at: string;
  cancelled_at: string | null;
}

export interface Review {
  id: string;
  course_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  course_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

/**
 * 各表 insert 時允許帶的欄位（有 default 值或由 trigger 補上的欄位設成 optional）。
 * 用法範例：const payload: CourseInsert = { coach_id, title, sport_type, ... }
 */
export type ProfileInsert = Pick<Profile, "id" | "role" | "display_name"> &
  Partial<Pick<Profile, "phone" | "coach_tagline">>;

export type CourseInsert = Pick<
  Course,
  | "coach_id"
  | "title"
  | "sport_type"
  | "level"
  | "location"
  | "start_time"
  | "end_time"
  | "min_participants"
  | "max_participants"
> &
  Partial<
    Pick<Course, "description" | "latitude" | "longitude" | "status">
  >;

export type RegistrationInsert = Pick<
  Registration,
  "course_id" | "learner_id" | "health_declaration_agreed"
>;

export type ReviewInsert = Pick<
  Review,
  "course_id" | "reviewer_id" | "reviewee_id" | "rating"
> &
  Partial<Pick<Review, "comment">>;

export type ReportInsert = Pick<
  Report,
  "reporter_id" | "reported_id" | "reason"
> &
  Partial<Pick<Report, "course_id">>;
