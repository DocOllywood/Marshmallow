import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import {
  formatScheduledExperimentOpen,
  scheduledExperimentHeadline,
  type ScheduledExperimentPreview,
} from "@/domain/daily/scheduled-preview";

export function ScheduledExperimentHomeSection({
  preview,
}: {
  preview: ScheduledExperimentPreview;
}) {
  const headline = scheduledExperimentHeadline(preview.archetype);
  const { weekdayLine, dateTimeLine } = formatScheduledExperimentOpen(preview.opensAt);

  return (
    <section
      aria-labelledby="next-experiment-heading"
      className="flex flex-col items-center gap-5 rounded-2xl border border-money-border bg-money-soft/50 px-5 py-9 text-center"
    >
      <p
        id="next-experiment-heading"
        className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase"
      >
        The next experiment
      </p>
      <MarshmallowMascot state="fluffy" size="lg" aria-hidden />
      <p className="font-display text-[clamp(1.65rem,7vw,2rem)] leading-[1.05] font-semibold tracking-tight text-money uppercase">
        {headline}
      </p>
      <div className="space-y-2 text-sm leading-6 text-ink">
        <p>{weekdayLine}</p>
        <p className="text-xs font-semibold tracking-[0.18em] text-ink uppercase">{dateTimeLine}</p>
      </div>
      <p className="text-xs font-semibold tracking-[0.2em] text-money-muted uppercase">
        Come back then
      </p>
    </section>
  );
}
