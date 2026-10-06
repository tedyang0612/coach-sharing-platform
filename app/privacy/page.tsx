import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { PRIVACY_CONTENT } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "隱私權政策｜夠練 GoLand",
  description: "夠練 GoLand 如何蒐集、處理及利用個人資料。",
};

export default function Page() {
  return <LegalDocument title="隱私權政策" content={PRIVACY_CONTENT} />;
}
