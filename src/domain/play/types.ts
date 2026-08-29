import type { PlayScreen } from "@/domain/play/view";
import type { DailyRoundProgress } from "@/domain/daily/round";
import type { ExperimentStage } from "@/domain/daily/experiment";
import type { Database } from "@/lib/supabase/types";
import type { TensionSide } from "@/domain/daily/tension";

type Status = Database["public"]["Enums"]["marshmallow_status"];

export type PlayChoice = {
  id: string;
  label: string;
  sort_order: number;
  tensionSide?: TensionSide | null;
};

export type PlayAllocation = {
  choice_id: string;
  predicted_pct: number;
};

export type RevealChoiceRow = {
  choiceId: string;
  label: string;
  sortOrder: number;
  youPct: number | null;
  votePct: number;
};

export type RevealPayload = {
  totalVotes: number;
  choices: RevealChoiceRow[];
  accuracy: number | null;
  basePoints: number | null;
  bonusPoints: number;
  bonusEarned: boolean;
  streakCurrent: number | null;
  streakQualified: boolean;
  crowdsenseRating: number | null;
  crowdsenseDelta: number | null;
};

export type PlayMarshmallow = {
  id: string;
  question: string;
  status: Status;
  opens_at: string;
  closes_at: string;
  reveals_at: string;
  hard_reveals_at: string;
  is_daily: boolean;
  play_mode: Database["public"]["Enums"]["play_mode"];
  topicName: string | null;
  entityLabel: string | null;
  spoilerContext: string | null;
  imageUrl: string | null;
  expiresAt: string | null;
  switchPrompt: string | null;
  switchStayed: boolean | null;
  switchOriginalChoiceId: string | null;
  isLine: boolean;
  choices: PlayChoice[];
  ownChoiceId: string | null;
  sealed: boolean;
  sealedAt: string | null;
  allocations: PlayAllocation[];
  openedReveal: boolean;
  screen: PlayScreen;
  nowIso: string;
  reveal: RevealPayload | null;
  nextHref: string;
  dailyRound?: DailyRoundProgress | null;
  roundPosition?: number | null;
  dailyNextHref?: string | null;
  requiresPrediction: boolean;
  experimentStage: ExperimentStage | null;
  isExperimentDaily: boolean;
  experimentPriorChoiceLabel: string | null;
  experimentPriorTensionSide: TensionSide | null;
  experimentCostType: string | null;
  experimentCostLabel: string | null;
  experimentArchetype: "default" | "price";
};
