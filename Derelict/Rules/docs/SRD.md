# Derelict Game Rules Modules

This folder contains initially one but later perhaps more implementations of the Rules interface.

Rules implement various kinds of board game rules.  

Rules will read and write the BoardState object.  Rules will also reference two Players objects, and ask them to make choices.

Based on these choices made, the game will progress until one player wins.

Initially the rules of the game are very simple; all this is implemented in the Rules:runGame function: 

* The first player controls the marines while the second player controls the aliens and blips.  For the time being, aliens and blips have the same action choices available as marines.
* At the start of a player's turn no unit is active. The player must select a cell on the board with a unit they control to activate it, or pass, which yields control to the other player. If there are no units on the board that can be selected, the game is lost and runGame() exits.
* Once a marine, alien, or blip is selected, the controlling player may choose to move one cell forward (in the direction the token is facing) assuming this cell is a corridor and does not contain a marine, alien, or blip, or turn left, or turn right, or select a different token of the same side to activate it.
* Marines, blips and aliens all block movement for each other.
* When a player switches activation from one unit to another, the previously active unit receives a `deactivated` token in its cell.  Units with such a token are not offered as activation choices for the remainder of the turn.
* This selection and movement can continue indefinitely.  At any time, the active player may also choose a "pass" action which ends their activation and hands control to the other player.  When "pass" is chosen, all `deactivated` tokens are removed from the board so units may be activated again next turn.
* Even if no units are available for activation, the player is still prompted to "pass" rather than doing so automatically.

This rules module should make the process of choosing for players as simple as possible.  That means that this rules module should examine the boardState and provide an explicit list of possible legal choices
to players whenever possible.  So above, the Rules should search the board for cells with marines and provide these cells as an explicit list to the player to choose.
For the choice of what action to take, the rules should inspect the cell in front of the marine and decide if it meets the above conditions such that it can be moved into.  If not, this choice should not be offered, and only turn left, turn right, or a list of alternative selectable marines should be offered.

The rules should then avait the player to make a choice.  If the player chooses to move or turn a marine, this action should be carried out by mutating the board state, and if necessary, a change should be signaled to the Game module so that the board may be redrawn.

When choices are offered to players, the choices should be provided with information such as cell coordinates, choice type identifiers ("move forward", "turn left") and so on.

When an activated unit is determining available actions, the rules also inspect the three cells directly forward or diagonally forward from the unit.  Each of these cells is checked for the presence of a "door" or "dooropen" token.  For every such token found, the player is offered a "door" choice that includes the door's cell coordinates.  If a "dooropen" token shares its cell with a "marine", "alien" or "blip" token, the door is considered blocked and no choice to close it is presented.  When a player selects a "door" choice, the corresponding token is swapped between "door" and "dooropen", representing the unit opening or closing that door.

