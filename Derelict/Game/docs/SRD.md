# Derelict Game Module

## Initialization

The Game Module starts when the user is sent or navigates to a game.html page.
The Game Module is responsible for the UI, page layout and rendering in the game mode.
The Game Module interacts with the following other modules: 
	The BoardState to get/set the state of the board, if necessary.
	The Renderer to render the BoardState.
	Two objects implementing the Player interface (may be human or computer controlled)
	An object implementing the Rules interface, that implements the board game's rules.
	
At startup, the user is presented with the "New Game" modal dialog with the following fields:
1. A list box showing the available server side mission files (the contents of Derelict/public/missions)
        The game.html URL parameters are inspected.  Using parameters, it is possible to pre-select a specific server side mission file to start. In this case the appropriate item in the list box is highlighted.

        There is also a text prompt: "Drag and Drop a savegame file here to load it!" Dropping a legal savegame file will gray the mission selection and display the name of the savegame file about to be loaded. Savegames are mission files with an optional `rules` section that records state such as the current turn and active player.

2. A pair of radio buttons to choose "Single Player" or "Two Player" game.
	We can either have hot seat (2 human) multiplayer or human vs computer controlled enemies. 
	We do this even if this is a savegame, in case second human player is not available and we want to transition to single player.
	Based on this the two player abstractions are instanced.

3. We also choose a game ruleset, for now we will only have a single default "Derelict" Rules module to pick from a list box.

4. The dialog has an OK button that can be pressed to start the game.

When this button is pressed the "New Game" dialog is dismissed and the following things happen:

1. The BoardState is loaded from the file. 
2. The Rules object is instanced. 
3. The two Player objects are instanced.  The first player is always a Human player, the second player is Human or Computer.
   The first player always controls "marine" tokens while the second player controls "alien" or "blip" tokens.
4. rules.validate(boardState) is called to check if the boardState is a legitimate starting point for the rules. If this fails, an error message is displayed, and when that is dismissed, we return to a "new game" dialog.

## UI 

The UI of the game page is as follows:

* Horizontal bar at the top saying "Derelict Game", just like we have in Editor.
* Horizontal Button Bar with buttons: "New Game", "Save Game", "Editor", same style like we have in Editor.
	* The "New Game" button that when pressed, after modal confirmation dialog that gives a chance to cance, start a new game returns us to a "new game" dialog as above.
    * The "Save Game" button saves the BoardState and current Rules state (e.g. turn and active player) to a mission file that gets downloaded to the user's computer.
	* The "Editor" button, that when pressed, after modal confirmation dialog that gives a chance to cancel, forwards to index.html which is the editor page. 		
* The play area viewport that uses the Renderer to display the boardState.
* A vertical bar to the right of the play area viewport that is horizontally divided into two regions:
    * A top region showing buttons including:
    * The "Move" button 
    * The "Turn Left" button
    * The "Turn Right" button
    * The "Manipulate" button
    * The "Assault" button
    * The "Shoot / Clear Jam" button
    * The "Activate Ally" button
    * The "Overwatch" button
    * The "Guard" button
    * The "Pass" button (always shown last)
* A status region showing information like: (We will describe how to populate this later)
    * "Turn: n"
    * "Active player: n"
    * "Command points: n"
    * "Activated Unit Name: xyz"
    * "Activated Unit Role: xyz"
    * "AP remaining: n"
    * "Ammo remaining: n"
	
## Control FLow

Once the initial boardState is rendered, we call rules.runGame(player1, player2)
This is an async function which will go on for a long time because it will block on all sorts of Promises.  When it returns, we return to the new game dialog.
The Rules:runGame() will call the players to make choices.  The computer player will make decisions immediately.
The human player will of course need to use the UI the GameModule provides to make decisions.  Therefore, when the human player
is inevitably called on to make a choice, we are unblocked.  This happens by the human player calling a game API this Game module provides.
This API provides functions, for example: 

* letUserSelect(Options[]):Promise<Option> - prompts the user to click one of multiple permissible options.  An Option will include information like: 
	- the type of option, e.g. MOVE or TURN
	- a sub-type like LEFT or RIGHT
	- an action point (AP) cost integer that can be displayed to the user
	- optionally the CELL coordinates where to draw a clickable sprite overlay over the board at the provided cell coordinates 
* messageBox(string):Boolean - modal message box allowing a yes or no boolean reply.

## Specific Options 

The Rules are able to pass us the following types of Options.  CELL means to pass the cell coordinate (e.g. for shoot target or move destination).  If there are multiple cells that can be moved to, each is passed as a distinct option.
By default all cells that have been referenced in at least one options get overlaid with a certain color rectangular outline and may be selected.
Because some cells might be related to more than one option (e.g. an enemy in a cell may be both assaulted or shot) we need to prioritize actions.  The below table is in priority order.  
This means that shoot takes precedence over assault so in the previous case the enemy would get a shoot highlight by default, and a click would lead to a shoot option being chosen.

The reason we have buttons is twofold: First, some Options do not have a cell associated, so there is no cell to click to select them.  They are selected simply by a button press.
Second, when cells have multiple actions associated like in the above example, pressing a button first will disambiguate, and remove all cell highlights save for the ones associated with the button's associated option.  This makes
the button act as an action filter.  The filtering can be disabled by clicking the button again, which is visually indicated by such a button remaining darkened until a cell is clicked or the button is clicked again.
A keyboard key accelerator listed in the Key column has the same effect as clicking or tapping the button.


| Option        | 	Button   | 	Key	 | Cell Choice     |  Cell Highlight | Notes |
|---------------|------------|-------|-----------------|-----------------|-------|
| activate CELL | activate 	 | n	 | available ally  | purple          | |
| shoot CELL    | shoot  	 | s	 | visible enemy   | orange          | all visible cells when button clicked; ap cost might be free; ammo availability for flamer; may disable on jam; button may name after weapon |
| assault CELL  | assault    | a	 | adjacent enemy  | red             | |
| move CELL     | move	     | m	 | legal move cell | green           | marines: fw+back, aliens and blips all 4 dirs. aliens and blips move ap might be free after turn action |
| door CELL     | manipulate | e	 | adjacent door   | blue            | |	
| turn left	    | turn left  | l	 | none	           | none            | ap cost might be 0 after move action |
| turn right    | turn right | r	 | none	           | none            | ap cost might be 0 after move action |
| unjam         | clear jam	 | u	 | none		       | none            | on jam token; this could be rename of shoot button rather than distinct weapon |
| overwatch     | overwatch  | o	 | none	           | none            | ends activation	|
| guard	        | guard	     | g	 | none	           | none            | ends activation 	|
| reveal        | reveal     | v	 | none	           | none            | ends activation 	|
| pass	        | pass	     | p	 | none	           | none            | ends activation; hands control to the other player |

When a highlighted cell is hovered over (or tapped on a touch device) will show the AP cost of the action in the status region.  Tap devices may need an additional confirm button to tap.
When the AP cost of a button is zero, the button could perhaps get an additional green highlight.

Buttons that end activation should have a message to this effect on hover in the status region.


If during such a UI callback the user takes an action like pressing the New Game button and and confirms, the runGame() function is returned to and aborted via error message or exception before proceeding.

The game proceeds with the the players taking turns and getting a chance to make decisions until some victory condition in the rules is achieved.  At that point victory is declared and runGame() exits. 
