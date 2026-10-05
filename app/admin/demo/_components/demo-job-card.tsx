"use client";

// 一個排程項目的卡片：說明、待處理數量、「立即執行」按鈕與執行結果。
// 按下去先跳確認視窗，避免現場誤按（排程會真的改狀態、發通知、扣款或撥款）。

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { runDemoJob } from "../actions";
import { DEMO_JOB_INFO, formatJobResult, type DemoJob } from "../_lib/jobs";

export function DemoJobCard({ job, pendingText, pendingCount }: { job: DemoJob; pendingText: string; pendingCount: number }) {
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
    <li className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-default p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h3 text-text-primary">{info.title}</h2>
            <Badge type={pendingCount > 0 ? "info" : "neutral"}>{pendingText}</Badge>
          </div>
          <p className="text-body-small mt-1.5 text-text-secondary">{info.description}</p>
        </div>
        <Button type="button" onClick={run} loading={pending} loadingText="執行中">
          立即執行
        </Button>
      </div>

      {message?.kind === "error" && <FormError message={message.text} />}
      {message?.kind === "ok" && (
        <p role="status" className="text-body-small rounded-md bg-tint-blue-100 px-4 py-3 font-bold text-text-primary">
          {message.text}
        </p>
      )}
    </li>
  );
}
