Derelict Spaceship Game requirements:
============================================


General Product Requirements
=====================================
* all behavior is specified by requirements docs
* entire system can run client side in a browser
* intended to be coded by AI, so technical decisions should prioritize AI based development as much as possible
* requirements documents should also be collaboratively developed with AI
* architecturally several disaggregated components: GUI, board state, game rules, human or computer players
* all modules except GUI has unit test harness with near complete coverage
* game can be played from the command line or from GUI
* ideally game can also be played by an LLM
* as much of the content / assets for the game should also be AI-generateable, which likely means to prefer text based asset file formats
* definition: the user is the person using the browser
* definition: player is the more abstract notion of a controller of one of the sides in the game; can be ultimately controlled by a human or computer.
* so the user might be directing a human player, but could also be editing the map in an editor mode
* multi computer networked play not required
* we support human vs AI players or two human players at the same computer
* we have visual browser based map/mission editing capabilities
* since the rules are likely AI generated JS code, which is very simple for the AI to update, we likely do not need any rule mutation mechanism meant for humans


Board State
===========
* board state: takes board state mutation events and updates its own state which can be saved/loaded/sent to rendering
* the board contains a list of objects
* depending on the type of object, it can contain other objects.  For example, a segment can contain cells that can contain blips or marines.  It can also contain a fire marker.
* maps are created from segments
* there is text based segment description format 
* we can just have newline separated segments in a file; this is our segment library
* there is a text based mission file format 
* there is a map for each official mission in the game
* the map file also specifies victory conditions and any other information that missions have, like which marines are included and alien reinforcement rules, and the segment library it uses
* new games initialize themselves to an empty state which is like an empty map.
* a mission can also be a savegame of a game that has been saved
* it follows that the game state can be saved to a mission file.
* mapping from an object tree structure which is the game state to/from text and also to an icon grid for display seems to need some design effort.
* thus the state fils has to be efficient both for human readability and rendering
* gamestate has to be able to map from cell coordinates to objects and back
* it is able to send this game state to file or to a renderer for display or serialization purposes.

GUI
===========
* The GUI takes game state and renders it; system input events are sent to a human player instance.
* There is no sound or music required for the time being
* Ideally both touch and mouse input is supported.  
* Keyboard text entry may be needed for some things.
* GUI rendering uses the canvas and PNG sprite tile maps
* PNG sprites are created by me (human) for the time being
* It would be elegant if the rendering GUI can render from the board state text based state file.  That seems to robustify us against having to debug invisible board state data issues.
* there is a text file that has all the different tiles in a PNG image so I know what I have to draw and where.  This file can be updated by the LLM or me.
* For format of that text file is just lines of the form: enemy_variant_3 x y w h
* what list of bitmap tiles do we need for display?
	- One for each kind of segment - these are larger bitmaps, could even come from downscaled photos of real segments
	- one for each unique marine, top down, we can probably rotate 90 degrees programmatically
	- one for each unique alien
	- all tokens
	- dice
	- the control panel
	
* what buttons do we need? 
	- editing	
		- new mission
		- save mission
		- load mission 
		
		- choose segment from palette
		- rotate selected segment L/R
		- position first segment U/D/L/R		
		- select a placed segment
		- select side of placed segment N/W/S/E
		- attach selected segment to placed segment
		- remove placed segment
		- add door 
		- rotate door
		- remove door
		- add/remove marine starting location
		- add/remove alien insert location
		- add/remove flamer victory trigger
		
		
		
  * playing
		- load mission
		- select marines player
		- select alien player
		- start mission
		- save mission
		
		

Player
===========
- human player: maps UI events to gameplay commands, sends commands to game rules or in edit mode directly to board state
- computer player: looks at board state and sends simple probabilistic gameplay commands to game rules
- a player can be a human operator or an AI for either or both sides
- games can start by having the user / specify a mission, at which point this mission is loaded into the state

Game rules
===========
- game rules: interprets game commands, sends edit commands board state
- the game waits for sequential user events called commands that it processes until one side achieves victory or the game is stopped.
- game rules module is stateless and stores its state into the board state
- the game reacts to a player event by possibly updating its internal game state, and then waiting for the next event.
- in order to support map editing capability, there are also possible commands to create any mission from scratch.
- we have a list of all possible moves / player events.  These commands are of course also text based for ideal LLM interactions:
- CM_load_mission "mapfile.txt"
- CM_save_mission "mapfile.txt"
- CM_start_game
- CM_deploy_marine dario cell_x cell_y
- CM_deploy_blip cell_x cell_y
- CM_roll_for_command_points
- CM_roll_for_command_points
- it seems overengineering to make all the rules also be data driven; if we want to go this route we should use an LLM where
- the rules are stored in the game rule book in english.
- Since the actual rules are so simple we can ask them to be distilled to a modular game rules program that is responsible for processing game play move commands during gameplay.
- sometimes rules have tabular data like what marine has what weapon or different move options, which should be stored in a text file with a standard table format for more data-driven-ness


	


