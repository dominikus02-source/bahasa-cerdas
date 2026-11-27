export type RobloxPageStatus = {
  experienceName: string;
  experienceUrl: string;
  placeId: string;
  universeId: string;
  ageGate: { enabled: boolean; minAge: number; satisfied: boolean };
  link: null | {
    robloxUserId: string;
    robloxUsername: string | null;
    robloxDisplayName: string | null;
    linkedAt: string;
  };
  code: null | { display: string; expiresAt: string };
};

export type RobloxResultPayload = {
  sessionId: string;
  correct: number;
  total: number;
  score: number;
  xp: number;
  alreadyRewarded: boolean;
  replay: boolean;
  totalXp: number;
  level: number;
  rank: string;
  badgesAwarded: string[];
  feedback: { questionId: string; correct: boolean; explanation: string | null }[];
};
