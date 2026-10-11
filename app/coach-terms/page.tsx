import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { COACH_TERMS_CONTENT } from "@/lib/legal/coach-terms";

export const metadata: Metadata = {
  title: "教練合作條款｜夠練 GoLand",
  description: "夠練 GoLand 教練刊登與提供課程的合作條款。",
};

export default function Page() {
  return <LegalDocument title="教練合作條款" content={COACH_TERMS_CONTENT} />;
}
