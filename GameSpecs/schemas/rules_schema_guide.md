# Rules Schema Authoring Guide

Companion to `rules_schema.yaml`. Contains guidance that would break a JSON Schema validator if left in the schema file itself.

---

## Conceptual split

| Section | Use for |
|---|---|
| `procedural_structure` | When play progresses and who acts next: turn loops, phases, activation sequences, setup steps |
| `action_library` | Legal player or unit choices that may be selected during play |
| `trigger_rules` | Automatic reactions fired by game events: overwatch, interrupts, start-of-phase effects, aftermath effects |
| `restriction_rules` | Prohibitions and hard limits: things that may never be done under certain conditions |
| `resolution_procedures` | Multi-step outcome determination: dice sequences, damage application, contested rolls |
| `override_rules` | Exceptions and special rules that modify, replace, or cancel core rules |
| `derived_terms` | Named concepts referenced in conditions and notes: front arc, LOS, guard, overwatch |
| `win_conditions` | Victory and defeat conditions; typically populated per-scenario rather than in core files |

---

## Modeling guidelines

- **`procedure_definition`** for turn order, activation sequences, setup order, and other stepwise control flow.
- **`action_definition`** for legal player or unit choices that may be selected during play.
- **`trigger_rule`** for automatic reactions: overwatch fire, involuntary reveals, end-of-phase cleanup, state invariant enforcement.
- **`override_rule`** whenever a special rule modifies, replaces, or cancels a core rule. Do **not** bury exceptions inside `notes` — if it changes behavior it needs to be a first-class rule.
- Keep conditions and effects normalised and reusable where practical so that legality checks, code generation, and tests can reference them consistently.
- Use `source_trace` and `source_refs` aggressively, especially where wording has been normalised or proceduralized beyond the original rulebook text.

---

## Trigger ordering

Assign `priority` values deliberately. Higher integers resolve before lower integers. Use `trigger_model.same_priority_resolution` to declare what happens if two triggers share a priority. Prefer `error` during spec authoring to surface accidental duplicates early, then switch to `queue_fifo` once priorities are confirmed.

---

## Pool and deck draw effects

Use `effect_kind: draw_random` when removing a random element from a `cardinality: pool` state variable (draw without replacement). Use `effect_kind: draw_top` when removing the top element from a `cardinality: deck` state variable. Set `output_binding` to the state variable that should receive the drawn value.

```yaml
- id: eff_draw_command_counter
  effect_kind: draw_random
  target: command_counter_pool
  output_binding: hidden_command_points_value
```

---

## `override_rule` kinds

| `override_kind` | Meaning |
|---|---|
| `modifying` | Alters one or more aspects of the target rule while leaving the rest intact |
| `replacement` | Entirely replaces the target rule's steps/effects |
| `extension` | Adds extra steps or effects to the target rule without removing existing ones |
| `cancellation` | Prevents the target rule from applying at all |
| `additive` | Adds new behavior that coexists with the target rule (e.g. an extra step in a phase) |
