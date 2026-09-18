# Application verification

Run this checklist after revising and compiling the CV and cover letter. Report each item as pass, fail, or unavailable.

## Factual accuracy

- Every candidate claim is supported by `profile/candidate.md`.
- Job titles, dates, company names, locations, contact details, skills, and metrics are correct.
- Every company-specific claim was verified against an independently located source.

## Targeting

- The opening and profile statement target this role rather than a generic role.
- Experience and skills are framed around the posting's requirements.
- Every stated requirement is matched or acknowledged as a gap.
- Supported preferred qualifications use the posting's terminology where accurate.

## Consistency and writing

- The CV and cover letter do not contradict each other.
- The cover letter matches the posting's language.
- The tone follows `.agents/references/job-application/03-writing-style.md` and `profile/behavior.md`.
- The cover letter addresses the named contact, or the appropriate generic recipient when none is known.
- Spelling, grammar, and source syntax are correct.

## Compiled documents

- Both source files compile with the active template's declared commands.
- The CV has exactly two pages and no orphaned entry titles or isolated headings.
- The cover letter has exactly one page, with its signature visible and its fonts consistent.
- Both PDFs were inspected visually when the harness supports PDF inspection.
- If visual inspection is unavailable, report it as outstanding rather than passing it.

## ATS checks

- `pdftotext -layout` extracts the CV without missing text, `(cid:*)` markers, or replacement characters.
- Email and phone appear as literal extracted text.
- Extracted reading order matches the visual order.
- Posting keywords are covered where truthful; genuine gaps remain visible and are never stuffed into the CV.
