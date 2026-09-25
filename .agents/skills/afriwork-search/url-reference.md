# Afriwork channel URL reference

The CLI reads Afriwork's public Telegram preview. It does not sign in, use a Telegram user session, call an undocumented Mini App endpoint, or submit applications.

| Operation | Public URL | Evidence |
|---|---|---|
| Search | `https://t.me/s/freelance_ethio` | Returns recent channel posts in HTML. A page observed on 2026-09-23 exposed about 20 messages. |
| Older posts | `https://t.me/s/freelance_ethio?before=<message-id>` | The preview provides a `before` link. A live search followed the cursor through five pages and returned developer posts. Long-range stability remains unverified. |
| Detail | `https://t.me/s/freelance_ethio/<message-id>` | A bounded check of post `103756` returned a preview page containing that ID. |

## Fields

- `data-post="freelance_ethio/<id>"` supplies the stable message ID used by the CLI.
- `.tgme_widget_message_text` contains the post text, including job title, work type, location, salary, deadline, description, and company footer when provided.
- The post's `<time datetime>` supplies its publication date.
- A link to `https://t.me/afriworkapplicantbot/applicantapp?startapp=...` is returned as `applyUrl`. The CLI does not open this link.
- Some descriptions end with an excerpt and a "view details below" marker. The CLI sets `descriptionStatus` to `excerpt` and keeps the source post URL and applicant Mini App link.

## Access and coverage

Afriwork's `robots.txt` allows `/` and disallows `/cgi-bin/`. The linked `/terms-of-service` page displayed a Privacy Policy heading during the 2026-09-23 check, so permission for automated collection remains unclear. Telegram's `t.me/robots.txt` returned 404. Use the CLI for personal search only, keep requests low-volume, and stop if Afriwork's terms or a support response disallows collection.

The preview showed numeric IDs and a `before` cursor, but older-page pagination has not been verified across long ranges. A missing ID may return generic channel HTML with status 200. The CLI reports a missing post when the requested ID is absent from the parsed page.
