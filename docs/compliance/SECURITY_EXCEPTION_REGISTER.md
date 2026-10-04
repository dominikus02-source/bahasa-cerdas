# Security Exception Register

Status: temporary, narrowly-scoped exceptions for the production dependency audit. These exceptions do **not** lower the repository-wide high/critical severity gate.

## 1. braces — GHSA-vfj7-8cjw-p6xm

- Severity: High.
- Current state: upstream advisory affects braces <= 3.0.3 and lists no patched release.
- BahasaCerdas reachability: the dependency is pulled through the Tailwind CSS build/tooling chain. Application runtime routes do not evaluate user-supplied brace patterns through Tailwind.
- Compensating control: the CI gate accepts only this exact advisory ID. Any different high/critical advisory still fails CI.
- Removal trigger: upgrade/remove the affected Tailwind/braces chain as soon as a compatible patched release is available.
- Review by: 2026-11-04.

## 2. image-size — GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr

- Severity: High.
- Current state: image-size 2.0.4 is now published, but PptxGenJS 4.0.1 declares image-size ^1.2.1.
- BahasaCerdas reachability: PptxGenJS 4.0.1 declares image-size, but its published runtime bundle does not import or call image-size; the image-size dependency is currently dead for the PPT generation route.
- Compensating control: the CI gate accepts only these two exact advisory IDs. Uploaded images are handled by BahasaCerdas upload validation, not by image-size through PptxGenJS.
- Removal trigger: remove the exception when PptxGenJS removes/updates the dead dependency, or after a tested compatible override/upgrade to image-size >= 2.0.3.
- Review by: 2026-11-04.

## Guardrail

`scripts/security-audit-gate.mjs` recursively resolves transitive `npm audit` findings to advisory IDs. It fails the build for every high/critical production finding unless all root advisories are exactly in the allowlist above. A new advisory, package, or unidentified high/critical finding therefore remains release-blocking.
