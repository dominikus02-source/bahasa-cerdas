"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface GameBackButtonProps {
  onClick?: () => void;
  href?: string;
  label?: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export default function GameBackButton({
  onClick,
  href,
  label = "Kembali",
  ariaLabel,
  title,
  className = "",
}: GameBackButtonProps) {
  const accessibleLabel = ariaLabel ?? label;

  const content = (
    <>
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="game-back-label">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`game-back-btn ${className}`}
        aria-label={accessibleLabel}
        title={title ?? accessibleLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`game-back-btn ${className}`}
      onClick={onClick}
      aria-label={accessibleLabel}
      title={title ?? accessibleLabel}
    >
      {content}
    </button>
  );
}
