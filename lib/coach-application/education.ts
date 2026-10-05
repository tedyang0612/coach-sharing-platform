/**
 * 個人學歷與工作／教學經歷。
 *
 * 表單上學歷是「學位＋學校科系」可以新增多筆，工作／教學經歷是一段選填的文字。
 * 兩者都存在 coach_profiles.bio_education（學經歷）這個文字欄位裡，不用改資料庫，
 * 管理員在後台審核時也能直接讀懂。格式：
 *
 *   學士｜臺北市立大學水上運動學系
 *   博士｜美國春田學院體育
 *   【工作／教學經歷】
 *   知名健身房 5 年教練經驗
 *
 * 其他頁面要顯示時請用 parseEducation()，不要自己拆字串。
 */

// 選項與預設值依設計稿 C01（2026-10-05 PM 確認）
export const EDUCATION_DEGREES = ["高中職", "學士", "專科", "碩士", "博士"] as const;
// 新增一筆學歷時先選好「學士」，教練需要時再改
export const DEFAULT_EDUCATION_DEGREE = "學士";
// 改版前學士與專科是同一個選項，舊資料讀出來時當成學士，教練可以再改
const LEGACY_DEGREES: Record<string, string> = { "學士／專科": "學士" };

export type EducationEntry = { degree: string; school: string };

const SEPARATOR = "｜";
const WORK_EXPERIENCE_MARKER = "【工作／教學經歷】";

export function formatEducation(entries: EducationEntry[], workExperience: string): string {
  const lines = entries.map((entry) => `${entry.degree}${SEPARATOR}${entry.school.trim()}`);
  const experience = workExperience.trim();
  if (experience) lines.push(WORK_EXPERIENCE_MARKER, experience);
  return lines.join("\n");
}

/** 把資料庫裡的文字還原成學歷清單與工作／教學經歷。 */
export function parseEducation(text: string): {
  entries: EducationEntry[];
  workExperience: string;
} {
  const markerIndex = text.indexOf(WORK_EXPERIENCE_MARKER);
  const educationText = markerIndex === -1 ? text : text.slice(0, markerIndex);
  const workExperience =
    markerIndex === -1 ? "" : text.slice(markerIndex + WORK_EXPERIENCE_MARKER.length).trim();

  const entries = educationText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      // 不符合格式的行（例如舊資料）整行當成學校科系
      const index = line.indexOf(SEPARATOR);
      if (index === -1) return { degree: "", school: line };
      const degree = line.slice(0, index);
      return { degree: LEGACY_DEGREES[degree] ?? degree, school: line.slice(index + 1) };
    });

  return { entries, workExperience };
}
