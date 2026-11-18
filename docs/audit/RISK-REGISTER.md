# RISK-REGISTER

Ranked by impact, exploitability, exposure, financial and privacy consequence. Static review only.

| Rank | Finding | Why here | Owner decision needed |
|---|---|---|---|
| 1 | F-001 admin step-up bypass | Highest impact (admin power), needs admin session first | no |
| 2 | F-002 MFA code guessing/replay | Protects every MFA user, needs password first | no |
| 3 | F-007 audit cannot fail CI, multer 1.x | Unknown dependency exposure, unverified | no |
| 4 | F-003 high anonymous limits | Raises brute-force room | yes |
| 5 | F-008 MFA disable | Needs password | no |
| 6 | F-005 CSP not enforced | Defence in depth, no sink found | no |
| 7 | F-006 avatar upload | Mitigated, Cloudinary-off only | no |
| 8 | F-004 admin email default | Targeting | no |
| 9 | F-009 enumeration | Usability trade-off | yes |
| 10 | F-010, F-011 | Informational | no |

Unassessed risk areas (could outrank the above): financial calculation correctness, concurrent payments, loan code, group settlement maths, database indexes, dynamic IDOR tests.
