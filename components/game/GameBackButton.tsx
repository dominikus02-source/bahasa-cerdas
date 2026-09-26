"use client";

import { ArrowLeft } from "lucide-react";

interface GameBackButtonProps {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export default function GameBackButton({
  onClick,
  label = "Kembali",
  ariaLabel,
  title,
  className = "",
}: GameBackButtonProps) {
  const accessibleLabel = ariaLabel ?? label;

  return (
    <button
      type="button"
      className={`game-back-btn ${className}`}
      onClick={onClick}
      aria-label={accessibleLabel}
      title={title ?? accessibleLabel}
    >
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="game-back-label">{label}</span>
    </button>
  );
}
