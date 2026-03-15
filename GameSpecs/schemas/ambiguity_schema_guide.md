# Ambiguity Schema Authoring Guide

Companion to `ambiguity_schema.yaml`. Contains guidance that would break a JSON Schema validator if left in the schema file itself.

---

## Recommended workflow

1. Identify the precise ambiguous passage or omission in the source material
2. Classify the `ambiguity_type` and `severity`
3. List **distinct candidate interpretations** before choosing one — the list should capture the real disagreement, not just paraphrase the ambiguous text
4. Record rationale and supporting evidence for each interpretation
5. Select a resolution only when necessary; record `provenance` (rulebook errata, FAQ, expert ruling, house rule, or implementation choice)
6. Link the resolution to affected state, rules, scenarios, and tests via `related_rule_ids` and `conflicts_with`

---

## Modeling guidelines

- Do **not** encode a hidden interpretation directly into rules or state files without also recording it here when source material is ambiguous.
- Prefer multiple concise candidate interpretations over one vague paragraph.
- Use `resolution_status` to distinguish canonical source-backed rulings from house rules or implementation-driven choices:
  - `resolved` — a clear source text or errata exists; confidence should be `high`
  - `provisional` — best available interpretation; may be revised
  - `open` — genuinely unresolved; implementation must choose or refuse to adjudicate
- Keep ambiguity records stable over time. Supersede them with new records rather than deleting historical decisions — old records are evidence of the reasoning process.

---

## Severity guidance

| Severity | Meaning |
|---|---|
| `critical` | Game cannot be played or implemented correctly without resolving this |
| `high` | Significantly affects game balance or a common situation |
| `medium` | Affects edge cases or infrequent situations |
| `low` | Minor wording issue; most interpretations produce the same outcome |

---

## `conflicts_with`

Use `conflicts_with` to link two ambiguity records whose chosen resolutions are mutually incompatible. If you resolve ambiguity A one way and ambiguity B another way, and those choices contradict each other, `conflicts_with` makes that tension explicit so a future spec review can address both together.
