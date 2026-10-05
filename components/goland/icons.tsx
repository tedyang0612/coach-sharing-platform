// 線條圖示，取自設計師交接包 design/assets/icons（24px 畫布、2px 線條、currentColor 跟著文字色）。
// 要新增請從那個資料夾複製，名稱沿用檔名（map-pin、calendar…），不要自己畫。
import type { ReactNode } from "react";

function Icon({
  size = 16,
  children,
}: {
  size?: number;
  children: ReactNode;
}) {
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
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

type Props = { size?: number };

export function MapPinIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M12 22C12 22 20 16 20 10C20 7.87827 19.1571 5.84344 17.6569 4.34315C16.1566 2.84285 14.1217 2 12 2C9.87827 2 7.84344 2.84285 6.34315 4.34315C4.84285 5.84344 4 7.87827 4 10C4 16 12 22 12 22Z" />
      <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" />
    </Icon>
  );
}

export function CalendarIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" />
      <path d="M16 2V6M8 2V6M3 10H21" />
    </Icon>
  );
}

export function TagIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M12 2H2V12L11.29 21.29C12.23 22.23 13.77 22.23 14.71 21.29L21.29 14.71C22.23 13.77 22.23 12.23 21.29 11.29L12 2Z" />
      <path d="M7 7H7.01" />
    </Icon>
  );
}

export function UsersIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21" />
      <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" />
      <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" />
      <path d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" />
    </Icon>
  );
}

export function ShareIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" />
      <path d="M16 6L12 2L8 6" />
      <path d="M12 2V15" />
    </Icon>
  );
}

export function CheckIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M20 6L9 17L4 12" />
    </Icon>
  );
}

export function ChevronDownIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M6 9L12 15L18 9" />
    </Icon>
  );
}

export function ArrowLeftIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M19 12H5M12 5L5 12L12 19" />
    </Icon>
  );
}

export function ArrowRightIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M5 12H19M12 19L19 12L12 5" />
    </Icon>
  );
}

export function StarIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </Icon>
  );
}
