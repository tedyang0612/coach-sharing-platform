// 「我的課程」專用的兩個線條圖示，取自設計師交接包 design/assets/icons（search、plus）。
function Icon({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ size = 24 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" />
      <path d="M21 21L16.7 16.7" />
    </Icon>
  );
}

// 設計稿的關閉鈕是 ×：用 plus 旋轉 45 度
export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-block rotate-45">
      <Icon size={size}>
        <path d="M12 5V19M5 12H19" />
      </Icon>
    </span>
  );
}
