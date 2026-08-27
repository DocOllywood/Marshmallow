import type { ExperimentMovementFeedback as Feedback } from "@/domain/daily/experiment-play";

export function ExperimentMovementFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
      {feedback === "held" ? "YOU HELD." : "YOU MOVED."}
    </p>
  );
}
