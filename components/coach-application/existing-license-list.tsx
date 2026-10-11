"use client";

import type { LicenseStatus } from "@/types/database";

export type ExistingLicense = {
  id: string;
  name: string;
  status: LicenseStatus;
  rejectionReason?: string | null;
};

const STATUS_LABELS: Record<LicenseStatus, string> = {
  pending: "審核中",
  approved: "已通過",
  rejected: "未通過",
};

type ExistingLicenseListProps = {
  licenses: ExistingLicense[];
  // 這次要移除的證照；送出／儲存時才真的刪除
  removedIds: string[];
  onRemovedIdsChange: (next: string[]) => void;
};

/** 已經上傳過的證照清單：顯示審核狀態，未通過或審核中的可以移除（已通過的關係到徽章，不能自己移除）。 */
export function ExistingLicenseList({
  licenses,
  removedIds,
  onRemovedIdsChange,
}: ExistingLicenseListProps) {
  if (licenses.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {licenses.map((license) => {
        const removed = removedIds.includes(license.id);
        return (
          <li
            key={license.id}
            className={`rounded-md border px-4 py-3 ${
              !removed && license.status === "rejected" ? "border-state-error" : "border-border-default"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-body min-w-0 ${
                  removed ? "text-state-disabled-text line-through" : "text-text-primary"
                }`}
              >
                {license.name || "未命名證照"}
                <span className="text-caption ml-2 text-text-secondary">
                  {removed ? "送出後移除" : STATUS_LABELS[license.status]}
                </span>
              </span>
              {license.status !== "approved" && (
                <button
                  type="button"
                  onClick={() =>
                    onRemovedIdsChange(
                      removed
                        ? removedIds.filter((id) => id !== license.id)
                        : [...removedIds, license.id]
                    )
                  }
                  className="text-label shrink-0 text-brand-deep underline underline-offset-4"
                >
                  {removed ? "復原" : "移除"}
                </button>
              )}
            </div>
            {!removed && license.status === "rejected" && license.rejectionReason && (
              <p className="text-body-small mt-2 whitespace-pre-line text-state-error-text">
                原因：{license.rejectionReason}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
