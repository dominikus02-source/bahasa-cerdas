export interface DocxExportPayload {
  agentId: "rpp" | "soal";
  savedResultId?: string;
  title?: string;
  outputJson?: Record<string, unknown>;
  editableText?: string;
}

export interface PptxExportPayload {
  agentId: "ppt";
  savedResultId?: string;
  title?: string;
  outputJson?: Record<string, unknown>;
  editableText?: string;
}

async function downloadBlob(url: string, payload: Record<string, unknown>, defaultName: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "File belum bisa dibuat. Coba lagi beberapa saat.";
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();

  let filename = defaultName;
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?$/);
    if (match) filename = match[1];
  }

  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlBlob;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(urlBlob);
}

export async function downloadDocxExport(payload: DocxExportPayload): Promise<void> {
  return downloadBlob("/api/ai/agents/export/docx", payload as unknown as Record<string, unknown>, "export.docx");
}

export async function downloadPptxExport(payload: PptxExportPayload): Promise<void> {
  return downloadBlob("/api/ai/agents/export/pptx", payload as unknown as Record<string, unknown>, "export.pptx");
}

export interface PdfExportPayload {
  agentId: "rpp" | "soal";
  savedResultId?: string;
  title?: string;
  outputJson?: Record<string, unknown>;
  editableText?: string;
}

export async function downloadPdfExport(payload: PdfExportPayload): Promise<void> {
  return downloadBlob("/api/ai/agents/export/pdf", payload as unknown as Record<string, unknown>, "export.pdf");
}
