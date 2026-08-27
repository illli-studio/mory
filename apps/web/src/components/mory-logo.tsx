import { cn } from "../lib/utils";

export function MoryLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      className={cn("mory-logo", className)}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Mory"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 31V15.5L16.2 23L20 17L23.8 23L31 15.5V31" stroke="#245F51" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12.5H31" stroke="#73B49E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M13 8.5H27" stroke="#B8D6CB" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="32" r="2" fill="#73B49E" />
    </svg>
  );
}
