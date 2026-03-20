# GameSpecs TODO

Last updated: 2026-03-15. All Space Hulk content and medium/low schema items are complete.
Remaining open items are three structural tasks and the expression language design question.

---

## Open items

### Expression language — deferred, under discussion

- [ ] **Formal expression language for conditions**
  Conditions (`condition.expression`) and effect operations (`effect.operation`, `effect.value`) are
  free-form prose strings throughout. For code generation and automated validation to work these need
  a structured, evaluable representation. Requires designing a minimal expression AST (comparison,
  logical, state-ref, membership, function-call nodes) and migrating existing prose to it.
  Blocks: code generation, deterministic adjudication, automated test generation, the two migration
  tasks below.

- [ ] **Migrate all `condition.expression` prose to structured expressions**
  Blocked on expression language design. Highest-value targets once unblocked: action preconditions,
  trigger conditions, restriction `applies_when`.

- [ ] **Migrate all `effect.operation` / `effect.value` prose to structured effects**
  Blocked on expression language design. Also requires a defined set of built-in operation types.

### Schema — still open

- [ ] **Cross-schema validation**
  Rules reference state variable IDs, entity type IDs, and zone IDs as plain strings. Nothing
  checks that a referenced ID actually exists in the state spec. Requires either a bundled validator
  or a shared ID registry. Blocks: reliable tooling on multi-file specs.

- [ ] **Test schema**
  No schema for expressing test cases: "given state X, apply action Y, expect state Z (or
  ambiguity A)". Required if the goal includes automated validation of extracted rules.

### Structural / process — still open

- [ ] **Add `loop` / `repeat_until` step_kind to `procedure_step` schema**
  Both activation loop procedures use `step_kind: custom` with a note explaining the loop intent.
  A proper `loop` step_kind with `body_procedure_id` and `termination_condition` fields would
  eliminate the workaround.

- [ ] **Validate Space Hulk YAML against the schemas formally**
  The YAML parses as valid YAML but has never been validated against the schema definitions.
  Write a JSON Schema validator script (e.g. ajv for Node or jsonschema for Python) or add a CI step.

- [ ] **Split the bundle file into separate files**
  `space_hulk_core_first_pass.yaml` contains state_spec, rules_spec, and ambiguities in one file.
  The `imports` mechanism already supports splitting. Separate files would make diffs cleaner and
  allow scenario files to import only the slices they override.

---

## Completed

### Schema
- [x] `position` value_type formalised — `position_type: {x: integer, y: integer}` in topology
- [x] `direction` value_type bound to topology — `direction_source: topology_direction_values`
- [x] LOS geometry formalised — `los_definition` in topology: Bresenham, symmetry required, both-corners-blocked, obstruction sources
- [x] Trigger ordering semantics — `trigger_model` def with `same_priority_resolution` and `interrupt_window`
- [x] Pool/bag draw mechanic — `pool`/`deck` cardinality; `draw_random`/`draw_top` effect kinds
- [x] `dice_expression` wired to `resolution_step` via `dice_spec` field
- [x] `example_authoring_guidance` stripped from all schema files → `*_guide.md` companions
- [x] Resources vs attributes vs supplemental state boundary documented in `state_schema_guide.md`

### Space Hulk YAML — state
- [x] `current_turn_number` turn_state variable
- [x] `last_safe_position` historical state on blip entities (recovery-only)
- [x] `command_counter_pool` hidden state variable (`cardinality: pool`)
- [x] Librarian `psi_points_remaining` `initial_value: 20`
- [x] `inv_lurk_capacity_per_entry_area` invariant (max 3 blips per entry area)

### Space Hulk YAML — rules
- [x] `dice_spec` on all resolution procedures (storm bolter, assault cannon, heavy flamer, psychic storm, close assault)
- [x] Psychic storm range precondition (6 squares)
- [x] Force barrier restriction rules (`rest_force_barrier_blocks_entry`, `rest_force_barrier_blocks_los`)
- [x] Forced-lurk restriction (`rest_forced_lurk_sm_within_6_of_entry`)
- [x] Corner-clipping restriction (`rest_no_corner_clipping`)
- [x] SM no-turn-180, no-sideways-move, blip no-turn restriction rules
- [x] SM sustained fire cleared on move-and-fire
- [x] Assault cannon malfunction full outcome (marine killed, 1d6/4+ blast to section)
- [x] Heavy flamer persistent hazard (`res_heavy_flamer_persistent_roll` + `trig_heavy_flamer_persistent_hazard`)
- [x] Blip LOS recovery trigger (`trig_blip_los_recovery`, recovery-only)
- [x] Voluntary reveal: blip-not-acted precondition; placement outside SM LOS constraint
- [x] Involuntary reveal: placing counts as action for overwatch
- [x] Blip stack reshuffle step in reinforcements procedure
- [x] Command phase and blip draw updated to `effect_kind: draw_random`
- [x] `trig_blip_los_recovery` (priority 109), `trig_heavy_flamer_persistent_hazard` (priority 80)
- [x] `trigger_model` wired in rules_model: `queue_fifo`, interrupt window before trigger body

### Space Hulk YAML — ambiguities
- [x] `amb_close_assault_tie_facing` resolved provisionally (tie = no casualties, i1 adopted)
- [x] All other ambiguities resolved in prior passes
