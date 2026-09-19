---
name: reset
description: Reset candidate profile data or imported career documents after explicit confirmation
---

# Reset profile data

This workflow removes personal data while preserving all framework skills and templates.

## Step 1: Choose the scope

Accept one of these scopes from the user's request:

- `profile`: clear `profile/candidate.md`, `profile/behavior.md`, and `profile/search.md`.
- `documents`: clear personal files under `documents/` while preserving `documents/README.md` and `.gitkeep` files.
- `all`: clear both groups.

If the scope is missing or unclear, ask the user to choose. Do not infer a destructive scope.

## Step 2: Show exactly what will change

For `profile`, list the three profile files and whether each contains non-placeholder content.

For `documents`, recursively list personal files under these directories when they exist:

- `documents/cv/`
- `documents/linkedin/`
- `documents/diplomas/`
- `documents/references/`
- `documents/postings/`
- `documents/applications/`
- `documents/interview/`

Do not include `documents/README.md` or `.gitkeep` files in the deletion list.

Ask for this exact confirmation:

> Type `RESET <scope>` to delete the files listed above.

Stop unless the user enters the matching scope exactly.

## Step 3: Reset the selected data

For `profile`, replace the files with short setup placeholders.

`profile/candidate.md`:

```markdown
# Candidate Profile

<!-- SETUP: Ask your coding agent to set up your job-search profile. -->
```

`profile/behavior.md`:

```markdown
# Behavioral Profile

<!-- SETUP: Add an assessment or answer the setup interview questions. -->
```

`profile/search.md`:

```markdown
# Search Strategy

<!-- SETUP: Add target roles, locations, portals, and search queries. -->
```

Do not edit files under `.agents/skills/` during a reset.

For `documents`, delete every listed personal file and nested directory. Preserve each `.gitkeep` file and `documents/README.md`. Use a bounded command for each existing directory rather than a repository-wide delete. For example:

```bash
find documents/cv -mindepth 1 ! -name .gitkeep -delete
```

Apply the same bounded command to every existing document directory in the confirmed list.

## Step 4: Verify and report

List the affected paths again after the reset. Confirm that:

- Each selected profile file contains only its placeholder.
- Each selected document directory contains no personal file.
- `documents/README.md` and all `.gitkeep` files remain.
- No framework skill changed.

Tell the user to ask the agent to set up the profile again when ready.
