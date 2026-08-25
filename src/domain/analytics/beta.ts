export const SESSION_IDLE_SECONDS = 1800;

export type Rate = {
  numerator: number;
  denominator: number;
  value: number | null;
};

export function rate(numerator: number, denominator: number): Rate {
  return {
    numerator,
    denominator,
    value: denominator <= 0 ? null : numerator / denominator,
  };
}

export function formatRate(value: Rate): string {
  if (value.value == null) return "—";
  return `${Math.round(value.value * 1000) / 10}%`;
}

export type ModeRrr = {
  play_mode: string;
  eligible_sealed_reveals: number;
  first_reveal_opens: number;
  rrr: number | null;
};

export type BetaHealth = {
  users: { signups: number; onboarded: number; first_seal: number };
  activation: {
    median_first_seal_seconds: number | null;
    median_first_payoff_seconds: number | null;
    quick_sealers: number;
    quick_continued: number;
    first_session_multi_play: number;
    session_idle_seconds: number;
  };
  returnByMode: ModeRrr[];
  continuation: {
    reveal_opens: number;
    reveal_completions: number;
    next_play: number;
    multi_seal: number;
    scored: number;
    qualified: number;
  };
  skill: {
    qualified: number;
    mean_accuracy: number | null;
    median_accuracy: number | null;
    mean_crowdsense: number | null;
    median_crowdsense: number | null;
  };
  viral: { shares: number; reveal_openers: number };
  abandonment: {
    onboarded_never_viewed: number;
    viewed_no_answer: number;
    answered_never_sealed: number;
    sealed_quick_no_chain: number;
    quick_ready_never_opened: number;
    daily_ready_never_returned: number;
    revealed_never_played_again: number;
  };
};

function num(value: unknown): number {
  return Number(value ?? 0);
}

function opt(value: unknown): number | null {
  return value == null ? null : Number(value);
}

export function parseModeRrr(value: unknown): ModeRrr[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      play_mode: String(item.play_mode ?? ""),
      eligible_sealed_reveals: num(item.eligible_sealed_reveals),
      first_reveal_opens: num(item.first_reveal_opens),
      rrr: opt(item.rrr),
    };
  });
}

export function parseBetaHealth(value: unknown): BetaHealth {
  const row = (value ?? {}) as Record<string, unknown>;
  const users = (row.users ?? {}) as Record<string, unknown>;
  const activation = (row.activation ?? {}) as Record<string, unknown>;
  const continuation = (row.continuation ?? {}) as Record<string, unknown>;
  const skill = (row.skill ?? {}) as Record<string, unknown>;
  const viral = (row.viral ?? {}) as Record<string, unknown>;
  const abandonment = (row.abandonment ?? {}) as Record<string, unknown>;
  const ret = (row.return ?? {}) as Record<string, unknown>;
  return {
    users: {
      signups: num(users.signups),
      onboarded: num(users.onboarded),
      first_seal: num(users.first_seal),
    },
    activation: {
      median_first_seal_seconds: opt(activation.median_first_seal_seconds),
      median_first_payoff_seconds: opt(activation.median_first_payoff_seconds),
      quick_sealers: num(activation.quick_sealers),
      quick_continued: num(activation.quick_continued),
      first_session_multi_play: num(activation.first_session_multi_play),
      session_idle_seconds: num(activation.session_idle_seconds || SESSION_IDLE_SECONDS),
    },
    returnByMode: parseModeRrr(ret.by_mode),
    continuation: {
      reveal_opens: num(continuation.reveal_opens),
      reveal_completions: num(continuation.reveal_completions),
      next_play: num(continuation.next_play),
      multi_seal: num(continuation.multi_seal),
      scored: num(continuation.scored),
      qualified: num(continuation.qualified),
    },
    skill: {
      qualified: num(skill.qualified),
      mean_accuracy: opt(skill.mean_accuracy),
      median_accuracy: opt(skill.median_accuracy),
      mean_crowdsense: opt(skill.mean_crowdsense),
      median_crowdsense: opt(skill.median_crowdsense),
    },
    viral: {
      shares: num(viral.shares),
      reveal_openers: num(viral.reveal_openers),
    },
    abandonment: {
      onboarded_never_viewed: num(abandonment.onboarded_never_viewed),
      viewed_no_answer: num(abandonment.viewed_no_answer),
      answered_never_sealed: num(abandonment.answered_never_sealed),
      sealed_quick_no_chain: num(abandonment.sealed_quick_no_chain),
      quick_ready_never_opened: num(abandonment.quick_ready_never_opened),
      daily_ready_never_returned: num(abandonment.daily_ready_never_returned),
      revealed_never_played_again: num(abandonment.revealed_never_played_again),
    },
  };
}

export type ContentHealthRow = {
  id: string;
  question: string;
  play_mode: string;
  status: string;
  opens_at: string;
  topic_id: string | null;
  topic_name: string | null;
  choice_count: number;
  views: number;
  sealed: number;
  eligible_reveals: number;
  reveal_opens: number;
  average_accuracy: number | null;
  next_play: number;
  shares: number;
  archetype: string;
  freshness: string;
  sample_size: number | null;
  quick_continuation: number;
};

export function parseContentHealth(value: unknown): ContentHealthRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: String(item.id ?? ""),
      question: String(item.question ?? ""),
      play_mode: String(item.play_mode ?? ""),
      status: String(item.status ?? ""),
      opens_at: String(item.opens_at ?? ""),
      topic_id: item.topic_id == null ? null : String(item.topic_id),
      topic_name: item.topic_name == null ? null : String(item.topic_name),
      choice_count: num(item.choice_count),
      views: num(item.views),
      sealed: num(item.sealed),
      eligible_reveals: num(item.eligible_reveals),
      reveal_opens: num(item.reveal_opens),
      average_accuracy: opt(item.average_accuracy),
      next_play: num(item.next_play),
      shares: num(item.shares),
      archetype: String(item.archetype ?? "freeform"),
      freshness: String(item.freshness ?? "timely"),
      sample_size: opt(item.sample_size),
      quick_continuation: num(item.quick_continuation),
    };
  });
}

export type ContentComparison = {
  key: string;
  label: string;
  views: number;
  sealed: number;
  sealRate: Rate;
  eligible: number;
  opens: number;
  revealRate: Rate;
  nextPlay: Rate;
  shares: number;
  shareRate: Rate;
  accuracySum: number;
  accuracyN: number;
  averageAccuracy: number | null;
};

export function compareContent(
  rows: readonly ContentHealthRow[],
  groupBy: (row: ContentHealthRow) => { key: string; label: string },
): ContentComparison[] {
  const groups = new Map<string, ContentComparison>();
  for (const row of rows) {
    const { key, label } = groupBy(row);
    const existing = groups.get(key) ?? {
      key,
      label,
      views: 0,
      sealed: 0,
      sealRate: rate(0, 0),
      eligible: 0,
      opens: 0,
      revealRate: rate(0, 0),
      nextPlay: rate(0, 0),
      shares: 0,
      shareRate: rate(0, 0),
      accuracySum: 0,
      accuracyN: 0,
      averageAccuracy: null,
    };
    existing.views += row.views;
    existing.sealed += row.sealed;
    existing.eligible += row.eligible_reveals;
    existing.opens += row.reveal_opens;
    existing.nextPlay = rate(existing.nextPlay.numerator + row.next_play, existing.opens);
    existing.shares += row.shares;
    if (row.average_accuracy != null) {
      existing.accuracySum += row.average_accuracy * Math.max(1, row.sealed);
      existing.accuracyN += Math.max(1, row.sealed);
    }
    existing.sealRate = rate(existing.sealed, existing.views);
    existing.revealRate = rate(existing.opens, existing.eligible);
    existing.shareRate = rate(existing.shares, existing.opens);
    existing.averageAccuracy =
      existing.accuracyN <= 0 ? null : existing.accuracySum / existing.accuracyN;
    groups.set(key, existing);
  }
  return [...groups.values()];
}

export type BetaCohort = {
  week: string;
  users: number;
  onboarded: number;
  first_seal: number;
  first_quick_payoff: number;
  daily_reveal_return: number;
  second_seal: number;
  qualified_5: number;
};

export type QuickInventory = {
  open: number;
  cooking: number;
  ready: number;
  promoted_open: number;
  promoted_target: number;
  warn_below: number;
  warning: boolean;
};

export type QuickTestBoardRow = {
  id: string;
  question: string;
  status: string;
  opens_at: string;
  closes_at: string;
  reveals_at: string;
  hard_reveals_at: string;
  minimum_result_sample: number;
  result_available_at: string | null;
  quick_priority: number | null;
  sealed_count: number;
  ready_to_finalize: boolean;
};

export type QuickTestSession = {
  inventory: QuickInventory;
  eligible_players: number;
  board: QuickTestBoardRow[];
};

export function parseQuickTestSession(value: unknown): QuickTestSession {
  const row = (value ?? {}) as Record<string, unknown>;
  const inventory = (row.inventory ?? {}) as Record<string, unknown>;
  const board = Array.isArray(row.board) ? row.board : [];
  return {
    inventory: {
      open: num(inventory.open),
      cooking: num(inventory.cooking),
      ready: num(inventory.ready),
      promoted_open: num(inventory.promoted_open),
      promoted_target: num(inventory.promoted_target || 3),
      warn_below: num(inventory.warn_below || 5),
      warning: Boolean(inventory.warning),
    },
    eligible_players: num(row.eligible_players),
    board: board.map((item) => {
      const rowItem = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(rowItem.id ?? ""),
        question: String(rowItem.question ?? ""),
        status: String(rowItem.status ?? ""),
        opens_at: String(rowItem.opens_at ?? ""),
        closes_at: String(rowItem.closes_at ?? ""),
        reveals_at: String(rowItem.reveals_at ?? ""),
        hard_reveals_at: String(rowItem.hard_reveals_at ?? ""),
        minimum_result_sample: num(rowItem.minimum_result_sample),
        result_available_at:
          rowItem.result_available_at == null ? null : String(rowItem.result_available_at),
        quick_priority:
          rowItem.quick_priority == null || rowItem.quick_priority === ""
            ? null
            : num(rowItem.quick_priority),
        sealed_count: num(rowItem.sealed_count),
        ready_to_finalize: Boolean(rowItem.ready_to_finalize),
      };
    }),
  };
}

export type PromotedQuickHealth = {
  revealed: number;
  views: number;
  sealed: number;
  median_sample: number | null;
  reached_minimum_before_hard: number;
};

export type QuickSampleHealth = {
  revealed_quicks: number;
  median_sample: number | null;
  reached_minimum_before_target: number;
  required_extension: number;
  hit_hard_maximum: number;
  zero_response: number;
  promoted: PromotedQuickHealth;
};

export function parseQuickSampleHealth(value: unknown): QuickSampleHealth {
  const row = (value ?? {}) as Record<string, unknown>;
  const promoted = (row.promoted ?? {}) as Record<string, unknown>;
  return {
    revealed_quicks: num(row.revealed_quicks),
    median_sample: opt(row.median_sample),
    reached_minimum_before_target: num(row.reached_minimum_before_target),
    required_extension: num(row.required_extension),
    hit_hard_maximum: num(row.hit_hard_maximum),
    zero_response: num(row.zero_response),
    promoted: {
      revealed: num(promoted.revealed),
      views: num(promoted.views),
      sealed: num(promoted.sealed),
      median_sample: opt(promoted.median_sample),
      reached_minimum_before_hard: num(promoted.reached_minimum_before_hard),
    },
  };
}

export type ModePayoffMetrics = {
  quick: {
    first_seal: number;
    continued: number;
    first_payoff: number;
    eligible_reveals: number;
    reveal_opens: number;
    avg_sample: number | null;
    median_payoff_seconds: number | null;
  };
  daily: {
    seals: number;
    eligible_reveals: number;
    reveal_opens: number;
    median_return_delay_seconds: number | null;
  };
  live: {
    seals: number;
    reveal_opens: number;
    eligible_reveals: number;
  };
};

export function parseModePayoffMetrics(value: unknown): ModePayoffMetrics {
  const row = (value ?? {}) as Record<string, unknown>;
  const quick = (row.quick ?? {}) as Record<string, unknown>;
  const daily = (row.daily ?? {}) as Record<string, unknown>;
  const live = (row.live ?? {}) as Record<string, unknown>;
  return {
    quick: {
      first_seal: num(quick.first_seal),
      continued: num(quick.continued),
      first_payoff: num(quick.first_payoff),
      eligible_reveals: num(quick.eligible_reveals),
      reveal_opens: num(quick.reveal_opens),
      avg_sample: opt(quick.avg_sample),
      median_payoff_seconds: opt(quick.median_payoff_seconds),
    },
    daily: {
      seals: num(daily.seals),
      eligible_reveals: num(daily.eligible_reveals),
      reveal_opens: num(daily.reveal_opens),
      median_return_delay_seconds: opt(daily.median_return_delay_seconds),
    },
    live: {
      seals: num(live.seals),
      reveal_opens: num(live.reveal_opens),
      eligible_reveals: num(live.eligible_reveals),
    },
  };
}

export function parseBetaCohorts(value: unknown): BetaCohort[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      week: String(item.week ?? ""),
      users: num(item.users),
      onboarded: num(item.onboarded),
      first_seal: num(item.first_seal),
      first_quick_payoff: num(item.first_quick_payoff),
      daily_reveal_return: num(item.daily_reveal_return),
      second_seal: num(item.second_seal),
      qualified_5: num(item.qualified_5),
    };
  });
}
