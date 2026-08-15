import fs from "node:fs";
import path from "node:path";
import { validateQuestionMetadataBatch, type QuestionMetadataInput } from "../lib/question-metadata/validation";

const file = process.argv[2] || "data/question-metadata/sample-001.json";
const absolute = path.resolve(process.cwd(), file);
const raw = JSON.parse(fs.readFileSync(absolute, "utf8")) as unknown;
const items = Array.isArray(raw) ? raw as QuestionMetadataInput[] : [raw as QuestionMetadataInput];
const result = validateQuestionMetadataBatch(items);

console.log(`File: ${file}`);
console.log(`Items: ${items.length}`);
if (!result.valid) {
  console.error("❌ Metadata tidak valid");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("✅ Semua metadata valid dan belum auto-publish (sample status NEEDS_REVIEW).");
