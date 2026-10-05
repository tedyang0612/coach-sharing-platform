"use client";

// 一個排程項目的卡片（Figma A01「Job」）：標題、說明、待處理數量、執行按鈕、執行結果與最近一次紀錄。
// 按下去先跳確認視窗，避免現場誤按（排程會真的改狀態、發通知、扣款或撥款）。

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { runDemoJob } from "../actions";
import { DEMO_JOB_INFO, formatJobResult, type DemoJob } from "../_lib/jobs";

export function DemoJobCard({
  job,
  pendingText,
  pendingCount,
  lastRun,
}: {
  job: DemoJob;
  pendingText: string;
  pendingCount: number;
  /** 例如「10/5 15:30　處理 3 個場次」；沒有紀錄為 null */
  lastRun: string | null;
}) {
  const info = DEMO_JOB_INFO[job];
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function run() {
    if (!window.confirm(`確定要立即執行「${info.title}」嗎？\n${info.confirmText}`)) return;
    setMessage(null);
    startTransition(async () => {
      const state = await runDemoJob(job);
      setMessage(state.ok ? { kind: "ok", text: formatJobResult(state.result) } : { kind: "error", text: state.error });
    });
  }

  return (
    <li className="flex list-none flex-col items-start gap-3 rounded-lg border border-border-default bg-brand-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h3 text-text-primary">{info.title}</h2>
        <Badge type={pendingCount > 0 ? "info" : "neutral"}>{pendingText}</Badge>
      </div>
      <p className="text-body-small text-text-secondary">{info.description}</p>
      <Button type="button" onClick={run} loading={pending} loadingText="執行中">
        {info.button}
      </Button>
      {message?.kind === "error" && <FormError message={message.text} />}
      {message?.kind === "ok" && (
        <p role="status" className="text-body-small rounded-md bg-tint-blue-100 px-4 py-3 font-bold text-text-primary">
          {message.text}
        </p>
      )}
      <p className="text-caption text-text-secondary">{lastRun ? `最近一次：${lastRun}` : "尚未手動執行過"}</p>
    </li>
  );
}
