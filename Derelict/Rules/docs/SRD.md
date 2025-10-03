# Derelict Game Rules Modules

This folder contains initially one but later perhaps more implementations of the Rules interface.

Rules implement various kinds of board game rules.  

Rules will read and write the BoardState object.  Rules will also reference two Players objects, and ask them to make choices.

Based on these choices made, the game will progress until one player wins.



## Die Rolling

Sometimes the rules call six sided dice to be rolled.  This Game module performs these rolls for all players.  A small number dice of dice may need to be rolled at a time. The results of dice rolls are communicated to the user via the Game UI's text log display capability.
When a set of dice are rolled together, the results should be sorted and presented in descending order.  The random number seed should be established when a new game is started, and stored in the mission file when the game is saved to ensure a deterministic continuity in the
sequence of rolls.

## Randomly Choosing Blips

Sometimes the rules call for randomly choosing blips.  This means selecting between the three different kinds of blip tokens: blip, blip_2, and blip_3.  We do this by picking a uniform random number between 1 and 22 and consulting the following table:

| Random Number | Chosen Blip Token |
|---------------|-------------------|
| 1 .. 9        | blip              |
| 10 .. 13      | blip_2            |
| 14 .. 22      | blip_3            |

## General Game Rules

The first player controls the marines while the second player controls the aliens and blips.  Players alternate taking turns.  

## Victory Conditions

Victory conditions are evaluated whenever the game state could satisfy a special objective. When the `objective` token is present on the map, all associated victory conditions must be checked—ideally at the end of both the marine and alien turns so a newly fulfilled condition is recognized immediately.

The alien player wins if no more marines remain on the board. The marine player wins when particular special token related conditions are achieved as listed in the below table:

| Token         | Victory Condition |
|---------------|-------------------|
| objective     | Marines win when a cell with an objective token receives a fire token.  The aliens win when this becomes impossible (the unit marine_flame is destroyed or the flamer ammo counter reaches zero).| 

## Marine Deployment

Before the first marine turn starts, the marine player must deploy their available marines.  This is done by the player choosing a cell with both a marine token (named 'marine_' with a type suffix) and a drop_marine token, and then choosing a cell with a start_marine token.
The marine is then removed from the cell with the drop_marine token and placed on the cell with the start_marine token.  In addition, the marine token is oriented so it matches the orientation of the start_marine token.

(When presenting these choices to the player, ideally use 'activate' and 'move' type choices, so that for human players the Game UI to select these actions will just work and no new buttons or highlight types are needed.  Nonetheless, the placed marines do not obey normal movement rules or receive deactivated tokens.) 

This deployment continues until there are no more available marines to choose or no more unoccupied cells with a start_marine token to place them on.  After deployment is concluded, the first marine player turn starts as described below.

## Marine Player Turn

At the start of the marine players' turn, all tokens of type overwatch, jam, guard and flame are removed from the board.
Note that removing flame tokens changes lines of sight, which may result in involuntary blip conversions.  See the section below on involuntary conversions for details.

Next, a die is rolled to determine the number of command points available to the marine player.

When a marine of specific token types marine_sarge or marine_hammer is present on the board, the marine player is given the option to roll again.  If the marine player re-rolls, the result of the second roll must be used as the number of command points, even if it is lower than the initial roll.

For the rest of the marine turn, the marine player may activate marines and perform game actions with them, until the decision to pass the turn to the alien player.

## Alien Player Turn

At the start of the alien players' turn, the alien player receives a number of randomly choosen blips as reinforcements.  Unless otherwise specified, this is by default two blips, except on the first turn, which is by default four blips.  See the section above on how to randomly choose each blip token.

The alien player must choose for each reinforcement blip a cell with a 'lurk' token on it but not yet containing a blip.  The reinforcement blip is placed on this cell.  The chosen cell is not required to be a corridor cell.  If there are no valid cells that can be chosen, the reinforcement blip is forfeit.

After all reinforcement blips have been placed, the alien player may activate aliens or blips and perform game actions with them, until the decision to pass the turn to the marine player.

## Activation

The player whose turn it is must select a cell on the board with a controlled token in it (marine for marine player or alien or blip for alien player) to activate the token, or pass, which yields control to the other player.  
Alien or Blip tokens with a 'deactivated' token in the same cell may not be activated.  Marines with a deactivated token may be activated if the marine player has more than one command point remaining.
If there are no tokens on the board that can be activated, the current player loses and the other player wins.

## Game Actions

Each unit type starts its activation with a certain number of action points (AP) as listed in the following table:

| Unit                              | Action Points (AP) |
|-----------------------------------|--------------------|
| Marine with no deactivated token  | 4                  |
| Marine with deactivated token     | 0                  |
| Alien                             | 6                  |
| Blip                              | 6                  |

The following table lists all the different actions (choices) that are available, and a columns for each of the kind of units that can be activated.  The column of each unit type contains the action point (AP) cost to perform the action in the first column:

| Action        | 	Marines   | 	Aliens	 | Blips   | Notes |
|---------------|-------------|------------|---------|-------|
| activate ally | 0           | 0         | 0        |  Generally first action in a turn when no unit has yet been activated. When a unit has been activated, activating the next unit forfeits all remaining action points of the current unit.     |
| shoot bolter  | 1 or 0      | -         | -        |  Cost for marines is 0 when performed immediately following a move or turn action; else 1. |
| shoot cannon  | 1 or 0      | -         | -        |  Cost for marines is 0 when performed immediately following a move or turn action; else 1. |
| shoot flamer  | 2           | -         | -        |       |
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
| command       | 0           | -         | -        | Transfers a command point to the activated marine's AP. |
| reveal        | -           | -         | 6        | Voluntary conversion to alien(s). |
| pass turn     | 0           | 0         | 0        | Concludes the active player's turn.      |

This rules module should make the process of choosing actions for players as simple as possible.  That means that this rules module should examine the boardState and provide an explicit list of possible legal choices
to players whenever possible.  So above, the Rules should search the board for cells with marines and provide these cells as an explicit list to the player to choose.
The rules should then avait the player to make a choice.  If the player chooses to move or turn a marine, this action should be carried out by mutating the board state, and if necessary, a change should be signaled to the Game module so that the board may be redrawn.
When choices are offered to players, the choices should be provided with information such as cell coordinates, choice type identifiers ("move forward", "turn left") and so on.

If a player chooses to activate a different unit while one is already active, the formerly active unit receives a "deactivated" token in its cell.  When a player selects "pass", all deactivated tokens are removed from the board, allowing those units to be activated again on subsequent turns.

## Command Action

The command action is available to activated marines as long as the marine player has at least one command point remaining.  When this action is chosen, the number of command points is decremented, and the number of AP remaining for the activated marine is incremented.

When a marine with a "deactivated" token in their cell performs a move action (by prior conversion of a command point), the deactivated token is also moved to the new cell.
When a marine with a "deactivated" token in their cell takes any action other than "unjam" (by prior conversion of a command point), any "guard" or "overwatch" tokens are removed from their cell.

## Movement Actions

An activated unit may choose to move one cell forward (in the direction the token is facing), move one cell diagonally forward, move one cell backward, or move one cell diagonally backward (each subject to the appropriate AP cost) assuming the destination cell is a corridor and does not contain a closed door, marine, alien, or blip.  AP costs for movement are listed in the table above. Aliens or blips are also allowed to move sideways.  Units may also turn left or right.

A unit in a cell without a flame token may not choose to move into a cell with a flame token.  A unit in a cell with a flame token may attempt to move into a neighboring cell with a flame token, but in this case must roll a die, and they are destroyed on a roll of 2 or higher.

## Line of Sight

Line of sight between two cells exists when every cell touched by the Bresenham line
algorithm between them is free of obstructions. A cell is obstructed if it is not a
corridor cell or contains a blocking token such as a closed door, marine, alien or
blip. When the line steps diagonally between two cells, at least one of the two
adjacent off-diagonal cells must also be unobstructed; otherwise line of sight is
blocked. The check is performed in both directions and line of sight exists only
if both paths are unobstructed.

The start and end cell of a line of sight check may have flame tokens and these do not obstruct the line of sight,
but flame tokens in any cell inbetween these two cells do count as obstructing the line of sight.

## Marine Field of View

Marines can only see within a 90-degree arc centered on their facing direction.
Cells outside this field of view are never considered visible to the marine,
even if unobstructed.

## Cells visible to a Marine

A cell is said to be visible to a marine if it is both within the field of view of the 
marine and there is a line of sight between the cell and the marine.

## Measuring distances

Some weapons have ranges for which distances must be measured.  Distances are measured by counting horizontal, vertical or diagonal steps on the board as an equal unit of distance.
This means that the 12 unit range of certain weapons includes a 25x25 square of cells centered on the marine.  We use this convention since diagonal movement is allowed for the 
same AP point cost as horizontal and vertical movement.

## Blip Movement Restriction

Blips may not move into any cell that has line of sight to a cell containing a
marine. This uses the marine's field of view and line-of-sight rules above.
Blips also cannot move into any of the eight cells directly adjacent to a
marine, regardless of visibility. The rules filter available blip movement
options to enforce these restrictions.

## Voluntary Conversion of Blips

The player controlling aliens and blips may decide to reveal an activated blip, which costs the entire 6 AP budget of the blip.  
Blips are represented using "blip", "blip_2" or "blip_3" tokens.  The regular "blip" token transforms into a single alien, "blip_2" transforms into two aliens, and "blip_3" transforms into three aliens.
The first alien is placed on the cell that the blip was occupying.  The one or two additional aliens when available may be placed by the alien player in any empty cell adjacent to first alien that is not visible to any marine.
If there are insufficient cells meeting this condition for placement, the additional aliens that cannot be placed are forfeited. Aliens are also forfeited if placing them would increase the number of aliens on the board above 22.

When a player choses the reveal action for a blip, the first alien is immediately converted.
If there is a second aliens to be placed, the adjacent cells meeting the above placement condition are determined, and if there is at least one, they are offered to the player as "deploy" actions with the apropriate cell as a parameter, similar to how a move action would be offered.  An alien is placed in the chosen cell.
If there is a third alien to be placed, the adjacent cells meeting the above placement condition are again determined, and if there is at least one, they are again offered to the player as "place" actions, and again an alien is placed in the chosen cell.

Immediately after each alien is placed in this way, the alien player may turn that alien left or right any number of times at no AP cost before proceeding, allowing each deployed alien to be oriented as desired.
As long as there are remaining aliens to place and at least one eligible cell, the alien player must deploy another alien.
Only when no further aliens can be deployed are the choices to activate any not yet activated allies or to pass the turn offered.

## Involuntary Conversion of Blips

Blips cannot deliberately move into a cell that is visible to any marine.  However, they can involuntarily become visible if either the marine moves to a cell from which it can see the blip, or something else that was blocking line of sight moves out of the way -- which can include a door opening.  This can
happen either in the marine or alien turn.  To deal with this, we must add the following checks to the rules: 

* When any blocked cell becomes unblocked for the purpose of visibility due to:
  - A blip, marine, or alien moving out from the cell to another cell.
  - A blip, marine, or alien getting removed from play (e.g. due to being shot or assaulted).
  - A door opening.
the set of marines M who can see this cell must be determined.  Then, the set of blips B with a line of sight to this cell must also be determined.  Finally, each marine in M must check if it has visibility to each blip in B.  If this test passes for any blip, the blip experiences an involuntary reveal and must immediately be converted to alien(s).
* When any marine moves or turns left or right, it must also check visibility to each blip in play.  If this test passes for any blip, the blip experiences an involuntary reveal and must immediately be converted to alien(s).

As with voluntary conversions, the regular "blip" token transforms into a single alien, "blip_2" transforms into two aliens, and "blip_3" transforms into three aliens.
First, the blip is immediately replaced with an alien.  If the blip's cell had a deactivated token, this token stays in place to mark the placed alien as also being deactivated.
Immediately after the alien is placed, the alien player may turn that alien left or right any number of times at no AP cost before proceeding, allowing the deployed alien to be oriented as desired.  The alien player also receives a "pass" option to indicate that the turning of the alien has concluded.
The additional one or two aliens may be placed in any empty cell adjacent to the first alien.  (Whether or not they can be seen by any marine is irrelevant here.)  The cell to place them in is chosen by the marine player irrespective of which player's turn the involuntary reveal happens in.
If the first alien placed received a deactivated token, the additional placed aliens also receive a deactivated token.  Each time the marine player choses a cell to place an additional alien, the alien player may turn that alien left or right any number of times at no AP cost before proceeding, 
allowing each deployed alien to be oriented as desired.  The alien player also receives a "pass" option to indicate that the turning of the alien has concluded.
If there are insufficient cells meeting this condition for placement, the additional aliens that cannot be placed are forfeited. Aliens are also forfeited if placing them would increase the number of aliens on the board above 22.

When the involuntary reveal(s) are complete, the game continues from where it left off.

## Blip or Alien Entry Action

Blips or aliens placed on cells with 'lurk' tokens may be activated, at which point their have an available move action is to move to the closest cell marked with an alien_entry token, as long as it is not already occupied by a marine, blip, or alien.  This move option does not require that there be an unobstructed path to thecell with the alien_entry token. 
This is choice is offered to the alien player as a move type action costing 1 AP. They may then use their remaining AP to perform any other action available to blips. The reason this applies to aliens too is that lurking blips may have been voluntarily converted to aliens.

## Guard Action

An activated marine can perform the guard action to spend 2 AP to get a guard token; 
if the marine had an overwatch token, this is removed.
After placing the guard token in the marine's cell, the marine's activation automatically ends, all its remaining ap are lost, and it receives a deactivated token.
After performing the guard action, the marine player may either activate a different marine available for activation or pass. 
All guard tokens are removed at start of marine turn.

## Assault Action

The assault action is offered to an activated alien when the cell directly in front contains a marine, open door, or closed door.
The assault action is offered to an activated marine when the cell directly in front contains an alien, open door, or closed door.
The token performing the assault action will be refered to as the attacker, while the token being targeted will be referred to as the defender.
Blips cannot take part in assault actions either as attaker or defender since they would have been revealed and converted into aliens due to the conversion rules above.
The assault action costs 1 ap, and the action is only offered when ap is available.

A marine targeted by a close assault action immediately loses the overwatch token if present.

When a marine of the specific token type marine_chain attacks a door, the door token is removed from the board, and the assault action is concluded.
Otherwise, dice must be rolled to decide the outcome of the assault action.  Whether attacking or defending, the number of dice we roll for a token depends on its type:

| Token   | Nr. of Dice to Roll |
|---------|---------------------|
| Marine  | 1                   |
| Alien   | 3                   |
| Door    | 0                   |

When attacking a door, this base number of die are rolled for the attacker.  If there is at least one 6 among the results, the door token is removed from the board. Either way, the assault action is concluded.

When the assault happens between a marine and an alien, we need to deal with further modifiers:

When a marine is facing directly toward an alien, whether as attacker or defender, we modify the above base die counts if the marine is one of the following types:  

| Token           | Modifier                |
|-----------------|-------------------------|
| marine_hammer   | -1 alien dice to roll   |
| marine_claws    | +1 marine dice to roll  |

The rules module rolls the possibly modified number of dice for the attacker and then for the defender.
When a marine is facing directly toward an alien, whether as attacker or defender, we modify each of the marine die results if the marine is one of the following types:

| Token           | Modifier                   |
|-----------------|----------------------------|
| marine_hammer   | +2 to marine dice results  |
| marine_claws    | +1 to marine dice results  |
| marine_sarge    | +1 to marine dice results  |

If one side has rolled a higher result on any of its dice than the highest result of the other side, then this side is the winner.
If both sides have the same highest die roll desult, then the assault is tied.

When a marine of specific token types marine_sarge or marine_hammer is facing directly toward an alien, whether as attacker or defender, and did not win the assault, it must be offered the choice to re-roll the alien's highest scoring die or accept the outcome.
After a potential re-roll the win or tie situation is re-evaluated.
After this first potential re-roll, when a marine is on guard (it has a guard token in its cell), and it has not won the assault, it must be offered the choice to re-roll all its dice for a second chance, or accept the outcome.  
After a potential re-roll the win or tie situation is re-evaluated, and now the results are final:

If the attacker wins, the defender is removed from he board, including any guard, overwatch, or jam tokens in their cell.
If a defenderfacing directly toward the attacker wins, the attacker is removed from the board, including any guard, overwatch, or jam tokens in their cell.
If a defender with any other facing wins or ties, the choice to turn to face the attacker is offered to the defender player.
In any other case, nothing else happens. With this the assault action is concluded, and the assaulting player is offered to choose from any of its usual actions that come in question with its remaining ap budget.

## Shoot Action

Only Marines with ranged weapons may perform a shoot action.
There are three ranged weapons in the game: bolter, cannon, and flamer.  The below table shows which ranged weapon each kind of marine is equipped with:

| Token           | Ranged Weapon |
|-----------------|---------------|
| marine          | bolter        |
| marine_chain    | bolter        |
| marine_sarge    | bolter        |
| marine_axe      | bolter        |
| marine_flame    | flamer        |
| marine_cannon   | cannon        |
| marine_hammer   | none          |
| marine_claws    | none          |

The AP costs for shooting a bolter or cannon is 0 when performed immediately following a move or turn action, otherwise it is 1.
The AP cost for shooting a flamer is 2 AP.  

## Resolving Bolter and Cannon Shots

Bolter or Cannon shots may target aliens or closed doors in cells that are visible to the marine. 
To determine if the shot hits and destroys the target, a number of dice must be rolled and success determined depending on the weapon as shown in the following table: 

Weapon | Number of Dice Rolled | success on first shot  | success on subsequent shots |
|------|-----------------------|------------------------|-----------------------------|
Bolter | 2                     | 6+                     | 5+                          |
Cannon | 3                     | 5+                     | 4+                          |

For example, a marine with a bolter will roll two dice, and will successfully destroy the target (alien or door removed) if either die lands on a 6.
Sustained fire bonus: When a marine with a bolter or cannon repeats the shoot action to immediately shoot again at the same taget, the success condition from the subsequent shot column is used.

On success, the targeted door or alien token is removed from the board.

## Resolving Flamer Shots

Flamers target any visible cell no further away than 12 cells which is not a wall or contains a closed door token.  
On the segment that contains the targeted cell, all non-wall cells that do not contain a closed door token receive a flame token.  
A roll of a single die is made for each marine, blip and alien on any of these cells that have just received a flame token.
On a result of two or more, the marine, blip or alien is removed from the board, including any guard, overwatch, or jam tokens in their cell.

All flame tokens are removed from the board at the start of the marine players' turn.

## Overwatch Action

An activated marine can perform the overwatch action by spending 2 AP to get an overwatch token.
If the marine had a guard token, this is removed. 
After placing the overwatch token in the marine's cell, the marine's activation automatically ends, all its remaining ap are lost, and it receives a deactivated token. 
After performing the overwatch action, the marine player may either activate a different marine available for activation or pass. All overwatch tokens are removed at start of the marine players' turn.

## Automatic Shooting on Overwatch

If an alien performs an action and remains in a cell within a range of 12 squares and visible to any marine on overwatch, that marine automatically shoots at the alien at no AP cost. 

If multiple marines on overwatch are able to take a shot at the same alien, they must all resolve the shot, even if the alien has been killed by a prior shot.  This is to take possible jamming and ammo depletion rules into account.
See the Resolving Bolter and Cannon Shots section on how to resolve shots.
The sustained fire bonus in this section applies to a marine on overwatch that takes a second or subsequent shot at the same alien. 
When shooting a bolter in overwatch, if the two dice rolled show identical results, the overwatch token of the marine is removed and replaced with a jam token.  
When this occurs, and the marine player still has at least one command point remaining, the marine player immediately receives the option to unjam the weapon at the cost of one command point.  This happens via modal dialog prompt similar to a reroll prompt.
When the marine player chooses to unjam, the jam token is replaced with an overwatch token.




## TODO: Add more rules on the following topics in the future

- TODO: cannon ammunition, cannon reload, malfunction
- TODO: marine-hammer is also sarge and may reroll assaults
- TODO: marine-sarge should probably be renamed marine-sword for consistency.
- TODO: flame ammunition
- TODO: have a blip token stack so choosing random blips is without replacement. 
- TODO: one turn lurk delay
- TODO: rename tokens for consistency, incl. alien_entry to entry_alien, lurk to lurk_alien, and objective to objective_flame.
- TODO: marines that saw an alien action via line of sight can also perform one action in the alien turn using command points after every alien action.







