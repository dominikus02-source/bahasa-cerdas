"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { FileText, Play, ImageIcon } from "lucide-react";

type FallbackType = "article" | "video" | "default";

interface SafeMediaImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackType?: FallbackType;
  containerClassName?: string;
}

const FALLBACK_CONFIG: Record<FallbackType, {
  bg: string;
  icon: React.ReactNode;
  label: string;
  iconBg: string;
  labelClass: string;
}> = {
  article: {
    bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
    icon: <FileText className="w-6 h-6 text-indigo-400" />,
    label: "Artikel",
    iconBg: "bg-indigo-100",
    labelClass: "text-indigo-400/70",
  },
  video: {
    bg: "bg-gradient-to-br from-indigo-950 to-indigo-900",
    icon: <Play className="w-6 h-6 text-indigo-300" />,
    label: "Video",
    iconBg: "bg-indigo-500/20",
    labelClass: "text-indigo-400/70",
  },
  default: {
    bg: "bg-gradient-to-br from-slate-100 to-slate-200",
    icon: <ImageIcon className="w-6 h-6 text-slate-400" />,
    label: "Gambar",
    iconBg: "bg-slate-300/50",
    labelClass: "text-slate-400",
  },
};

function FallbackInner({ type }: { type: FallbackType }) {
  const cfg = FALLBACK_CONFIG[type];
  return (
    <div className={`w-full h-full flex items-center justify-center ${cfg.bg}`}>
      <div className="flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
          {cfg.icon}
        </div>
        <span className={`text-[11px] font-medium ${cfg.labelClass}`}>{cfg.label}</span>
      </div>
    </div>
  );
}

export default function SafeMediaImage({
  src,
  alt,
  className = "",
  fallbackType = "default",
  containerClassName = "",
}: SafeMediaImageProps) {
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const showImage = !!resolvedSrc && !imgError;

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setImgLoaded(true);
  }, []);

  const containerClasses = containerClassName || className;

  if (!showImage) {
    return (
      <div className={`relative ${containerClasses}`}>
        <FallbackInner type={fallbackType} />
      </div>
    );
  }

  return (
    <div className={`relative ${containerClasses}`}>
      {!imgLoaded && (
        <div className="absolute inset-0 z-10">
          <FallbackInner type={fallbackType} />
        </div>
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover ${imgLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${className}`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
