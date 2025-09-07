import { Coord } from 'derelict-boardstate';

// A generic choice presented to a player.
export interface Choice {
  type: 'marine' | 'action';
  coord?: Coord;
  action?:
    | 'move'
    | 'turnLeft'
    | 'turnRight'
    | 'activate'
    | 'door'
    | 'reveal'
    | 'deploy'
    | 'pass';
  apCost?: number;
  apRemaining?: number;
}

// Game API that players can call to interact with the UI
export interface GameApi {
  choose(options: Choice[]): Promise<Choice>;
  messageBox(message: string): Promise<boolean>;
}

// Basic player interface used by the rules engine
export interface Player {
  choose(options: Choice[]): Promise<Choice>;
}

// Human controlled player delegating to the Game UI
export class HumanPlayer implements Player {
  constructor(private game: GameApi) {}

  choose(options: Choice[]): Promise<Choice> {
    console.log('Player choices', options);
    return this.game.choose(options);
  }
}

// Simple computer player making random choices
export class RandomAI implements Player {
  async choose(options: Choice[]): Promise<Choice> {
    console.log('Player choices', options);
    const idx = Math.floor(Math.random() * options.length);
    return options[idx];
  }
}
