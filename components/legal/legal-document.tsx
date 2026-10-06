import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  // 條款全文：`## ` 是章或條的標題、`### ` 是章底下的條，其餘每一行是一段
  content: string;
};

const DOCUMENTS = [
  { href: "/terms", label: "服務條款" },
  { href: "/privacy", label: "隱私權政策" },
  { href: "/coach-terms", label: "教練合作條款" },
];

// 其他頁面會直接連到「取消與退款」這一章（例如結帳頁、我的課程）
function headingId(text: string): string | undefined {
  return text.includes("取消與退款") ? "refund" : undefined;
}

/**
 * 服務條款、隱私權政策、教練合作條款共用的版面。
 * 內容是純文字，不需要 Markdown 套件：只認兩層標題與段落。
 */
export function LegalDocument({ title, content }: LegalDocumentProps) {
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-3xl">
        <nav aria-label="條款與聲明" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {DOCUMENTS.map((doc) =>
            doc.label === title ? (
              <span key={doc.href} className="font-semibold text-text-primary">
                {doc.label}
              </span>
            ) : (
              <Link key={doc.href} href={doc.href} className="text-brand-deep underline underline-offset-4 hover:no-underline">
                {doc.label}
              </Link>
            )
          )}
        </nav>

        <h1 className="mt-6 text-2xl font-bold text-text-primary">{title}</h1>

        <p className="mt-4 rounded-xl border border-border-default bg-brand-ink px-4 py-3 text-sm leading-relaxed text-text-secondary">
          本平台為學習專題的展示版本，付款為模擬流程；本文件為草稿，經營者名稱與聯絡方式為模擬資料。
        </p>

        <div className="mt-6 flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
          {lines.map((line, index) => {
            if (line.startsWith("### ")) {
              return (
                <h3 key={index} className="mt-4 text-base font-semibold text-text-primary">
                  {line.slice(4)}
                </h3>
              );
            }
            if (line.startsWith("## ")) {
              const text = line.slice(3);
              // 只有「第○章」才畫分隔線；沒有分章的文件，條的標題不需要每條都隔開
              if (!/^第.+章/.test(text)) {
                return (
                  <h2 key={index} className="mt-4 text-base font-semibold text-text-primary">
                    {text}
                  </h2>
                );
              }
              return (
                <h2
                  key={index}
                  id={headingId(text)}
                  className="mt-8 scroll-mt-6 border-t border-border-default pt-6 text-lg font-bold text-text-primary"
                >
                  {text}
                </h2>
              );
            }
            // 「　（一）」這種以全形空白開頭的是條文底下的細項，縮排顯示
            const isSubItem = line.startsWith("　");
            return (
              <p key={index} className={isSubItem ? "pl-6" : undefined}>
                {line.trim()}
              </p>
            );
          })}
        </div>
      </article>
    </main>
  );
}
