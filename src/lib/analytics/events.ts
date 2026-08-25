export const ANALYTICS_EVENTS = {
  onboardingStarted: "onboarding_started",
  onboardingCategorySelected: "onboarding_category_selected",
  onboardingTopicSelected: "onboarding_topic_selected",
  onboardingCompleted: "onboarding_completed",
  homeViewed: "home_viewed",
  marshmallowViewed: "marshmallow_viewed",
  answerSelected: "answer_selected",
  predictionStarted: "prediction_started",
  predictionChanged: "prediction_changed",
  predictionSealed: "prediction_sealed",
  waitingViewed: "waiting_viewed",
  waitingReturned: "waiting_returned",
  revealReady: "reveal_ready",
  revealOpened: "reveal_opened",
  revealCompleted: "reveal_completed",
  revealBonusEarned: "reveal_bonus_earned",
  nextMarshmallowClicked: "next_marshmallow_clicked",
  profileViewed: "profile_viewed",
  leaderboardViewed: "leaderboard_viewed",
  leaderboardTabChanged: "leaderboard_tab_changed",
  publicProfileViewed: "public_profile_viewed",
  shareCreated: "share_created",
  shareOpened: "share_opened",
  sharePlayClicked: "share_play_clicked",
  shareSignupStarted: "share_signup_started",
  shareSignupCompleted: "share_signup_completed",
  notificationClicked: "notification_clicked",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsPayload = Record<string, string | number | boolean | null>;
