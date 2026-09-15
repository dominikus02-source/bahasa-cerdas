export type ValidationStatus = "PASS" | "WARN" | "BLOCK";

export interface ValidationCheck {
  validator: string;
  check: string;
  severity: ValidationStatus;
  result: ValidationStatus;
  mode: "DETERMINISTIC" | "AI_ASSISTED";
  reason: string;
  evidence?: string;
}

export interface ValidationResult {
  kodeSoal?: string;
  status: ValidationStatus;
  overall: ValidationStatus;
  checks: ValidationCheck[];
  timestamp: string;
  validatorVersion: string;
}

export function aggregateStatus(results: ValidationResult[]): ValidationStatus {
  let worst: ValidationStatus = "PASS";
  const order: ValidationStatus[] = ["PASS", "WARN", "BLOCK"];
  for (const r of results) {
    if (order.indexOf(r.overall) > order.indexOf(worst)) worst = r.overall;
  }
  return worst;
}
