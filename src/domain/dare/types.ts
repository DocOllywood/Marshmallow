export type DarePublicStatus =
  | "open"
  | "claimed"
  | "taken"
  | "completed"
  | "closed"
  | "cancelled";

export type DareStageChoice = {
  position: number;
  stage: string;
  choice_label: string;
  is_line: boolean;
  tension_side: string | null;
  predicted_pct: number | null;
};

export type DarePublicView = {
  token: string;
  dareId: string;
  roundId: string;
  senderDisplayName: string;
  invitationLabel: string;
  status: DarePublicStatus;
  isSender: boolean;
  isRecipient: boolean;
  playMarshmallowId: string | null;
  matchReady: boolean;
};

export type DareComparisonPayload = {
  token: string;
  dareId: string;
  roundId: string;
  viewerIsSender: boolean;
  viewerLabel: string;
  otherLabel: string;
  senderChoices: DareStageChoice[];
  recipientChoices: DareStageChoice[];
  roundRevealed: boolean;
};

export type DareSenderStatus = {
  token: string;
  status: DarePublicStatus;
  matchReady: boolean;
};
