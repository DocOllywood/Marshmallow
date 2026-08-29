import { cn } from "@/lib/utils";

export const MASCOT_STATES = [
  "fluffy",
  "thinking",
  "sealed",
  "cooking",
  "toasted",
  "celebrating",
] as const;

export type MascotState = (typeof MASCOT_STATES)[number];
export type MascotSize = "sm" | "md" | "lg" | "hero";

const SIZE_PX: Record<MascotSize, number> = {
  sm: 48,
  md: 88,
  lg: 128,
  hero: 176,
};

const STATE_LABEL: Record<MascotState, string> = {
  fluffy: "Fluffy marshmallow",
  thinking: "Thinking marshmallow",
  sealed: "Sealed marshmallow",
  cooking: "Cooking marshmallow",
  toasted: "Toasted marshmallow",
  celebrating: "Celebrating marshmallow",
};

const BODY_TRANSFORM: Record<MascotState, string> = {
  fluffy: "translate(0 0)",
  thinking: "rotate(-5 40 52) scale(1.03 0.95)",
  sealed: "translate(0 2.2) scale(1.08 0.9)",
  cooking: "rotate(3.5 40 52) scale(1.02 0.97)",
  toasted: "translate(0 1) scale(1.05 0.96)",
  celebrating: "translate(0 -1.5) scale(0.96 1.06)",
};

type MarshmallowMascotProps = {
  state?: MascotState | "waiting";
  size?: MascotSize;
  className?: string;
  title?: string;
  /** 0–5 progressive sage glow depth for experiment stages (optional). */
  accentDepth?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Cooking warmth only. 0 cool, 1 warm, 2 almost ready. Timestamps only — never results. */
  heat?: 0 | 1 | 2;
  /** 0–100 lean while predicting. Visual only — never authoritative. */
  predictionLean?: number;
};

export function resolveMascotState(state: MascotState | "waiting" | undefined): MascotState {
  if (state === "waiting" || state == null) return state === "waiting" ? "cooking" : "fluffy";
  return state;
}

export function MarshmallowMascot({
  state = "fluffy",
  size = "md",
  className,
  title,
  accentDepth = 0,
  heat = 0,
  predictionLean,
}: MarshmallowMascotProps) {
  const resolved = resolveMascotState(state);
  const px = SIZE_PX[size];
  const toasted = resolved === "toasted" || resolved === "celebrating";
  const cooking = resolved === "cooking" || heat > 0;
  const vanilla = "var(--mascot-vanilla)";
  const line = "var(--mascot-line)";
  const lean =
    resolved === "thinking" && predictionLean != null
      ? Math.max(0, Math.min(100, predictionLean))
      : null;
  const bodyTransform =
    lean != null
      ? `rotate(${(lean - 50) * 0.1} 40 52) scale(${1.02 + Math.abs(lean - 50) * 0.00035} ${0.965 - Math.abs(lean - 50) * 0.00025})`
      : BODY_TRANSFORM[resolved];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 80 80"
      role="img"
      data-state={resolved}
      aria-label={title ?? STATE_LABEL[resolved]}
      className={cn(
        "mascot",
        `mascot-${resolved}`,
        lean != null && "mascot-thinking-live",
        className,
      )}
      overflow="visible"
    >
      {accentDepth > 0 ? (
        <ellipse
          cx="40"
          cy="52"
          rx={22 + accentDepth * 0.8}
          ry={24 + accentDepth * 0.6}
          fill="var(--mascot-accent)"
          opacity={0.08 + accentDepth * 0.025}
          aria-hidden
        />
      ) : null}
      {resolved === "celebrating" ? <Sparks /> : null}
      <ellipse cx="40" cy="73.5" rx="15" ry="3.2" fill="var(--ink)" opacity="0.1" />
      <g className="mascot-body" transform={bodyTransform}>
        <path d={PUFF} fill={toasted ? "var(--toasted-canvas)" : vanilla} stroke={line} strokeWidth="2.35" strokeLinejoin="round" />
        <path d={PUFF_INNER} fill="none" stroke={line} strokeWidth="1.15" opacity="0.14" />
        <path d="M30 18.5c6-3.5 14-3 18 1" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity="0.45" />
        {cooking ? (
          <path
            d="M22 50c3 14 34 16 40 2-5 12-32 16-40-2Z"
            fill="var(--toasted)"
            opacity={0.22 + heat * 0.18}
          />
        ) : null}
        {toasted ? <ToastPatches rich={resolved === "toasted"} /> : null}
        {resolved === "sealed" ? <SealMark /> : null}
        {resolved === "cooking" ? (
          <>
            <ellipse cx="27.5" cy="47" rx="4.6" ry="2.8" fill="var(--toasted)" opacity="0.32" />
            <ellipse cx="52.5" cy="47" rx="4.6" ry="2.8" fill="var(--toasted)" opacity="0.32" />
          </>
        ) : null}
        <Face state={resolved} lean={lean} />
      </g>
    </svg>
  );
}

/** Asymmetric standing puff: dome top, heavier seat, one fatter side. */
const PUFF =
  "M25.2 32.5C23 16.5 34.2 7.2 44.6 8.6C58.4 10.4 68.6 20.8 65.8 38.4C64.2 53.6 57.4 65.8 41.8 69.2C24.6 73 16.8 60.4 18.6 44.2C19.4 38.4 21.8 35 25.2 32.5Z";

const PUFF_INNER =
  "M27.4 33.2C25.8 19.4 35.2 11.4 44.2 12.6C55.8 14.2 64.2 23.2 62 38C60.6 51.2 54.8 61.6 42.2 64.4C28.4 67.6 22.2 56.8 23.6 43.4C24.2 38.6 25.8 35.4 27.4 33.2Z";

function SealMark() {
  return (
    <g>
      <path
        d="M21.5 44.5c7.5-4.5 29-5.5 38.5.6"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5.2"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx="54" cy="56.5" r="7.4" fill="var(--primary)" />
      <circle cx="54" cy="56.5" r="4.5" fill="none" stroke="#fff" strokeWidth="1.15" opacity="0.75" />
      <path d="M51.6 56.5h4.8M54 54.1v4.8" stroke="#fff" strokeWidth="1.05" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function ToastPatches({ rich }: { rich: boolean }) {
  return (
    <g fill="var(--toasted)" opacity={rich ? 0.52 : 0.34}>
      <path d="M29 20c6-4 14-2 12 6-6 2-12 1-12-6Z" />
      <path d="M50 28c7 1 10 10 4 16-8-2-12-10-4-16Z" />
      <path d="M26 48c10 8 24 9 28-1-10 8-24 6-28 1Z" />
    </g>
  );
}

function Sparks() {
  return (
    <g>
      <circle cx="11" cy="20" r="2.05" fill="var(--primary)" />
      <circle cx="69" cy="16" r="1.55" fill="var(--toasted)" />
      <circle cx="68" cy="56" r="1.7" fill="var(--mode-daily)" />
      <rect x="14" y="54" width="3" height="3" rx="0.5" fill="var(--primary)" transform="rotate(22 15.5 55.5)" />
    </g>
  );
}

function Face({ state, lean }: { state: MascotState; lean?: number | null }) {
  const line = "var(--mascot-line)";
  const mouthTilt = lean != null ? (lean - 50) * 0.012 : 0;

  if (state === "thinking") {
    return (
      <>
        <path d="M27.5 28.5c2.4-3.4 6.2-3.2 8.2.4" fill="none" stroke={line} strokeWidth="2.05" strokeLinecap="round" />
        <circle cx="31.5" cy="37.2" r="3.15" fill={line} />
        <circle cx="50.2" cy={35.4 + mouthTilt} r="3.15" fill={line} />
        <circle cx="32.6" cy="35.9" r="1" fill="#fff" />
        <circle cx="51.3" cy={34.1 + mouthTilt} r="1" fill="#fff" />
        <path
          d={`M34 49.5c3.2 ${1.4 + mouthTilt} 8.4 ${1.2 - mouthTilt} 11.2-1.6`}
          fill="none"
          stroke={line}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (state === "sealed") {
    return (
      <>
        <circle cx="32" cy="37.5" r="2.7" fill={line} />
        <circle cx="48" cy="37.5" r="2.7" fill={line} />
        <path d="M34.5 48.5h11" stroke={line} strokeWidth="2.35" strokeLinecap="round" />
      </>
    );
  }

  if (state === "cooking") {
    return (
      <>
        <circle cx="32" cy="37" r="3.55" fill={line} />
        <circle cx="48.2" cy="37" r="3.55" fill={line} />
        <circle cx="33.3" cy="35.6" r="1.15" fill="#fff" />
        <circle cx="49.5" cy="35.6" r="1.15" fill="#fff" />
        <path d="M35.5 51.5c2.2-3.2 7.6-3.2 9.8 0" fill="none" stroke={line} strokeWidth="2.2" strokeLinecap="round" />
      </>
    );
  }

  if (state === "toasted") {
    return (
      <>
        <path d="M27.5 38c2.4-4.6 7-4.6 9.2 0" fill="none" stroke={line} strokeWidth="2.45" strokeLinecap="round" />
        <path d="M43.5 38c2.4-4.6 7-4.6 9.2 0" fill="none" stroke={line} strokeWidth="2.45" strokeLinecap="round" />
        <path d="M30.5 49c5.4 7 13.6 7 19 0" fill="none" stroke={line} strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
  }

  if (state === "celebrating") {
    return (
      <>
        <path d="M26.5 37c2.6-5.6 7.6-5.6 10 0" fill="none" stroke={line} strokeWidth="2.55" strokeLinecap="round" />
        <path d="M43.5 37c2.6-5.6 7.6-5.6 10 0" fill="none" stroke={line} strokeWidth="2.55" strokeLinecap="round" />
        <path d="M27.5 48c8.2 12 16.8 12 25 0" fill="none" stroke={line} strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }

  return (
    <>
      <circle cx="32" cy="37.2" r="3.15" fill={line} />
      <circle cx="48.2" cy="37.2" r="3.15" fill={line} />
      <circle cx="33.15" cy="36" r="1" fill="#fff" />
      <circle cx="49.35" cy="36" r="1" fill="#fff" />
      <path d="M32.5 49.2c4.4 4.2 11.2 4.2 15.2-.6" fill="none" stroke={line} strokeWidth="2.35" strokeLinecap="round" />
    </>
  );
}
