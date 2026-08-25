export const LEADERBOARD_TABS = [
  { id: "overall", label: "Overall" },
  { id: "reality-tv", label: "Reality TV" },
  { id: "celebrity", label: "Celebrity" },
  { id: "pop-culture", label: "Pop Culture" },
  { id: "internet-culture", label: "Internet" },
  { id: "weekly", label: "This Week" },
] as const;

export type LeaderboardTab = (typeof LEADERBOARD_TABS)[number];
export type LeaderboardTabId = LeaderboardTab["id"];

export function isLeaderboardTabId(value: string | undefined): value is LeaderboardTabId {
  return LEADERBOARD_TABS.some((tab) => tab.id === value);
}
