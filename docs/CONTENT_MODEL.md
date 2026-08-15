# TNHTH-blog Content Model

## Project

Required frontmatter: `title`, `summary`, `outcome`, `status`, `period`, `topics`.

Optional frontmatter: `updated`, `featured`, `priority`, `role`, `evidence`, `contributions`, `tech`, `repo`, `demo`.

`evidence` is an ordered list. Results are rendered only when the content contains real, independent result data; evidence alone may be sufficient.

## Note

Required frontmatter: `title`, `date`. Markdown body is required content.

Optional frontmatter: `updated`, `summary`, `tags`, `source`, `relatedProjects`, `series`, `location`, `equipment`, `weather`, `course`, `externalLinks`.

There is no required type, category, reading time, problem, or conclusion.

## Relationships

`Note.relatedProjects` is canonical. Project related notes are derived. Related Notes use weighted scoring and show at most five results; no relationship is created only to fill a component.

## Migration ledger

Allowed actions: `move`, `merge`, `split`, `redirect`, `drop-with-reason`.

Allowed statuses: `pending`, `verified`, `needs-review`, `skipped`, `failed`.

Body integrity hashes are computed from normalized Markdown body only, excluding frontmatter.
