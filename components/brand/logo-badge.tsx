const SIZE_CLASSES = {
  sm: "h-10 w-10 text-base",
  md: "h-14 w-14 text-2xl",
} as const;

export function LogoBadge({ size = "md" }: { size?: keyof typeof SIZE_CLASSES }) {
  return (
    <span
      className={`flex ${SIZE_CLASSES[size]} items-center justify-center rounded-2xl bg-brand font-bold text-white`}
      aria-hidden
    >
      夠
    </span>
  );
}
