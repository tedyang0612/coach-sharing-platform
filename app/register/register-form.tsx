"use client";

import { useActionState, useMemo, useState } from "react";
import { signup, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: AuthFormState = {};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(
    () => displayName.trim().length > 0 && EMAIL_RE.test(email) && password.length >= 6,
    [displayName, email, password]
  );

  const alreadyRegistered = state?.errors?.form?.includes("已被註冊") ?? false;

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <TextField
        label="暱稱"
        name="displayName"
        placeholder="你的暱稱"
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={state?.errors?.displayName}
        required
      />

      <TextField
        label="電子信箱"
        name="email"
        type="email"
        placeholder="user@example.com"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={state?.errors?.email}
        required
      />

      <TextField
        label="密碼"
        name="password"
        type="password"
        placeholder="至少 6 碼"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state?.errors?.password}
        required
      />

      {state?.errors?.form && (
        <p className="text-sm text-red-600">
          {state.errors.form}
          {alreadyRegistered && (
            <>
              {" "}
              <a href="/login" className="font-semibold text-brand hover:underline">
                直接登入
              </a>
            </>
          )}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit || pending}>
        {pending ? "建立帳號中…" : "免費註冊"}
      </Button>
    </form>
  );
}
