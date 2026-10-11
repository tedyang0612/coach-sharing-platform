import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_CONTENT } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "服務條款｜夠練 GoLand",
  description: "夠練 GoLand 服務條款，包含報名、開課確認、取消與退款規定。",
};

export default function Page() {
  return <LegalDocument title="服務條款" content={TERMS_CONTENT} />;
}
