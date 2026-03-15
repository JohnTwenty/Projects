# Space Hulk 3rd Edition Core Rulebook Coverage Matrix

## Scope

This matrix covers the uploaded **core 22-page rulebook only**. Mission-book setup, mission-specific victory conditions, and mission-specific special rules are intentionally out of scope for now.

## Coverage legend

- **Covered** — represented in the current first-pass `state_spec`, `rules_spec`, or `ambiguities`
- **Partial** — represented, but not yet normalized in enough detail for confident execution or testing
- **Out of scope** — intentionally deferred from this pass
- **Missing** — should be represented but is not yet adequately captured

## Coverage table

| Rulebook area | Status | Current coverage in first-pass bundle | Notes / gaps |
|---|---|---|---|
| Overall game framing and side roles | Covered | `state_spec.state_model.physical_state.entity_types` for Space Marines, Genestealers, blips; top-level game metadata | Flavor text intentionally not modeled |
| Mission book dependency | Out of scope | Mentioned in bundle metadata only | Mission setup, force composition, mission victory conditions, and scenario special rules deferred |
| Box contents / components | Partial | Core components reflected in `entity_types`, `zones`, `resources` | Could add fuller component inventory and component-to-entity traceability |
| Facing | Covered | `space_marine_model.facing`, `genestealer_model.facing`, invariant `inv_no_diagonal_facing` | Good core representation |
| Board squares and occupancy | Covered | `board_square`, relation `occupies_square`, invariant `inv_one_piece_per_square` | Could later add richer board topology model |
| Doors as board objects | Covered | `door` entity, `act_open_or_close_door`, shooting and close-assault door logic, chainfist override | Door placement is scenario-dependent |
| Timer | Covered | `timer_running`, `proc_space_marine_command_phase`, `proc_space_marine_action_phase`, `rinv_timer_ends_space_marine_action_phase_immediately_after_current_action` | Could later add exact timer lifecycle state |
| Dice as resolution tools | Covered | `current_dice_results`, multiple `resolution_procedures` | General dice model still informal rather than fully normalized |
| Blips and hidden values | Covered | `blip_counter`, hidden value tracking, `unrevealed_blip_values`, blip movement and conversion rules | Good candidate for later hidden-information test cases |
| Mission status display and counters | Partial | `mission_status_counter`, resources for command points, assault cannon ammo, psi points; Mission Status procedure | Not every printed counter is yet fully normalized as a distinct state item |
| Turn sequence and phases | Covered | `proc_turn_loop`, `proc_space_marine_command_phase`, `proc_space_marine_action_phase`, `proc_genestealer_reinforcements_phase`, `proc_genestealer_action_phase`, `proc_mission_status_phase` | Strongly covered from the rulebook turn sequence summary |
| Command phase draw / hidden counter | Covered | `hidden_command_points_value`, command phase procedure, mission status reveal invariant | Good |
| Sergeant redraw of command counter | Covered | `ov_sergeant_command_redraw` | Good |
| Command point overspend loses game | Covered | Mission status procedure + invariant `rinv_space_marine_loses_game_if_command_points_overspent` | Good |
| Command points in Space Marine turn | Covered | `command_points_available`, `command_points_spent_this_turn`, restriction/action-phase notes | Could benefit from more explicit reusable command-point spend effect |
| Command points in Genestealer turn as reactions | Partial | Represented conceptually in state/rules and trigger logic, but not yet as a fully normalized generic reaction procedure | Important next cleanup item |
| Action points and per-piece activation | Covered | `remaining_ap_for_active_piece`, activation notes, action library costs, restriction `rest_one_piece_activated_at_a_time` | Good |
| No reactivation except command points | Covered | `pieces_activated_this_turn`, `rest_no_reactivation_without_command_points` | Good |
| Move rules | Covered | `act_move`, movement preconditions, move/turn notes | Could later encode diagonal-blocking logic more formally |
| Turn rules | Partial | `act_turn`, some turn-cost modeling, ambiguity `amb_turn_180_costs` | Exact 180-degree normalization still deferred because of OCR damage |
| Exiting the map | Missing | Not represented in first-pass state/rules | Should be added as a generic action/out-of-play transition |
| Door opening/closing positioning rule | Covered | `act_open_or_close_door`, forward-square precondition | Good |
| Shoot action basics | Covered | `act_shoot`, LOS/range derived terms, weapon-specific resolution procedures | Good baseline |
| Line of sight in corridors / forward arc | Covered | `line_of_sight_matrix`, term `front_arc`, LOS-related conditions | Could later formalize LOS geometry more rigorously |
| LOS around corners | Partial | Captured conceptually in LOS conditions | Not yet encoded as explicit topology/visibility sub-rules |
| LOS into rooms | Partial | Captured conceptually in LOS conditions | Same as above |
| Range counting | Partial | Represented conceptually in shoot and overwatch conditions | Could use explicit distance-counting helper term/rule |
| Overwatch setup | Covered | `act_set_overwatch`, restriction on heavy flamer, overwatch state/counter, term `overwatch` | Good |
| Losing overwatch by acting or being assaulted | Covered | `trig_overwatch_lost_by_action`, `trig_overwatch_lost_by_close_assaulted` | Good |
| Overwatch shooting timing and 12-square limit | Covered | `trig_overwatch_fire`, trigger condition and notes | Good |
| Overlapping overwatch | Covered | `trig_overlapping_overwatch` | Good |
| Close assault basic procedure | Covered | `act_close_assault`, `res_close_assault`, effects of outcomes | Good |
| Close-assault attacker/defender outcome logic | Covered | `res_close_assault`, outcome notes, defender-turn-to-face behavior represented conceptually | Could later split outcomes more explicitly |
| Sergeant close-assault bonus | Covered | `ov_sergeant_close_assault_bonus` | Good |
| Guard action | Covered | `act_set_guard`, term `guard`, ambiguity record `amb_guard_loss_on_attacking` | Good first pass |
| Guard reroll and persistence through enemy attacks | Covered | Guard notes and ambiguity resolution | Could later encode as explicit close-assault override rather than note-level behavior |
| Close assault against doors | Covered | core text plus `ov_chainfist_vs_door` and door assault handling | Good |
| Reinforcement blips from stack | Covered | `proc_genestealer_reinforcements_phase`, blip stack zone, reinforcement notes | Could use more explicit draw procedure |
| Placing blips off-board at entry areas | Covered | `off_board_entry_area`, blip placement state, reinforcement rules | Good |
| Lurking | Partial | term `lurk`, reinforcement placement notes | Should become an explicit state/rule item |
| Blip movement restrictions | Covered | blip movement rules, restriction `rest_blips_no_attack`, invariants on LOS and adjacency | Good |
| Blips cannot move next to Space Marines | Covered | invariant `inv_blip_not_adjacent_to_space_marine` | Good |
| Voluntary conversion | Covered | conversion rules in first-pass bundle | Could use a dedicated action definition rather than notes-only representation |
| Involuntary conversion | Covered | `trig_involuntary_blip_reveal` plus placement rules | Good |
| Placement of revealed Genestealers | Partial | covered in first-pass bundle, with Space Marine vs Genestealer placement responsibility noted | Could use its own explicit resolution procedure |
| Revealed Genestealer activation if blip already acted | Covered | `blip_activated_before_reveal` historical state and placement notes | Good |
| Mission Status phase cleanup | Covered | `proc_mission_status_phase` and related invariant/cleanup effects | Good |
| Ladders | Partial | represented as board-square attributes and mission-status page notes; some ladder movement/fall rules in first-pass state bundle | Since ladders are mission-dependent, likely better treated as optional core extensions later |
| Objects | Partial | `carried_or_ground_object`, `act_pick_up_object`, carry relation | Missing pass/drop-specific actions and some door/object interaction detail |
| Storm bolter | Covered | `res_storm_bolter_attack`, move-and-fire notes, sustained fire, jams, overwatch interaction | Good first-pass representation |
| Storm bolter sustained fire | Covered | `sustained_fire_context`, storm bolter resolution and notes | Good |
| Storm bolter jams | Covered | jam counters/state, `act_clear_jam`, overwatch jam notes | Good |
| Assault cannon | Covered | `res_assault_cannon_attack`, ammo resource, reload action, malfunction rule | Good |
| Assault cannon overwatch | Covered | included in assault cannon and overwatch rules | Good |
| Heavy flamer | Covered | `res_heavy_flamer_attack`, persistent section blocking, limited ammo notes | Good core coverage |
| Heavy flamer doors interaction | Covered | persistent/flamers-and-doors notes in first-pass rules | Good |
| Chainfist | Covered | `ov_chainfist_vs_door` and note that vs Genestealers it behaves like power fist | Good |
| Lightning claws | Covered | `ov_lightning_claws_close_assault` | Good |
| Power sword parry | Covered | `ov_power_sword_parry` | Good |
| Storm shield block | Covered | `ov_storm_shield_block` | Good |
| Thunder hammer bonus | Covered | `ov_thunder_hammer_bonus` | Good |
| Librarian combat veteran bonus | Missing | Not explicitly represented yet | Should add explicit override or term for Librarian’s +1 close-assault bonus |
| Psi points track and depletion | Covered | `librarian_psi_points_remaining`, psi resource rules | Good |
| Force axe spending psi after rolls/rerolls | Covered | `ov_librarian_force_axe_bonus_from_psi` | Good |
| One psychic power per Space Marine turn | Covered | `psychic_power_used_this_space_marine_turn`, `act_use_psychic_power` | Good |
| Prescience | Partial | mentioned in `act_use_psychic_power` and reference material | Should be split into explicit power-specific rule/effect |
| Force Barrier | Partial | mentioned in `act_use_psychic_power`, force barrier counter in state | Should be split into explicit power-specific rule/effect |
| Psychic Storm | Covered | `res_psychic_storm`, psychic power definitions | Good |
| Broodlord reveal rule | Covered | `ov_broodlord_reveal` | Good |
| Broodlord Hard to Kill | Covered | `ov_broodlord_hard_to_kill`, ambiguity resolved using dictated text | Good |
| Broodlord Mighty Blow | Covered | `ov_broodlord_mighty_blow` | Good |
| Broodlord immune to Psychic Storm | Covered | `ov_broodlord_immune_to_psychic_storm` | Good |
| Reference sheet summary page | Partial | used as corroborating source only | OCR on the reference sheet is damaged; should not be treated as sole authority |

## Current assessment

### Strongly covered areas

The first-pass bundle is already fairly strong on:

- turn structure and phase sequencing
- command points and timer behavior
- action points and one-piece-at-a-time activation
- movement, doors, shooting, overwatch, close assault, and guard
- blips, hidden information, and involuntary reveal
- major wargear rules
- Librarian and Broodlord special rules

These are all directly supported by the core rulebook text. fileciteturn4file0 fileciteturn4file1

### Main incomplete areas

The main gaps I see after this first coverage pass are:

1. **Exit-map rules** are missing entirely.
2. **Command-point reactions in the Genestealer turn** need a more normalized generic procedure.
3. **Lurk**, **voluntary reveal**, and **revealed-model placement** deserve explicit action/procedure objects instead of mostly note-level representation.
4. **Objects** are only partially captured; pass/drop behavior is still thin.
5. **Librarian combat veteran** bonus is missing.
6. **LOS geometry** is represented conceptually, but not yet in a rigorously executable way.
7. **Some power-specific psychic effects** are still collapsed inside `act_use_psychic_power` instead of having distinct normalized rules.
8. **Turn 180° AP cost** remains an OCR-driven ambiguity. fileciteturn4file0 fileciteturn4file1

## Recommended next fixes

### High priority

- add `act_exit_map`
- add explicit `proc_command_point_reaction`
- add explicit `act_voluntary_reveal_blip` and `res_place_revealed_genestealers`
- add explicit Librarian combat-veteran override

### Medium priority

- add object pass/drop actions
- normalize Prescience and Force Barrier as separate rules
- normalize lurk as explicit state/action

### Lower priority

- refine LOS into more executable topology rules
- enrich component inventory / source trace detail

## Suggested validation prompts for a second model

If you want to red-team this with another LLM, these are good prompts:

1. **Find omissions:**
   “Given this Space Hulk rulebook text and this first-pass formal bundle, list any rulebook rules that are not represented in the formal spec.”

2. **Find overreach:**
   “Identify any formal rules or state variables that are not justified by the cited rulebook text.”

3. **Find execution gaps:**
   “Identify any rules that are represented descriptively but not in a way that would support deterministic game execution.”

4. **Find state gaps:**
   “Identify any game state that a web implementation would need but that is not yet represented.”

5. **Find ambiguity leaks:**
   “Identify any places where the current bundle appears to choose an interpretation without recording an ambiguity.”

