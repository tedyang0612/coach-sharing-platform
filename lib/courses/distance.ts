import type { Course } from "./types";

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Haversine 公式；假資料階段在前端算，換成真資料後可改用資料庫的 earthdistance。
export function distanceKm(a: Coordinates, b: Coordinates) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface CourseWithDistance {
  course: Course;
  distanceKm: number | null;
}

// 近的在前；沒有座標的課程放最後，保持原本順序。
export function sortByDistance(
  courses: Course[],
  origin: Coordinates,
): CourseWithDistance[] {
  return courses
    .map((course) => ({
      course,
      distanceKm:
        course.latitude != null && course.longitude != null
          ? distanceKm(origin, { lat: course.latitude, lng: course.longitude })
          : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}
