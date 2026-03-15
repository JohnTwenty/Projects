# Space Hulk 3rd Edition Core Rulebook Coverage Matrix

## Scope

This matrix covers the uploaded **core 22-page rulebook only**. Mission-book setup, mission-specific victory conditions, and mission-specific special rules are intentionally out of scope for now.

## Coverage legend

- **Covered** — represented in the current `state_spec`, `rules_spec`, or `ambiguities`
- **Partial** — represented, but not yet normalised in enough detail for confident execution or testing
- **Out of scope** — intentionally deferred
- **Missing** — should be represented but is not yet adequately captured

## Coverage table

| Rulebook area | Status | Current coverage | Notes / gaps |
|---|---|---|---|
| Overall game framing and side roles | Covered | `state_spec.state_model.physical_state.entity_types` for Space Marines, Genestealers, blips; top-level game metadata | Flavor text intentionally not modeled |
| Mission book dependency | Out of scope | Mentioned in bundle metadata only | Mission setup, force composition, victory conditions, and scenario special rules deferred |
| Box contents / components | Partial | Core components reflected in `entity_types`, `zones`, `resources` | Could add fuller component inventory and component-to-entity traceability |
| Facing | Covered | `space_marine_model.facing`, `genestealer_model.facing`, invariant `inv_no_diagonal_facing` | Good |
| Board squares and occupancy | Covered | `board_square`, relation `occupies_square`, invariant `inv_one_piece_per_square`; topology uses `xy_integer` coordinates with `position_type: {x, y}` | Good |
| Doors as board objects | Covered | `door` entity, `act_open_or_close_door`, shooting and close-assault door logic, chainfist override | Door placement is scenario-dependent |
| Timer | Covered | `timer_running`, `proc_space_marine_command_phase`, `proc_space_marine_action_phase`, `rinv_timer_ends_space_marine_action_phase_immediately_after_current_action` | Could later add exact timer lifecycle state |
| Dice as resolution tools | Covered | `current_dice_results`, multiple `resolution_procedures` | General dice model still informal; `dice_expression` schema type now available for future normalisation |
| Blips and hidden values | Covered | `blip_counter`, hidden value tracking, `unrevealed_blip_values`, blip movement and conversion rules | Good candidate for later hidden-information test cases |
| Mission status display and counters | Partial | `mission_status_counter`, resources for command points, assault cannon ammo, psi points; Mission Status procedure | Not every printed counter is yet fully normalised as a distinct state item |
| Turn sequence and phases | Covered | `proc_turn_loop`, all five phase procedures | Strongly covered from the rulebook turn sequence summary |
| Command phase draw / hidden counter | Covered | `hidden_command_points_value`, command phase procedure, mission status reveal invariant | Good |
| Sergeant redraw of command counter | Covered | `ov_sergeant_command_redraw` | Good |
| Command point overspend loses game | Covered | Mission status procedure + invariant `rinv_space_marine_loses_game_if_command_points_overspent` | Good |
| Command points in Space Marine turn | Covered | `command_points_available`, `command_points_spent_this_turn`, restriction/action-phase notes | Good |
| Command points in Genestealer turn as reactions | Covered | `proc_command_point_reaction`, `command_point_reactions_used_this_activation` state variable, interrupt window in GA activation loop | CP reactions now a first-class procedure invoked after each Genestealer action |
| Action points and per-piece activation | Covered | `remaining_ap_for_active_piece`, explicit activation steps, action library costs, `ap_cost_table` shared type | AP cost table now a first-class data structure from ocr_gaps.md |
| No reactivation except command points | Covered | `pieces_activated_this_turn`, `rest_no_reactivation_without_command_points` | Good |
| Move rules | Covered | `act_move`, `rest_space_marine_no_sideways_move`, movement preconditions | Sideways restriction now explicit per AP table |
| Turn rules | Covered | `act_turn`, `rest_space_marine_no_turn_180`, `rest_blip_no_turn`, `amb_turn_180_costs` resolved | SM cannot turn 180°; GS turn_180 costs 1 AP; blips cannot turn. All per ocr_gaps.md. |
| Exiting the map | Covered | `act_exit_map`, `event_piece_exited_map` | Victory tracking is scenario-defined; core mechanism captured |
| Door opening/closing positioning rule | Covered | `act_open_or_close_door`, forward-square precondition | Good |
| Shoot action basics | Covered | `act_shoot`, LOS/range derived terms, weapon-specific resolution procedures | Good baseline |
| Line of sight in corridors / forward arc | Covered | `line_of_sight_matrix`, term `front_arc`, LOS-related conditions | Could later formalise LOS geometry more rigorously |
| LOS around corners | Partial | Captured conceptually in LOS conditions | Not yet encoded as explicit topology/visibility sub-rules |
| LOS into rooms | Partial | Captured conceptually in LOS conditions | Same as above |
| Range counting | Partial | Represented conceptually in shoot and overwatch conditions | Could use explicit distance-counting helper term/rule |
| Overwatch setup | Covered | `act_set_overwatch`, restriction on heavy flamer, overwatch state/counter, term `overwatch` | Good |
| Losing overwatch by acting or being assaulted | Covered | `trig_overwatch_lost_by_action`, `trig_overwatch_lost_by_close_assaulted` | Good |
| Overwatch shooting timing and 12-square limit | Covered | `trig_overwatch_fire`, trigger condition and notes | Good |
| Overlapping overwatch | Covered | `trig_overlapping_overwatch` | Good |
| Close assault basic procedure | Covered | `act_close_assault`, `res_close_assault` with dice count (3d6 each, take highest) | Dice count inferred from Broodlord Mighty Blow example in ocr_gaps.md |
| Close-assault attacker/defender outcome logic | Covered | `res_close_assault` steps including defender-turn-to-face and tie-goes-to-attacker | Good |
| Sergeant close-assault bonus | Covered | `ov_sergeant_close_assault_bonus` | Good |
| Guard action | Covered | `act_set_guard`, term `guard`, `amb_guard_loss_on_attacking` | Good |
| Guard reroll and persistence through enemy attacks | Covered | Guard notes and ambiguity resolution | Could later encode as explicit close-assault override |
| Close assault against doors | Covered | `ov_chainfist_vs_door` and door assault handling | Good |
| Reinforcement blips from stack | Covered | `proc_genestealer_reinforcements_phase` with explicit draw and place/lurk steps | Good |
| Placing blips off-board at entry areas | Covered | `off_board_entry_area`, blip placement state, reinforcement rules | Good |
| Lurking | Covered | `lurking_blip_ids` phase_state, explicit lurk/place choice in reinforcements phase, term `lurk`; `inv_lurk_capacity_per_entry_area` (max 3 per entry area) | Good |
| Blip movement restrictions | Covered | blip movement rules, `rest_blips_no_attack`, invariants on LOS and adjacency | Good |
| Blips cannot move next to Space Marines | Covered | invariant `inv_blip_not_adjacent_to_space_marine` | Good |
| Voluntary conversion | Covered | `act_voluntary_reveal_blip` with preconditions: blip must be active and must not have acted this turn; `res_place_revealed_genestealers` | Good |
| Involuntary conversion | Covered | `trig_involuntary_blip_reveal` plus `res_place_revealed_genestealers`; placing counts as action (overwatch eligible) | Good |
| Placement of revealed Genestealers | Covered | `res_place_revealed_genestealers`: voluntary placement outside SM LOS; involuntary placement by SM player | Good |
| Revealed Genestealer activation if blip already acted | Covered | `blip_activated_before_reveal` historical state and placement notes | Good |
| Mission Status phase cleanup | Covered | `proc_mission_status_phase` and related invariant/cleanup effects | Good |
| Ladders | Partial | Represented as board-square attributes and notes | Mission-dependent; likely better as optional core extensions |
| Objects | Partial | `carried_or_ground_object`, `act_pick_up_object` (0 AP), `act_pass_object`, `act_drop_object` | Pass/drop AP cost unresolved; see `amb_object_pass_ap_cost` |
| Storm bolter | Covered | `res_storm_bolter_attack`, move-and-fire notes, sustained fire, jams, overwatch interaction | Good |
| Storm bolter sustained fire | Covered | `sustained_fire_context`, storm bolter resolution and notes | Good |
| Storm bolter jams | Covered | jam counters/state, `act_clear_jam`, overwatch jam notes | Good |
| Assault cannon | Covered | `res_assault_cannon_attack`, ammo resource, reload action, malfunction rule | Good |
| Assault cannon overwatch | Covered | Included in assault cannon and overwatch rules | Good |
| Heavy flamer | Covered | `res_heavy_flamer_attack`, persistent section blocking, limited ammo notes | Good |
| Heavy flamer doors interaction | Covered | flamers-and-doors notes in first-pass rules | Good |
| Chainfist | Covered | `ov_chainfist_vs_door` and note that vs Genestealers it behaves like power fist | Good |
| Lightning claws | Covered | `ov_lightning_claws_close_assault` | Good |
| Power sword parry | Covered | `ov_power_sword_parry` | Good |
| Storm shield block | Covered | `ov_storm_shield_block` | Good |
| Thunder hammer bonus | Covered | `ov_thunder_hammer_bonus` | Good |
| Librarian combat veteran bonus | Partial | `ov_librarian_combat_veteran` added | PDF source text not confirmed directly; see `amb_librarian_combat_veteran_source` |
| Psi points track and depletion | Covered | `librarian_psi_points_remaining`, psi resource rules | Good |
| Force axe spending psi after rolls/rerolls | Covered | `ov_librarian_force_axe_bonus_from_psi` | Good |
| One psychic power per Space Marine turn | Covered | `psychic_power_used_this_space_marine_turn`, `act_use_psychic_power` | Good |
| Prescience | Partial | `ov_prescience` stub added | Exact mechanic pending PDF verification; see `amb_prescience_mechanics` |
| Force Barrier | Covered | `ov_force_barrier`, `rest_force_barrier_blocks_entry`, `rest_force_barrier_blocks_los` | Good |
| Psychic Storm | Covered | `res_psychic_storm` with range constraint (6 squares) and structured `dice_spec` (1d6/2+ single, 1d6 per model/4+ section) | Good |
| Broodlord reveal rule | Covered | `ov_broodlord_reveal` (corrected: replaces all 3 genestealers from a 3-value blip) | Source: ocr_gaps.md |
| Broodlord Hard to Kill | Covered | `ov_broodlord_hard_to_kill`, ambiguity resolved using ocr_gaps.md text | Good |
| Broodlord Mighty Blow | Covered | `ov_broodlord_mighty_blow` | Good |
| Broodlord immune to Psychic Storm | Covered | `ov_broodlord_immune_to_psychic_storm` | Good |
| Reference sheet summary page | Partial | Used as corroborating source only | OCR on reference sheet is damaged; not treated as sole authority |

## Current assessment (updated after third-pass edits)

### Strongly covered areas

- Turn structure and phase sequencing with explicit activation loop steps
- Command points, timer, and reaction window (`proc_command_point_reaction`)
- Action points backed by the full AP cost table (`ap_cost_table` shared type from ocr_gaps.md)
- Movement restrictions (no SM sideways, no SM or blip 180° turn) resolved from ocr_gaps.md
- Doors, shooting, overwatch, close assault (with dice count inferred from ocr_gaps.md), and guard
- Blips, hidden information, voluntary and involuntary reveal with all placement constraints
- Lurking as first-class state variable with capacity invariant (max 3 per entry area)
- Force barrier as full restriction rules (blocks entry and LOS)
- Psychic storm with range constraint and structured dice specs
- Exit-map action; turn number tracking
- All major wargear override rules; Broodlord reveal corrected (replaces all 3 genestealers)
- Board topology model
- Structured `dice_spec` on all resolution procedures (storm bolter, assault cannon, heavy flamer, psychic storm, close assault)

### Remaining incomplete areas

1. **LOS geometry** — `los_definition` in topology block now specifies Bresenham center-to-center, symmetry required, both-corners-blocked corner rule, and all three obstruction sources (walls, closed doors, force barriers). The derived state `line_of_sight_matrix` and prose conditions in individual rules still reference this by prose; once the expression language is formalised those can be replaced with typed references to the LOS definition.
2. **Librarian combat veteran bonus** — `ov_librarian_combat_veteran` added but PDF source not confirmed; see `amb_librarian_combat_veteran_source`.
3. **Prescience** — `ov_prescience` added with correct mechanic (CP marker back 1); no open design issues remain; source confirmed via OCR rulebook.
4. **Object pass/drop AP cost** — actions added; cost unresolved in `amb_object_pass_ap_cost`.
5. **Genestealer AP budget** — entered as 6 per activation; should be confirmed from PDF. See `amb_gs_ap_budget`.
6. **Schema loop construct** — activation procedures note the schema lacks a native loop step_kind; inner loops described via notes.
7. **Win conditions** — `rules_model.win_conditions` schema section now exists; no entries yet (all are mission-specific, belong in per-scenario files).
8. **Blip LOS return rule** — `last_safe_position` historical state variable and trigger not yet added.
9. **Forced-lurk rule** — SM within 6 of entry area forces lurk for new reinforcements; not yet a trigger rule.
10. **Remaining close-assault edge cases** — `amb_close_assault_tie_facing` still open; assault cannon malfunction detail incomplete; heavy flamer persistent movement roll trigger missing.
11. **Diagonal/corner-clipping restriction** — movement restriction not yet captured.

## Recommended next steps

### Requires PDF access
- Verify Librarian combat veteran +1 bonus; resolve `amb_librarian_combat_veteran_source`
- Verify Prescience and Force Barrier exact mechanics
- Verify Genestealer AP budget per activation
- Verify object pass/drop AP cost

### Schema work
- Add a `loop` or `repeat_until` step_kind to `procedure_step` to eliminate activation loop stub notes
- Design a minimal formal expression language for conditions (currently prose strings throughout)

### Content work (no PDF required)
- Formalise LOS geometry as executable topology rules
- Extract mission-specific win conditions into per-scenario files once a scenario file format is established

## Suggested validation prompts for a second model

1. **Find omissions:** "Given this Space Hulk rulebook text and this formal bundle, list any rulebook rules not represented in the spec."
2. **Find overreach:** "Identify any formal rules or state variables not justified by the cited rulebook text."
3. **Find execution gaps:** "Identify any rules represented descriptively but not in a way that would support deterministic game execution."
4. **Find state gaps:** "Identify any game state that a web implementation would need but is not yet represented."
5. **Find ambiguity leaks:** "Identify any places where the current bundle appears to choose an interpretation without recording an ambiguity."
