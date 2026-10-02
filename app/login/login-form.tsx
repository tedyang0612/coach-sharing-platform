"use client";

import { useActionState, useMemo, useState } from "react";
import { login, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";

const initialState: AuthFormState = {};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // AC：格式錯誤或欄位空白時，按鈕維持 disabled
  const canSubmit = useMemo(
    () => EMAIL_RE.test(email) && password.length > 0,
    [email, password]
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

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
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state?.errors?.password}
        required
      />

      {/* 記住我：預設勾選＝沿用 Supabase 預設行為（session 存 localStorage，
          關閉瀏覽器下次打開仍是登入狀態）。取消勾選本次 sprint 不做差異化行為。*/}
      <CheckboxField label="記住我" name="rememberMe" defaultChecked />

      {state?.errors?.form && <FormError message={state.errors.form} />}

      <Button type="submit" disabled={!canSubmit || pending}>
        {pending ? "登入中…" : "登入平台"}
      </Button>
    </form>
  );
}
