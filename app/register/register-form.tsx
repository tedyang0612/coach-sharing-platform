"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { signup, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";

const initialState: AuthFormState = {};

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // React 19：表單 action 結束後會重置表單（reset），原生 checkbox 會被清成沒勾，但上面的 state 還是 true，
  // 畫面就變成「按鈕可按、方框沒勾」。同意與否改由 state 決定（hidden 欄位送出），
  // 並在每次送出結果回來後換一個 key 讓勾選框重新建立，畫面與 state 才會一致。
  const [seenState, setSeenState] = useState(state);
  const [checkboxKey, setCheckboxKey] = useState(0);
  if (state !== seenState) {
    setSeenState(state);
    setCheckboxKey((k) => k + 1);
  }

  // 8.0 QA 修正：按鈕只看「有沒有填」，不看格式對不對——
  // 格式／長度等驗證錯誤交給送出後的 server action 判斷，
  // 不然使用者會卡在「上面欄位格式錯但看不到錯誤提示、按鈕又按不下去」的情境。
  const canSubmit = useMemo(
    () => displayName.trim().length > 0 && email.trim().length > 0 && password.length > 0 && agreedToTerms,
    [displayName, email, password, agreedToTerms]
  );

  // 8.0 QA 修正：和登入頁一致，所有錯誤（暱稱長度、Email 格式、密碼長度、Email 已註冊）
  // 統一顯示在「建立帳號」上方的同一個紅框，欄位下面不再出現紅字。
  const errorMessage = [
    state?.errors?.displayName,
    state?.errors?.email,
    state?.errors?.password,
    state?.errors?.terms,
    state?.errors?.form,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <form
      action={formAction}
      // 8.0 QA 修正：noValidate 關掉瀏覽器原生的驗證泡泡（例如 Chrome 的
      // 「請在電子郵件地址中包含『@』」），避免跟我們自己的紅框錯誤提示
      // 同時出現、樣式不一致；所有驗證訊息統一走 FormError 紅框。
      noValidate
      className="mt-6 flex flex-col gap-4"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <TextField
        label="暱稱"
        name="displayName"
        placeholder="至少 2 個字元（最多 20 個字元）"
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        // 8.0 QA 決議：暱稱 2-20 個字元。maxLength 只能擋「打太長」，
        // 下限（至少 2 個字元）跟真正的字數判斷交給送出後的 server action（auth.ts）。
        maxLength={20}
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
        required
      />

      <TextField
        label="密碼"
        name="password"
        type="password"
        placeholder="至少 6 個字元"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {/* PRD v4.8 8.0：同意服務條款與隱私權政策（Figma S03：密碼欄下方、錯誤框上方）。
          連結開新分頁，免得填到一半的表單被帶走；未勾選時下方按鈕維持 disabled。 */}
      <input type="hidden" name="agreeTerms" value={agreedToTerms ? "on" : ""} />
      <CheckboxField
        key={checkboxKey}
        id="agree-terms"
        checked={agreedToTerms}
        onChange={(event) => setAgreedToTerms(event.target.checked)}
        invalid={!!state?.errors?.terms}
        label={
          <>
            我已閱讀並同意
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
              服務條款
            </Link>
            與
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
              隱私權政策
            </Link>
          </>
        }
      />

      {/* 「直接登入」連結已經在表單下方常駐出現（「已經有帳號了？直接登入」），
          這裡的錯誤框不再重複放一次連結，純粹顯示文案。 */}
      {errorMessage && <FormError message={errorMessage} />}

      <Button type="submit" fullWidth disabled={!canSubmit || pending}>
        {pending ? "建立帳號中…" : "建立帳號"}
      </Button>
    </form>
  );
}
