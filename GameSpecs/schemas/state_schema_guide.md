# State Schema Authoring Guide

Companion to `state_schema.yaml`. Contains guidance that would break a JSON Schema validator if left in the schema file itself.

---

## Modeling guidelines

- **Prefer `physical_state`** when the information corresponds to something players can point to on the table or among the components: a miniature's position, a counter's value, a door's open/closed state, a resource track marker.
- **Prefer `supplemental_state`** when the information is needed to execute or validate rules but is only mentally tracked, inferred, temporary, or historical: current player, active unit, pending dice results, history of which units have acted.
- A value may be represented physically in some games and supplemental in others; use `represented_physically` to record that distinction explicitly per game.
- Use `source_trace` entries to justify every implicit or inferred state variable introduced for digital implementation.

---

## Boundary: `resources` vs entity `attributes` vs `supplemental_state`

These three locations can all store numeric or enumerated values. The intended boundary is:

| Location | Use for | Examples |
|---|---|---|
| `physical_state.resources` | Player- or side-scoped totals that are visibly tracked on the table as shared counters or tracks | Command points available, command points spent this turn |
| `entity_type.attributes` | Per-entity properties that are immutable or change slowly; physically visible on or near the piece | Marine role, weapon carried, alive/dead status |
| `supplemental_state` | Implementation bookkeeping, derived values, phase-scoped counters, history | Pieces activated this turn, remaining AP for active piece, hidden command points value |

**Space Hulk example — command points appear in all three because they serve different roles:**
- `resources.command_points_available` — the visible track showing how many CP remain for the SM player this turn (physical)
- `resources.command_points_spent_this_turn` — the visible spent marker (physical)
- `hidden_information_state.hidden_command_points_value` — the secretly drawn counter value that determines the true budget; not revealed until Mission Status phase (supplemental/hidden)

If a value belongs in two places, add a `required_for` or `notes` cross-reference rather than removing one entry. Do not merge them into a single variable — the physical/supplemental split is load-bearing for traceability.

---

## Examples

**physical_state examples**
- miniature position and facing
- token presence on a board square
- door open or closed state
- resource track markers (command points, psi points, ammo)

**supplemental_state examples**
- `current_player`
- `current_turn_sequence_step`
- `active_piece_id`
- `remaining_ap_for_active_piece`
- `current_dice_results`
- `pieces_activated_this_turn`

---

## `direction` binding

When an attribute or state variable has `value_type: direction`, pair it with the object form of `value_type` to bind it to the topology's direction enum:

```yaml
- id: facing
  value_type:
    direction_source: topology_direction_values
```

This tells validators that legal values for `facing` are exactly those listed in `topology_definition.direction_values`. Without the binding, a validator cannot check whether `"north"` is a legal facing for this game.

---

## `pool` and `deck` cardinality

Use `cardinality: pool` for unordered bags where elements are drawn without replacement (command counter tiles, blip counters). Use `cardinality: deck` for ordered collections where position matters (card decks). Pair with the `draw_random` and `draw_top` effect kinds in the rules spec.
