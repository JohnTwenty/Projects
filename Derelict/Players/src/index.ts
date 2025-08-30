import { Coord } from 'derelict-boardstate';

// Game API that players can call to interact with the UI
export interface GameApi {
  chooseCell(allowed: Coord[]): Promise<Coord>;
  messageBox(message: string): Promise<boolean>;
  highlightCells(coords: Coord[]): void;
  clearHighlights(): void;
}

// Basic player interface used by the rules engine
export interface Player {
  chooseMarine(options: Coord[]): Promise<Coord>;
  chooseAction(options: string[]): Promise<string>;
}

// Human controlled player delegating to the Game UI
export class HumanPlayer implements Player {
  constructor(private game: GameApi) {}

  chooseMarine(options: Coord[]): Promise<Coord> {
    return this.game.chooseCell(options);
  }

  async chooseAction(options: string[]): Promise<string> {
    // Placeholder: always pick the first option
    return options[0];
  }
}

// Simple computer player making random choices
export class RandomAI implements Player {
  async chooseMarine(options: Coord[]): Promise<Coord> {
    const idx = Math.floor(Math.random() * options.length);
    return options[idx];
  }

  async chooseAction(options: string[]): Promise<string> {
    const idx = Math.floor(Math.random() * options.length);
    return options[idx];
  }
}
