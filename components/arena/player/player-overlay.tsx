"use client";

import { LevelUpModal } from "./level-up-modal";
import { RewardPopupQueue } from "./reward-popup";
import { RankUpModal } from "@/components/gamification/RankUpModal";

/** Overlay global Player (level-up modal + reward popup queue + rank-up modal). Mount sekali di layout Arena. */
export function PlayerOverlay() {
  return (
    <>
      <RewardPopupQueue />
      <LevelUpModal />
      <RankUpModal />
    </>
  );
}
