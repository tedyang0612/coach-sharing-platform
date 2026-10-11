import { type TextareaHTMLAttributes } from "react";
import { Textarea } from "@/components/ui/textarea";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** 多行輸入框：外觀交給共用的 Textarea，這裡只保留教練申請原本的用法。 */
export function TextAreaField(props: TextAreaFieldProps) {
  return <Textarea {...props} />;
}
