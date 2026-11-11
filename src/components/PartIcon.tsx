import type { Slot } from "@/lib/specs";

const SHAPES: Record<Slot, React.ReactNode> = {
  cpu: (
    <>
      <rect x="14" y="14" width="36" height="36" rx="3" />
      <rect x="23" y="23" width="18" height="18" rx="1" />
      <path d="M22 14V6M32 14V6M42 14V6M22 58v-8M32 58v-8M42 58v-8M14 22H6M14 32H6M14 42H6M58 22h-8M58 32h-8M58 42h-8" />
    </>
  ),
  motherboard: (
    <>
      <rect x="8" y="6" width="48" height="52" rx="3" />
      <rect x="15" y="13" width="16" height="16" rx="1" />
      <path d="M38 13v20M43 13v20M48 13v20M15 38h34M15 46h34" />
    </>
  ),
  ram: (
    <>
      <path d="M4 20h56v20H52v4H12v-4H4z" />
      <path d="M12 26h8v8h-8zM24 26h8v8h-8zM36 26h8v8h-8zM48 26h4v8h-4z" />
    </>
  ),
  gpu: (
    <>
      <rect x="4" y="16" width="56" height="28" rx="3" />
      <circle cx="20" cy="30" r="9" />
      <circle cx="44" cy="30" r="9" />
      <path d="M20 21v18M11 30h18M44 21v18M35 30h18M10 44v6h24v-6" />
    </>
  ),
  storage: (
    <>
      <rect x="4" y="22" width="56" height="20" rx="2" />
      <rect x="10" y="27" width="12" height="10" rx="1" />
      <rect x="26" y="27" width="12" height="10" rx="1" />
      <path d="M46 27v10M51 27v10" />
    </>
  ),
  psu: (
    <>
      <rect x="6" y="12" width="52" height="40" rx="3" />
      <circle cx="32" cy="32" r="13" />
      <path d="M32 19v26M19 32h26M23 23l18 18M41 23L23 41" />
    </>
  ),
  cooler: (
    <>
      <path d="M12 8h40M12 14h40M12 20h40M12 26h40M12 32h40M12 38h40" />
      <path d="M22 8v36M42 8v36" />
      <rect x="16" y="44" width="32" height="12" rx="2" />
    </>
  ),
  case: (
    <>
      <rect x="14" y="4" width="36" height="56" rx="3" />
      <circle cx="32" cy="18" r="7" />
      <circle cx="32" cy="36" r="7" />
      <path d="M22 50h20" />
    </>
  ),
};

export function PartIcon({ slot, className }: { slot: Slot; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {SHAPES[slot]}
    </svg>
  );
}
