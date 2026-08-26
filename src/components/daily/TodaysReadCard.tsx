import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { TodaysRead } from "@/domain/daily/todays-read";

export function TodaysReadCard({
  read,
  homeHref = "/home",
  showHomeButton = true,
}: {
  read: TodaysRead;
  homeHref?: string;
  showHomeButton?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-2 py-8 text-center">
      <MarshmallowMascot state="sealed" size="lg" />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Today&apos;s read</p>
      <p className="max-w-[22rem] font-display text-[clamp(1.35rem,5.5vw,1.75rem)] leading-snug font-semibold tracking-tight break-words">
        {read.headline}
      </p>
      {read.lineCopy ? (
        <div className="max-w-[22rem] space-y-1 text-sm leading-6 text-ink-muted">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Your line</p>
          <p className="font-semibold text-ink">{read.lineCopy}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-1 text-sm font-semibold text-ink-muted">
        <p>
          {read.heldCount} answer{read.heldCount === 1 ? "" : "s"} held
        </p>
        {read.shiftedCount > 0 ? (
          <p>
            {read.shiftedCount} answer{read.shiftedCount === 1 ? "" : "s"} shifted
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Your calls are locked
        </p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          Crowd results will reveal separately.
        </p>
      </div>
      {showHomeButton ? <PrimaryButton href={homeHref}>HOME</PrimaryButton> : null}
    </div>
  );
}
