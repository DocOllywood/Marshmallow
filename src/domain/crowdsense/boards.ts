export const LEADERBOARD_TABS = [
  { id: "overall", label: "Overall" },
  { id: "love", label: "Love" },
  { id: "friendship", label: "Friendship" },
  { id: "dating-sex", label: "Dating & Sex" },
  { id: "family", label: "Family" },
  { id: "human-nature", label: "Human Nature" },
  { id: "weekly", label: "This Week" },
] as const;

export type LeaderboardTab = (typeof LEADERBOARD_TABS)[number];
export type LeaderboardTabId = LeaderboardTab["id"];

export function isLeaderboardTabId(value: string | undefined): value is LeaderboardTabId {
  return LEADERBOARD_TABS.some((tab) => tab.id === value);
}
