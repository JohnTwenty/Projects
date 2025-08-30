# Derelict Game Player Modules

This directory will contain the player modules for the derelict game.

There are two primary kinds of Player: Human controlled and computer controlled.

A human player is controlled by the user of the browser via the graphical user interface.

A computer player is controlled using simple heuristics. 

Both kinds of player effectively make choices among different options that are presented to them by the game rules.

Players, when asked to make a choice will return it as a Promise. 

This is necessary because human players need time to think and cannot act immediately, so the caller will need to wait on the Promise.

The human player will call the Game module which provides the game UI.  Typically, the human player will provide the Game with choices to highlight visually in the UI, like cells that are permissible to be selected, and the user has to click one of these cells to proceed.  

The computer player will just make a choice, in the simplest implementation basically by making a random choice.  We can add smarter heuristics later.

Players need to have read access to the boardState so they can make sound choices.

Choices a player will have to make and how this information is passed is contained in the Rules SRD.

The human player will generally pass cell picking choices directly into the Game module for simple cell highlighting and waiting for the user to click an option, e.g. for marine selection.
For other choices the human player may need to ask the UI for sub-cell sized clickable overlays to be created.  We describe the API for this in the Game module's SRD.










