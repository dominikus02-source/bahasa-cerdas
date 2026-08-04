// Builds the APK splash screen and writes it into the five density buckets
// Bubblewrap emits.
//
//   node twa/splash/generate-splash.mjs
//
// Run from the repo root AFTER `bubblewrap build`, then build again to package it.
// `bubblewrap build` regenerates the Android project and overwrites every
// splash.png with artwork derived from the app icon, so a hand-edited splash is
// silently lost on the next build. Keeping the design in code makes it
// reproducible instead of a one-off nobody can recreate.
//
// The ARENA wordmark is converted to vector PATHS via fontkit rather than left as
// SVG <text>. Matcha Mint is a repo file, not a system font — as <text> it would
// silently fall back to some default on any machine where it is not installed,
// and the splash would ship in the wrong typeface without anyone noticing.

import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openSync as openFont } from "fontkit";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..");
const resDir = join(projectRoot, "twa", "app", "src", "main", "res");

const WORDMARK_FONT = join(projectRoot, "public", "fonts", "Matcha Mint.ttf");

// Canvas is square because Bubblewrap's splash drawables are square, centred on
// backgroundColor (#F8FAFC). Matching that colour makes the artwork dissolve into
// the background instead of showing as a visible tile.
const SIZE = 1200;
const BG = "#F8FAFC";
const VIOLET = "#7C3AED";
const VIOLET_SOFT = "#A78BFA";
const SLATE = "#64748B";

const TAGLINE = "Seru belajarnya, mahir bahasanya";
const WORDMARK = "ARENA";

// Widest the wordmark may get. Leaves a margin so the display face — which is far
// wider per glyph than a text face — cannot run into the canvas edge.
const WORDMARK_MAX_W = 940;

// Lay a string out as SVG path data. Returns the paths plus the advance width, so
// the caller can centre it without guessing.
function textToPaths(fontPath, text, fontSize) {
  const font = openFont(fontPath);
  const run = font.layout(text);
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  const parts = [];
  for (const glyph of run.glyphs) {
    const d = glyph.path.toSVG();
    // Glyph coordinates are y-up; the negative y scale flips them into SVG space.
    if (d) {
      parts.push(
        `<path d="${d}" transform="translate(${x.toFixed(2)},0) scale(${scale.toFixed(6)},${(-scale).toFixed(6)})"/>`
      );
    }
    x += glyph.advanceWidth * scale;
  }
  return { paths: parts.join(""), width: x };
}

// Fit the wordmark to WORDMARK_MAX_W rather than trusting a hardcoded font size:
// swap the typeface and a fixed size would silently overflow or shrink.
let wordmark = textToPaths(WORDMARK_FONT, WORDMARK, 260);
if (wordmark.width > WORDMARK_MAX_W) {
  wordmark = textToPaths(WORDMARK_FONT, WORDMARK, 260 * (WORDMARK_MAX_W / wordmark.width));
}

const WORDMARK_BASELINE = 690;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>

  <!-- Bar above the wordmark, kept well clear of the cap line. Sitting closer it
       landed directly over the E and read as a macron ("ARĒNA"). -->
  <rect x="465" y="342" width="270" height="20" rx="10" fill="${VIOLET}"/>

  <g transform="translate(${((SIZE - wordmark.width) / 2).toFixed(1)},${WORDMARK_BASELINE})" fill="${VIOLET}">${wordmark.paths}</g>

  <!-- Tagline and byline stay in a plain sans: a display face at this size turns a
       full sentence into decoration, and these are meant to be read. -->
  <text x="600" y="800" font-family="Helvetica, Arial, sans-serif" font-size="52"
        fill="${SLATE}" text-anchor="middle">${TAGLINE}</text>

  <text x="600" y="900" font-family="Helvetica, Arial, sans-serif" font-size="38"
        font-weight="bold" letter-spacing="3" fill="${VIOLET_SOFT}"
        text-anchor="middle">BAHASACERDAS</text>
</svg>`;

// Sizes match what Bubblewrap generates, so the drawable swaps in without touching
// any Android resource declaration.
const DENSITIES = [
  ["drawable-mdpi", 300],
  ["drawable-hdpi", 450],
  ["drawable-xhdpi", 600],
  ["drawable-xxhdpi", 900],
  ["drawable-xxxhdpi", 1200],
];

await writeFile(join(here, "splash-preview.png"), await sharp(Buffer.from(svg)).png().toBuffer());

for (const [dir, size] of DENSITIES) {
  try {
    await access(join(resDir, dir));
  } catch {
    console.error(`lewat: ${dir} belum ada — jalankan 'bubblewrap build' dulu`);
    continue;
  }
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(join(resDir, dir, "splash.png"), png);
  console.log(`ditulis: ${dir}/splash.png (${size}x${size})`);
}
