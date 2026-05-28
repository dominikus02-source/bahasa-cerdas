type BatikDecorProps = {
  position: "top-right" | "bottom-left" | "right-top" | "left-bottom";
  variant?: "batik-bg" | "batik-header";
  className?: string;
};

const positionClasses: Record<string, string> = {
  "top-right": "top-0 right-0 w-[600px] lg:w-[800px] h-[600px] lg:h-[800px]",
  "bottom-left": "bottom-0 left-0 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px]",
  "right-top": "right-0 top-0 w-[350px] h-[350px] lg:w-[500px] lg:h-[500px]",
  "left-bottom": "left-0 bottom-0 w-[400px] h-[400px]",
};

const images: Record<string, string> = {
  "batik-bg": "url('/batik bg bc.png')",
  "batik-header": "url('/batik-header-profile-bc.png')",
};

export default function BatikDecor({ position, variant = "batik-bg", className = "" }: BatikDecorProps) {
  return (
    <div
      className={`absolute ${positionClasses[position]} opacity-[0.03] pointer-events-none select-none bg-cover bg-center ${className}`}
      style={{
        backgroundImage: images[variant],
        backgroundSize: "cover",
        ...(variant === "batik-bg" && { transform: position.includes("right") ? "scaleX(-1)" : undefined }),
      }}
      aria-hidden="true"
    />
  );
}
