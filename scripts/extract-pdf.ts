import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

async function main() {
  const pdfPath = path.resolve(
    "/Users/user/Downloads/_ PENETAPAN TOPIK AJAR BAHASA INDONESIA SMP.pdf"
  );

  if (!fs.existsSync(pdfPath)) {
    console.error("File not found:", pdfPath);
    process.exit(1);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  console.log("=== PDF Metadata ===");
  console.log("Pages:", data.numpages);
  console.log("Title:", data.info?.Title || "N/A");
  console.log("Author:", data.info?.Author || "N/A");
  console.log("\n=== Full Text ===");
  console.log(data.text);
}

main().catch(console.error);
