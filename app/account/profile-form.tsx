"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { updateDisplayName, type AccountFormState } from "./actions";
import { AvatarPicker } from "./avatar-picker";

const initialState: AccountFormState = {};

/** 基本資料：可以更換照片、改暱稱；Email 是註冊信箱，不能改。 */
export function ProfileForm({
  userId,
  displayName,
  avatarUrl,
  email,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
}) {
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
    <div className="flex flex-col gap-5">
      <AvatarPicker userId={userId} avatarUrl={avatarUrl}>
        {({ open, busy, error }) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="relative flex size-[82px] shrink-0 items-center justify-center overflow-hidden rounded-pill bg-tint-blue-200 text-text-primary"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill sizes="82px" className="object-cover" />
                ) : (
                  <Icon name="user" className="size-8" />
                )}
              </span>
              <button type="button" onClick={open} disabled={busy} className={buttonClassName("secondary")}>
                {busy ? "上傳中…" : "更換照片"}
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-caption text-state-error-text">
                {error}
              </p>
            ) : (
              <p className="text-caption text-text-secondary">支援 JPG、PNG，5MB 以內</p>
            )}
          </div>
        )}
      </AvatarPicker>

      <form action={formAction} noValidate className="flex flex-col gap-5">
        <TextField
          label="暱稱"
          name="displayName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={20}
          autoComplete="nickname"
        />

        <TextField label="Email" name="email" type="email" value={email} disabled readOnly hint="註冊信箱，無法修改" />

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
    </div>
  );
}
