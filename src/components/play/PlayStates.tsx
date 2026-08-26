import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { CountdownDisplay } from "@/components/CountdownDisplay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { playModeTimingCopy, type PlayMode } from "@/domain/play/mode";
import { formatWaitPresentation } from "@/lib/format/duration";
import type { DailyRoundProgress } from "@/domain/daily/round";
import Link from "next/link";

function HomeCta() {
  return <PrimaryButton href="/home">HOME</PrimaryButton>;
}

function HomeLink() {
  return (
    <Link href="/home" className="min-h-11 text-sm font-semibold text-primary">
      Home
    </Link>
  );
}

function WaitStatus({
  presentation,
}: {
  presentation: ReturnType<typeof formatWaitPresentation>;
}) {
  return (
    <div className="max-w-[20rem] space-y-1 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
        {presentation.status}
      </p>
      {presentation.countdown ? (
        <CountdownDisplay value={presentation.countdown} />
      ) : (
        <p className="font-display text-xl font-semibold leading-snug">{presentation.detail}</p>
      )}
    </div>
  );
}

export function CancelledView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="toasted" size="lg" />
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Closed early</p>
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        This Marshmallow was closed early.
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        This Marshmallow won&apos;t publish a crowd result.
      </p>
      <HomeCta />
    </div>
  );
}

export function MissedView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="sealed" size="lg" />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        This Marshmallow is sealed.
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        The crowd is locked in.
      </p>
      <HomeCta />
    </div>
  );
}

export function RevealReadyPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="celebrating" size="lg" />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Ready</p>
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        Your Marshmallow is ready.
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        Reveal opens next. No results are shown here yet.
      </p>
    </div>
  );
}

export function RevealedSpectatorView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="sealed" size="lg" />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        This Marshmallow has been revealed.
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        You didn&apos;t play this one, so there&apos;s no personal score to open.
      </p>
      <HomeCta />
    </div>
  );
}

export function ScheduledView({ opensAt }: { opensAt: string }) {
  const local = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(opensAt));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="fluffy" size="lg" />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        Not open yet.
      </h1>
      <p className="text-sm text-ink-muted">Opens {local}.</p>
      <HomeCta />
    </div>
  );
}

export function FinishingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="cooking" size="lg" heat={2} />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        We&apos;re finishing the count.
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        Your Marshmallow will be ready shortly.
      </p>
      <HomeCta />
    </div>
  );
}

export function StillCookingView({
  nextHref,
  showPlayAnother,
}: {
  nextHref?: string;
  showPlayAnother?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
      <MarshmallowMascot state="cooking" size="lg" heat={2} />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        Still cooking
      </h1>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        We&apos;re waiting for a few more players.
      </p>
      {showPlayAnother && nextHref ? (
        <>
          <PrimaryButton href={nextHref}>PLAY ANOTHER</PrimaryButton>
          <HomeLink />
        </>
      ) : (
        <HomeCta />
      )}
    </div>
  );
}

export function WaitingCopy({
  choiceLabel,
  predictedPct,
  revealsAt,
  closesAt,
  remainingMs,
  nextHref,
  showPlayAnother,
  playMode,
  waitingForSample,
  dailyRound,
}: {
  choiceLabel: string;
  predictedPct: number | null;
  revealsAt: string;
  closesAt?: string;
  remainingMs: number;
  nextHref?: string;
  showPlayAnother?: boolean;
  playMode?: PlayMode;
  waitingForSample?: boolean;
  dailyRound?: DailyRoundProgress;
}) {
  const expired = remainingMs <= 0;
  const heat: 0 | 1 | 2 = expired ? 2 : remainingMs < 90_000 ? 1 : 0;
  const cooking = expired || remainingMs < 180_000 || waitingForSample;
  const mode = playMode ?? "quick";
  const isQuick = mode === "quick";
  const presentation = formatWaitPresentation({
    playMode: mode,
    remainingMs,
    revealsAt,
    closesAt,
    waitingForSample,
  });

  if (dailyRound?.allSealed) {
    return (
      <div className="flex flex-1 flex-col items-center gap-5 px-2 py-8 text-center">
        <MarshmallowMascot state="sealed" size="lg" />
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Daily sealed</p>
        <p className="font-display text-2xl font-semibold">{dailyRound.title}</p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          5 calls locked · Come back for the reveal
        </p>
        <PrimaryButton href="/home">HOME</PrimaryButton>
      </div>
    );
  }

  if (isQuick) {
    return (
      <div className="flex flex-1 flex-col items-center gap-5 px-2 py-8 text-center">
        <MarshmallowMascot state={cooking ? "cooking" : "sealed"} size="lg" heat={heat} />
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Call locked</p>
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold">You picked {choiceLabel}.</p>
          {predictedPct != null ? (
            <p className="text-base text-ink-muted">
              You think {predictedPct}% of players agree.
            </p>
          ) : null}
        </div>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          Let&apos;s see how well you read the room.
        </p>
        <WaitStatus presentation={presentation} />
        {showPlayAnother && nextHref ? (
          <>
            <PrimaryButton href={nextHref}>PLAY ANOTHER</PrimaryButton>
            <HomeLink />
          </>
        ) : (
          <HomeCta />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 px-2 py-8 text-center">
      <MarshmallowMascot state={cooking ? "cooking" : "sealed"} size="lg" heat={heat} />
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Sealed</p>
      <div>
        <p className="text-sm text-ink-muted">You picked</p>
        <p className="font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight break-words">
          {choiceLabel}
        </p>
      </div>
      {predictedPct != null ? (
        <p className="text-base">You predicted {predictedPct}%.</p>
      ) : null}
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        {playModeTimingCopy(mode)}
      </p>
      <WaitStatus presentation={presentation} />
      <HomeCta />
    </div>
  );
}
