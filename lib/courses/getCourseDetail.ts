import type { CourseBase } from "./types";
import { MOCK_COURSES } from "./mockCourses";

// 對應 Ted 的 sessions：報名、開課人數都以場次為單位。
export interface CourseSession {
  id: string;
  startsAt: string; // ISO 8601
  endsAt: string;
  enrolled: number;
  status: "open" | "cancelled";
}

export interface CourseDetail extends CourseBase {
  description: string;
  notes: string | null;
  address: string;
  status: "published" | "cancelled" | "completed";
  sessions: CourseSession[];
}

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;

// 假資料：每堂課每週一次、共 3 個場次；列表（getCourses）與詳情頁共用這份。
export function buildMockSessions(course: CourseBase): CourseSession[] {
  const start = new Date(course.startsAt).getTime();
  return [0, 1, 2].map((i) => ({
    id: `${course.id}-s${i + 1}`,
    startsAt: new Date(start + i * WEEK).toISOString(),
    endsAt: new Date(start + i * WEEK + 2 * HOUR).toISOString(),
    // 第一場沿用假資料的人數，其餘場次人數較少，方便看出各場次不同
    enrolled: i === 0 ? course.enrolled : Math.max(0, course.enrolled - i * 2),
    status: "open",
  }));
}

// TODO: Ted 的資料層（PR #7）進 main 後，改成查 courses＋sessions（join districts），
// 場次報名人數用 get_session_enrollment_counts；頁面與元件不用動。
function toDetail(course: CourseBase): CourseDetail {
  const sessions = buildMockSessions(course);
  return {
    ...course,
    description: `${course.coachName}帶你練${course.sport}，從基本功開始，小班制，現場會依每個人的狀況調整。`,
    notes: "請穿著運動服裝，自備水壺與毛巾。",
    address: `${course.city}${course.district}（${course.venue}）`,
    status: "published",
    sessions,
  };
}

export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  const course = MOCK_COURSES.find((c) => c.id === id);
  return course ? toDetail(course) : null;
}
