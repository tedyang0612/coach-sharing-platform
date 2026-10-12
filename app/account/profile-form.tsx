"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { updateDisplayName, type AccountFormState } from "./actions";

const initialState: AccountFormState = {};

/** 基本資料：暱稱可以改，Email 是註冊信箱不能改。更換照片尚未開放（PRD 還沒有定義，之後會補）。 */
export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, initialState);
  const [name, setName] = useState(displayName);
  // 沒改過（或和已儲存的一樣）就不用按儲存
  const [saved, setSaved] = useState(displayName);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.saved) setSaved(name.trim());
  }
  const changed = name.trim() !== saved;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-[82px] shrink-0 items-center justify-center rounded-pill bg-tint-blue-200 text-text-primary"
        >
          <Icon name="user" className="size-8" />
        </span>
        {/* 設計稿有「更換照片」；學員頭像的規格 PRD 還沒定義，先顯示但不能按 */}
        <button
          type="button"
          disabled
          title="即將推出"
          className="text-label h-11 rounded-pill border border-border-default px-5 text-text-primary disabled:cursor-not-allowed disabled:border-state-disabled-bg disabled:text-state-disabled-text"
        >
          更換照片
        </button>
        <span className="text-caption text-text-secondary">即將推出</span>
      </div>

      <TextField
        label="暱稱"
        name="displayName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={20}
        autoComplete="nickname"
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        value={email}
        disabled
        readOnly
        hint="註冊信箱，無法修改"
      />

      {state.error && <FormError message={state.error} />}
      {state.saved && !changed && (
        <p role="status" className="text-body-small text-text-secondary">
          已儲存
        </p>
      )}

      <div>
        <Button type="submit" disabled={!changed || pending}>
          {pending ? "儲存中…" : "儲存"}
        </Button>
      </div>
    </form>
  );
}
