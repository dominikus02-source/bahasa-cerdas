import { SVGProps } from "react";

type IconProps = { size?: number; className?: string } & SVGProps<SVGSVGElement>;

function a(size: number | undefined, sw = 1.5) {
  return { width: size ?? 18, height: size ?? 18, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}

export function IconBolt({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-yellow-500"}><path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
}
export function IconFlame({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-orange-500"}><path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>;
}
export function IconCoin({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-yellow-500"}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" strokeWidth="1" /><path d="M10 8.5c1.5-1 4-1 4 .5s-2 2-4 3c-2 1-2 2.5 0 3.5" strokeLinecap="round" /></svg>;
}
export function IconTarget({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
export function IconSchool({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>;
}
export function IconLocation({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
}
export function IconCheck({ size, className }: IconProps) {
  return <svg {...a(size, 2)} className={className ?? "text-emerald-500"}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
export function IconPen({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>;
}
export function IconChat({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
}
export function IconHeart({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
}
export function IconEye({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
export function IconClock({ size, className }: IconProps) {
  return <svg {...a(size)} className={className ?? "text-violet-500"}><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
