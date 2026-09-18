# Security policy

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/MadsLorentzen/ai-job-search/security/advisories/new). If the private form is unavailable, open a public issue that describes the class of problem without publishing an exploit.

## Threat model

A coding agent reads untrusted job postings alongside personal career data. A malicious posting can contain prompt-injection text, hidden HTML, or links designed to redirect the workflow.

The repository applies these controls:

- `AGENTS.md` and the application skills treat third-party content as data, never instructions.
- Company research starts from the company identity, not from links embedded in a posting.
- `profile/candidate.md` is the sole factual authority for candidate claims.
- `.gitignore` excludes trackers, imported documents, application archives, salary data, and generated reports.
- `tools/security_guards.py` detects OpenCode permission widening, unsafe package lifecycle scripts, and weakened personal-data ignore rules.
- Portal CLIs use public, read-only endpoints and bounded request volume.
- Sync skills never upload CV or cover-letter content.

Instruction files are not a sandbox. OpenCode and Codex provide runtime permission controls. Pi does not provide a built-in sandbox or approval system. Run Pi in a container or another restricted environment when you need isolation.

Review generated application documents before sending them. The workflows do not submit applications or send messages.

## Third-party skills

Read every copied skill and its CLI code before running it. Check network destinations, filesystem paths, package manifests, and install scripts.

Community forks and copied skills are outside this project's security policy.
