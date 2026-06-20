import PptxGenJS from "pptxgenjs";
import { sanitizeFilename, COLORS, addFooter, addSectionTitle } from "./pptx-utils";

interface SlideData {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes: string;
  visualSuggestion: string;
  activityPrompt?: string;
  quiz?: {
    question: string;
    options?: string[];
    answer: string;
  };
}

interface PPTAgentOutput {
  title: string;
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    slideCount: number;
    visualStyle: string;
  };
  slides: SlideData[];
  openingScript: string;
  closingReflection: string;
  teacherNotes: string[];
  editableText: string;
}

interface PPTInput {
  title: string;
  output: Record<string, unknown>;
  editableText?: string | null;
}

const FONT = "Calibri";

function ensureOutput(raw: Record<string, unknown>): PPTAgentOutput {
  return raw as unknown as PPTAgentOutput;
}

function addTitleBar(slide: PptxGenJS.Slide, text: string, y: number): void {
  slide.addShape("rect", {
    x: 0,
    y,
    w: 10,
    h: 0.5,
    fill: { color: COLORS.PRIMARY },
  });
  slide.addText(text, {
    x: 0.7,
    y,
    w: 8.6,
    h: 0.5,
    fontSize: 14,
    color: COLORS.WHITE,
    fontFace: FONT,
    bold: true,
    valign: "middle",
  });
}

function addBullets(slide: PptxGenJS.Slide, items: string[], startY: number): number {
  const visible = items.slice(0, 5);
  let y = startY;
  for (const item of visible) {
    slide.addText(`• ${item}`, {
      x: 0.9,
      y,
      w: 8.2,
      h: 0.3,
      fontSize: 12,
      color: COLORS.DARK,
      fontFace: FONT,
      valign: "top",
    });
    y += 0.32;
  }
  return y;
}

function addSuggestionBox(slide: PptxGenJS.Slide, text: string, y: number): number {
  const boxY = y + 0.1;
  slide.addShape("rect", {
    x: 0.7,
    y: boxY,
    w: 8.6,
    h: 0.5,
    fill: { color: COLORS.PRIMARY_BG },
    rectRadius: 0.1,
  });
  slide.addText(`💡 ${text}`, {
    x: 0.9,
    y: boxY,
    w: 8.2,
    h: 0.5,
    fontSize: 10,
    color: COLORS.PRIMARY_DARK,
    fontFace: FONT,
    valign: "middle",
  });
  return boxY + 0.6;
}

function addActivityBox(slide: PptxGenJS.Slide, text: string, y: number): number {
  const boxY = y + 0.05;
  slide.addShape("rect", {
    x: 0.7,
    y: boxY,
    w: 8.6,
    h: 0.5,
    fill: { color: COLORS.ACCENT_AMBER },
    rectRadius: 0.1,
  });
  slide.addText(`✏️ ${text}`, {
    x: 0.9,
    y: boxY,
    w: 8.2,
    h: 0.5,
    fontSize: 10,
    color: COLORS.WHITE,
    fontFace: FONT,
    bold: true,
    valign: "middle",
  });
  return boxY + 0.6;
}

function addQuizBlock(slide: PptxGenJS.Slide, quiz: { question: string; options?: string[]; answer: string }, y: number): number {
  const qY = y + 0.1;
  slide.addShape("rect", {
    x: 0.7,
    y: qY,
    w: 8.6,
    h: quiz.options ? 1.0 : 0.5,
    fill: { color: COLORS.ACCENT_BLUE },
    rectRadius: 0.1,
  });
  const quizText = quiz.options
    ? `📝 ${quiz.question}\n${quiz.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("  ")}`
    : `📝 ${quiz.question}`;
  slide.addText(quizText, {
    x: 0.9,
    y: qY,
    w: 8.2,
    h: quiz.options ? 1.0 : 0.5,
    fontSize: 10,
    color: COLORS.WHITE,
    fontFace: FONT,
    valign: "middle",
  });
  return qY + (quiz.options ? 1.1 : 0.6);
}

export async function generatePptAgentPptx(input: PPTInput): Promise<Buffer> {
  const out = ensureOutput(input.output);
  const meta = out.metadata;
  const totalSlides = out.slides.length + 4;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });
  pptx.layout = "CUSTOM";

  // === 1. Cover Slide ===
  const cover = pptx.addSlide();
  cover.background = { color: COLORS.PRIMARY };

  cover.addText(input.title, {
    x: 0.7,
    y: 1.5,
    w: 8.6,
    h: 1.2,
    fontSize: 32,
    color: COLORS.WHITE,
    fontFace: FONT,
    bold: true,
    align: "center",
    valign: "middle",
  });

  cover.addText(`${meta.subject} • ${meta.grade}`, {
    x: 0.7,
    y: 3.0,
    w: 8.6,
    h: 0.5,
    fontSize: 18,
    color: COLORS.WHITE,
    fontFace: FONT,
    align: "center",
    valign: "middle",
  });

  cover.addText(meta.topic, {
    x: 0.7,
    y: 3.5,
    w: 8.6,
    h: 0.5,
    fontSize: 16,
    color: COLORS.WHITE,
    fontFace: FONT,
    align: "center",
    valign: "middle",
  });

  cover.addText("Dibuat dengan BahasaCerdas AI", {
    x: 0.7,
    y: 6.5,
    w: 8.6,
    h: 0.4,
    fontSize: 11,
    color: COLORS.WHITE,
    fontFace: FONT,
    align: "center",
    valign: "middle",
  });

  addFooter(cover, 1, totalSlides);

  // === 2. Opening Slide ===
  const opening = pptx.addSlide();
  opening.background = { color: COLORS.WHITE };

  addTitleBar(opening, "Pembukaan", 0);

  const openingY = 0.7;
  opening.addText(out.openingScript, {
    x: 0.7,
    y: openingY,
    w: 8.6,
    h: 1.5,
    fontSize: 14,
    color: COLORS.DARK,
    fontFace: FONT,
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  addSectionTitle(opening, `Tujuan: ${input.title}`, openingY + 1.7);

  addFooter(opening, 2, totalSlides);

  // === 3. Content Slides ===
  for (let i = 0; i < out.slides.length; i++) {
    const s = out.slides[i];
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.WHITE };

    addTitleBar(slide, s.title, 0);

    let yPos = 0.6;

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.7,
        y: yPos,
        w: 8.6,
        h: 0.35,
        fontSize: 13,
        color: COLORS.PRIMARY_DARK,
        fontFace: FONT,
        italic: true,
        valign: "middle",
      });
      yPos += 0.4;
    }

    if (s.bullets.length > 0) {
      const afterBullets = addBullets(slide, s.bullets, yPos);
      yPos = afterBullets + 0.05;
    }

    if (s.activityPrompt) {
      yPos = addActivityBox(slide, s.activityPrompt, yPos);
    }

    if (s.quiz) {
      yPos = addQuizBlock(slide, s.quiz, yPos);
    }

    if (s.visualSuggestion) {
      addSuggestionBox(slide, s.visualSuggestion, yPos + 0.05);
    }

    slide.addNotes(s.speakerNotes);

    addFooter(slide, 3 + i, totalSlides);
  }

  // === 4. Closing Reflection Slide ===
  const closing = pptx.addSlide();
  closing.background = { color: COLORS.WHITE };

  addTitleBar(closing, "Refleksi", 0);

  closing.addText(out.closingReflection, {
    x: 0.7,
    y: 0.7,
    w: 8.6,
    h: 2.0,
    fontSize: 14,
    color: COLORS.DARK,
    fontFace: FONT,
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  closing.addText("Terima kasih telah menggunakan BahasaCerdas!", {
    x: 0.7,
    y: 5.0,
    w: 8.6,
    h: 0.5,
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontFace: FONT,
    align: "center",
    valign: "middle",
  });

  addFooter(closing, totalSlides - 1, totalSlides);

  // === 5. Teacher Notes Slide ===
  const notesSlide = pptx.addSlide();
  notesSlide.background = { color: COLORS.WHITE };

  addTitleBar(notesSlide, "Catatan Guru", 0);

  let noteY = 0.7;
  for (const note of out.teacherNotes) {
    notesSlide.addText(`• ${note}`, {
      x: 0.7,
      y: noteY,
      w: 8.6,
      h: 0.3,
      fontSize: 11,
      color: COLORS.DARK,
      fontFace: FONT,
      valign: "top",
    });
    noteY += 0.32;
  }

  notesSlide.addText("Catatan pembicara juga tersedia di setiap slide.", {
    x: 0.7,
    y: 6.5,
    w: 8.6,
    h: 0.4,
    fontSize: 10,
    color: COLORS.GRAY,
    fontFace: FONT,
    italic: true,
    align: "center",
  });

  addFooter(notesSlide, totalSlides, totalSlides);

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return buffer;
}

export function getPptMetadata(output: Record<string, unknown>): { title: string; filename: string } {
  const out = ensureOutput(output);
  const title = out.title || "Presentasi Bahasa Indonesia";
  const filename = `${sanitizeFilename(title)}.pptx`;
  return { title, filename };
}
