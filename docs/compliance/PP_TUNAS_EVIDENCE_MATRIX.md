# Matriks bukti PP TUNAS — BahasaCerdas

Status: **evidence pack pra-self-assessment**. Tidak menyatakan profil risiko telah ditetapkan regulator.

| Area | Kontrol implementasi | Bukti teknis | Status |
|---|---|---|---|
| Pengelompokan usia | DOB dikunci, age band dihitung dari DOB, bukan cached band untuk otorisasi | `lib/compliance/policy.ts`, privacy test | Implemented; assurance proportionality review remains |
| Assurance usia | Adult sensitive features require trusted independent review; child requires guardian-reviewed assurance | `PrivacyAccount.ageAssuranceLevel`, admin review queue | Implemented; operating evidence required |
| Persetujuan wali | Token hash, verified email, independent review, withdrawal, version bundle | guardian route + ConsentEvent | Implemented |
| Privacy by default | profil/karya/analytics child OFF | `safeSettings`, API guards | Implemented |
| Publikasi anak | public identity restricted to trusted verified adults | service/public work filters | Implemented |
| Transaksi anak | sensitive routes blocked for children/unverified adults | proxy policy | Implemented |
| AI anak | provider/transfer gate + guardian settings + human grading approval | AI routes, `aiAllowed`, TestAnswer review fields | Implemented, vendor evidence pending |
| Moderasi | anonymous report + admin decision + audit | SafetyReport/Admin compliance | Implemented |
| Hak subjek data | request register with 72-hour deadline and admin queue | PrivacyRequest/API/UI | Implemented |
| Penghapusan | re-auth, revoke, cleanup, tombstone, retry queue | account deletion code/tests | Implemented |
| RLS / Data API | server-authoritative tables; browser grants revoked; notification owner-only policy | migrations + staging query | Staging verified |
| Storage | private `student-private` bucket + signed authorized access | assets service + staging bucket | Staging verified |
| Karya/file lama | app visibility fail-safe private without privacy approval | visibility guards | Production public legacy objects still require migration |
| Main Bersama | verified account/classroom privacy gates, session credentials | privacy/game/classroom guards | Implemented; school/guardian operating evidence pending |
| Incident | 3x24h response playbook | BREACH_RESPONSE.md | Documented; tabletop pending |
| Retention | AI/analytics/invite/report sweeps | retention script | Implemented policy; vendor/backup retention pending |
| DPIA | child + AI template/register | DPIA_CHILD_AI_TEMPLATE.md | Needs signed review |
| Vendor/transfer | allowlist gate and register | VENDOR_SUBPROCESSOR_REGISTER.csv | Contract/region/training evidence incomplete |

## Evidence IDs
Gunakan prefix:
- BC-CHILD-* age/guardian/privacy
- BC-SEC-* RLS/storage/auth
- BC-AI-* AI/DPIA/vendor
- BC-UGC-* report/moderation
- BC-PDP-* privacy rights/retention
- BC-PSE-* system/registration
- BC-TUNAS-* self-assessment mapping

Setiap jawaban self-assessment harus menunjuk bukti aktual (screenshot, test run, query, policy/version, reviewer dan tanggal), bukan hanya jawaban “ya”.
