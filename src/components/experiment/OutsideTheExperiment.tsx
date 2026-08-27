import { todaysMarshmallowInvitation } from "@/domain/daily/todays-marshmallow";

export function OutsideTheExperiment({ tensionSlug }: { tensionSlug?: string | null }) {
  const invitation = todaysMarshmallowInvitation(tensionSlug);

  return (
    <div className="flex w-full max-w-[22rem] flex-col gap-2 border-t border-border/60 pt-5 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Outside the experiment
      </p>
      <p className="text-sm leading-6 break-words text-ink-muted">{invitation}</p>
      <p className="text-xs leading-5 text-ink-muted/80">
        No points. No proof. Nobody needs to know.
      </p>
    </div>
  );
}
