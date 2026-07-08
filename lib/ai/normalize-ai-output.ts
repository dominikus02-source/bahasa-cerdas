/**
 * normalizeAiOutputForDisplay — extracts display-ready text from any AI output shape.
 *
 * Handles:
 * - Raw string
 * - JSON object with editableText / displayText / text field
 * - Array with single element (unwraps and recurses)
 * - Null/undefined/empty
 *
 * Never throws — always returns a safe result with warnings.
 */

export interface NormalizedDisplay {
  displayText: string;
  structuredData?: unknown;
  warnings: string[];
}

/**
 * Try to extract a displayable string from an RPP-like structured object.
 */
function extractRPPText(obj: Record<string, unknown>): string | null {
  if (typeof obj.editableText === "string" && obj.editableText.trim().length > 50) {
    return obj.editableText;
  }
  return null;
}

/**
 * Try to extract a displayable string from any object.
 */
function extractObjectText(obj: Record<string, unknown>): string | null {
  if (typeof obj.editableText === "string" && obj.editableText.trim().length > 0) {
    return obj.editableText;
  }
  if (typeof obj.displayText === "string" && obj.displayText.trim().length > 0) {
    return obj.displayText;
  }
  if (typeof obj.text === "string" && obj.text.trim().length > 0) {
    return obj.text;
  }
  if (typeof obj.content === "string" && obj.content.trim().length > 0) {
    return obj.content;
  }
  if (typeof obj.result === "string" && obj.result.trim().length > 0) {
    return obj.result;
  }
  return null;
}

/**
 * Main normalizer — extracts the best display text from any AI output.
 */
export function normalizeAiOutputForDisplay(
  raw: unknown,
  agentId?: string
): NormalizedDisplay {
  const warnings: string[] = [];

  try {
    if (raw === null || raw === undefined) {
      return { displayText: "", warnings: ["Tidak ada output yang dihasilkan"] };
    }

    // Case 1: Already a string
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        return { displayText: "", warnings: ["Output kosong"] };
      }
      // Try to parse as JSON if it looks like JSON
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          const normalized = normalizeAiOutputForDisplay(parsed, agentId);
          warnings.push("Output dinormalisasi dari structured response");
          return {
            displayText: normalized.displayText,
            structuredData: parsed,
            warnings: [...warnings, ...normalized.warnings],
          };
        } catch {
          // Not valid JSON — treat as text
          return { displayText: trimmed, warnings };
        }
      }
      return { displayText: trimmed, warnings };
    }

    // Case 2: Array — unwrap single element or stringify
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return { displayText: "", warnings: ["Array output kosong"] };
      }
      if (raw.length === 1) {
        const item = raw[0];
        if (item && typeof item === "object") {
          const text = extractObjectText(item as Record<string, unknown>);
          if (text) {
            warnings.push("Output dinormalisasi dari array dengan 1 item");
            return { displayText: text, structuredData: raw, warnings };
          }
          // For RPP, check editableText specifically
          if (agentId === "rpp") {
            const rppText = extractRPPText(item as Record<string, unknown>);
            if (rppText) {
              warnings.push("Output dinormalisasi dari structured RPP response");
              return { displayText: rppText, structuredData: raw, warnings };
            }
          }
        }
        // Recursively normalize the single item
        const inner = normalizeAiOutputForDisplay(item, agentId);
        warnings.push(...inner.warnings);
        return { displayText: inner.displayText, structuredData: raw, warnings };
      }
      // Multiple items — stringify as fallback
      warnings.push("Output berupa array dengan beberapa item");
      return {
        displayText: JSON.stringify(raw, null, 2),
        structuredData: raw,
        warnings,
      };
    }

    // Case 3: Object
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;

      // For RPP, prefer editableText
      if (agentId === "rpp") {
        const rppText = extractRPPText(obj);
        if (rppText) {
          warnings.push("Output dinormalisasi dari structured RPP response");
          return { displayText: rppText, structuredData: raw, warnings };
        }
      }

      // General object text extraction
      const objText = extractObjectText(obj);
      if (objText) {
        return { displayText: objText, structuredData: raw, warnings };
      }

      // Last resort: stringify
      warnings.push("Output ditampilkan dari data terstruktur");
      return {
        displayText: JSON.stringify(obj, null, 2),
        structuredData: raw,
        warnings,
      };
    }

    // Case 4: Primitive (number, boolean)
    return { displayText: String(raw), warnings };
  } catch {
    return { displayText: "", warnings: ["Gagal memproses output AI"] };
  }
}
