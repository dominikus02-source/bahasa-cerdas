import type PptxGenJS from "pptxgenjs";

export function sanitizeFilename(title: string): string {
  const safe = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safe.length > 150 ? safe.slice(0, 150) : safe;
}

export const COLORS = {
  PRIMARY: "10B981",
  PRIMARY_DARK: "047857",
  PRIMARY_LIGHT: "D1FAE5",
  PRIMARY_BG: "ECFDF5",
  DARK: "1F2937",
  GRAY: "6B7280",
  GRAY_LIGHT: "F3F4F6",
  GRAY_BORDER: "E5E7EB",
  WHITE: "FFFFFF",
  ACCENT_AMBER: "F59E0B",
  ACCENT_BLUE: "3B82F6",
} as const;

export function addFooter(slide: PptxGenJS.Slide, slideNumber: number, totalSlides: number): void {
  slide.addText(`BahasaCerdas — ${slideNumber} / ${totalSlides}`, {
    x: 0.5,
    y: 7.0,
    w: 9.0,
    h: 0.4,
    fontSize: 9,
    color: COLORS.GRAY,
    fontFace: "Calibri",
    align: "center",
  });
}

export function addSectionTitle(slide: PptxGenJS.Slide, text: string, y: number): void {
  slide.addText(text, {
    x: 0.7,
    y,
    w: 8.6,
    h: 0.5,
    fontSize: 11,
    color: COLORS.GRAY,
    fontFace: "Calibri",
    italic: true,
  });
}
