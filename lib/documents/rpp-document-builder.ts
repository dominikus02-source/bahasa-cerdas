/**
 * RPP Document Builder — normalizes AI output into final document text.
 *
 * Sources (priority order):
 * 1. output.editableText (the AI's final document)
 * 2. output.displayText
 * 3. output.text
 * 4. JSON.stringify(output) (fallback, never empty)
 */

export interface RppDocument {
  title: string
  content: string
  plainText: string
  filename: string
  metadata: {
    subject: string
    grade: string
    phase: string
    semester: string
    curriculum: string
    topic: string
    duration: string
    teacherName: string
    schoolName: string
    principalName: string
    academicYear: string
    cityDate: string
  }
}

function getStr(obj: Record<string, unknown>, key: string, fallback = ""): string {
  const v = obj[key]
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  return fallback
}

function identityField(identity: Record<string, unknown> | undefined, key: string, fallback = ""): string {
  if (!identity) return fallback
  return getStr(identity, key, fallback)
}

export function buildRppDocument(
  output: Record<string, unknown>,
  title?: string,
): RppDocument {
  const identity = output.identity as Record<string, unknown> | undefined
  const subject = identityField(identity, "subject", "Bahasa Indonesia")
  const topic = identityField(identity, "topic", "RPP")

  // Extract final document text (priority: editableText > displayText > text)
  const editableText = getStr(output, "editableText")
  const displayText = getStr(output, "displayText")
  const text = getStr(output, "text")

  const content = editableText || displayText || text || ""

  const docTitle = title || `RPP ${subject} — ${topic}`

  return {
    title: docTitle,
    content,
    plainText: content
      .replace(/<[^>]*>/g, "")
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/#{1,6}\s/g, ""),
    filename: docTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 150) || "RPP",
    metadata: {
      subject,
      grade: identityField(identity, "grade"),
      phase: identityField(identity, "phase"),
      semester: identityField(identity, "semester", "1 (Ganjil)"),
      curriculum: identityField(identity, "curriculum", "Kurikulum Merdeka"),
      topic,
      duration: identityField(identity, "duration"),
      teacherName: identityField(identity, "teacherName"),
      schoolName: identityField(identity, "schoolName"),
      principalName: identityField(identity, "principalName"),
      academicYear: identityField(identity, "academicYear"),
      cityDate: identityField(identity, "cityDate"),
    },
  }
}

export function buildRppDocumentFromAny(
  result: { output?: Record<string, unknown> | null; text?: string | null },
  title?: string,
): RppDocument {
  if (result.output && Object.keys(result.output).length > 0) {
    return buildRppDocument(result.output, title)
  }
  return {
    title: title || "Hasil AI",
    content: result.text || "",
    plainText: (result.text || "").replace(/<[^>]*>/g, ""),
    filename: (title || "Hasil_AI").replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_"),
    metadata: {
      subject: "", grade: "", phase: "", semester: "", curriculum: "",
      topic: "", duration: "", teacherName: "", schoolName: "",
      principalName: "", academicYear: "", cityDate: "",
    },
  }
}

export function extractExportContent(output: Record<string, unknown>, text: string | null): string {
  if (typeof output.editableText === "string" && output.editableText.trim().length > 0) {
    return output.editableText
  }
  if (typeof output.displayText === "string" && output.displayText.trim().length > 0) {
    return output.displayText
  }
  if (typeof output.text === "string" && output.text.trim().length > 0) {
    return output.text
  }
  if (text && text.trim().length > 0) {
    return text
  }
  return ""
}
