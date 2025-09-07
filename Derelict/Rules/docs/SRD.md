# Derelict Game Rules Modules

This folder contains initially one but later perhaps more implementations of the Rules interface.

Rules implement various kinds of board game rules.  

Rules will read and write the BoardState object.  Rules will also reference two Players objects, and ask them to make choices.

Based on these choices made, the game will progress until one player wins.

## General Game Rules

Initially the rules of the game are very simple; all this is implemented in the Rules:runGame function: 

* The first player controls the marines while the second player controls the aliens and blips.  For the time being, aliens and blips have the same action choices available as marines.
* The first player must select a cell on the board with a marine in it to activate the marine, or pass, which yields control to the other player.  If there are no marines on the board that can be selected, the game is lost and runGame() exits.
* Once a marine, alien, or blip is selected, the controlling player may choose to move one cell forward (in the direction the token is facing), move one cell diagonally forward, move one cell backward, or move one cell diagonally backward (each subject to the appropriate AP cost) assuming the destination cell is a corridor and does not contain a marine, alien, or blip, or turn left, or turn right, or select a different token of the same side to activate it.
* Marines, blips and aliens all block movement for each other.
* This selection and movement can continue indefinitely.  At any time, the active player may also choose a "pass" action which ends their activation and hands control to the other player.

This rules module should make the process of choosing for players as simple as possible.  That means that this rules module should examine the boardState and provide an explicit list of possible legal choices
to players whenever possible.  So above, the Rules should search the board for cells with marines and provide these cells as an explicit list to the player to choose.
For the choice of what action to take, the rules should inspect the cell in front of the marine and decide if it meets the above conditions such that it can be moved into.  If not, this choice should not be offered, and only turn left, turn right, or a list of alternative selectable marines should be offered.

The rules should then avait the player to make a choice.  If the player chooses to move or turn a marine, this action should be carried out by mutating the board state, and if necessary, a change should be signaled to the Game module so that the board may be redrawn.

When choices are offered to players, the choices should be provided with information such as cell coordinates, choice type identifiers ("move forward", "turn left") and so on.

When an activated unit is determining available actions, the rules also inspect the three cells directly forward or diagonally forward from the unit.  Each of these cells is checked for the presence of a "door" or "dooropen" token.  For every such token found, the player is offered a "door" choice that includes the door's cell coordinates.  If a "dooropen" token shares its cell with a "marine", "alien" or "blip" token, the door is considered blocked and no choice to close it is presented.  When a player selects a "door" choice, the corresponding token is swapped between "door" and "dooropen", representing the unit opening or closing that door.

If a player chooses to activate a different unit while one is already active, the formerly active unit receives a "deactivated" token in its cell.  Units that share a cell with a "deactivated" token are not offered as activation choices.  When a player selects "pass", all "deactivated" tokens are removed from the board, allowing those units to be activated again on subsequent turns.

## Game Actions

Each unit type starts its activation with a certain number of action points (AP) as listed in the following table:

| Unit    | Action Points (AP) |
|---------|--------------------|
| Marine  | 4                  |
| Alien   | 6                  |
| Blip    | 6                  |

The following table lists all the different actions (choices) that are available, and a columns for each of the kind of units that can be activated.  The column of each unit type contains the action point (AP) cost to perform the action in the first column:

| Action        | 	Marines   | 	Aliens	 | Blips   | Notes |
|---------------|-------------|------------|---------|-------|
| activate ally | 0           | 0         | 0        |  Generally first action in a turn when no unit has yet been activated. When a unit has been activated, activating the next unit forfeits all remaining action points of the current unit.     |
| shoot         | 1 or 0      | -         | -        |  Cost for marines is 0 when performed immediately following a move or turn action; else 1. |
| assault       | 1           | 1         | -        |       |
| move forward  | 1           | 1         | 1        |  Moves one cell forward, forward-left or forward-right.     |
| move backward | 2           | 2         | 1        |  Moves one cell backward, backward-left or backward-right.     |
| move sideways | -           | 1         | 1        |       |
| door open     | 1           | 1         | 1        |       |
| door close    | 1           | 1         | 1        |       |
| turn left	    | 1           | 1 or 0    | 0        | Cost for aliens is 0 when performed immediately following a move action; else 1. |
| turn right    | 1           | 1 or 0    | 0        | Cost for aliens is 0 when performed immediately following a move action; else 1. |
| unjam         | 1           | -         | -        |       |
| overwatch     | 2           | -         | -        |       |
| guard	        | 2           | -         | -        |       |
| reveal        | -           | -         | 6        | Voluntary conversion to alien(s). |
| pass turn     | 0           | 0         | 0        | Concludes the active player's turn.      |


## Line of Sight

Line of sight between two cells exists when every cell touched by the Bresenham line
algorithm between them is free of obstructions. A cell is obstructed if it is not a
corridor cell or contains a blocking token such as a closed door, marine, alien or
blip. When the line steps diagonally between two cells, at least one of the two
adjacent off-diagonal cells must also be unobstructed; otherwise line of sight is
blocked. The check is performed in both directions and line of sight exists only
if both paths are unobstructed.

## Marine Field of View

Marines can only see within a 90-degree arc centered on their facing direction.
Cells outside this field of view are never considered visible to the marine,
even if unobstructed.

## Cells visible to a Marine

A cell is said to be visible to a marine if it is both within the field of view of the 
marine and there is a line of sight between the cell and the marine.

## Blip Movement Restriction

Blips may not move into any cell that has line of sight to a cell containing a
marine. This uses the marine's field of view and line-of-sight rules above.
Blips also cannot move into any of the eight cells directly adjacent to a
marine, regardless of visibility. The rules filter available blip movement
options to enforce these restrictions.

## Voluntary Conversion of Blips

The second player controlling aliens and blips may decide to reveal an activated blip, which costs the entire 6 AP budget of the blip.  
Blips are represented using "blip", "blip_2" or "blip_3" tokens.  The regular "blip" token transforms into a single alien, "blip_2" transforms into two aliens, and "blip_3" transforms into three aliens.
The first alien is placed on the cell that the blip was occupying.  The one or two additional aliens when available may be placed by the alien player in any empty cell adjacent to first alien that is not visible to any marine.
If there are insufficient cells meeting this condition for placement, the additional aliens that cannot be placed are forfeited. Aliens are also forfeited if placing them would increase the number of aliens on the board above 22.

When a player choses the reveal action for a blip, the first alien is immediately converted.
If there is a second aliens to be placed, the adjacent cells meeting the above placement condition are determined, and if there is at least one, they are offered to the player as "deploy" actions with the apropriate cell as a parameter, similar to how a move action would be offered.  An alien is placed in the chosen cell.
If there is a third alien to be placed, the adjacent cells meeting the above placement condition are again determined, and if there is at least one, they are again offered to the player as "place" actions, and again an alien is placed in the chosen cell.
Immediately after each alien is placed in this way, the alien player may turn that alien left or right any number of times at no AP cost before proceeding, allowing each deployed alien to be oriented as desired.
As long as there are remaining aliens to place and at least one eligible cell, the alien player must deploy another alien.
Only when no further aliens can be deployed are the choices to activate any not yet activated allies or to pass the turn offered.
