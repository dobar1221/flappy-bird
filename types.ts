
export type Theme = 'light' | 'dark';
export type BirdColor = 'yellow' | 'red' | 'blue' | 'green' | 'purple' | 'pink';

export interface UserSettings {
  jumpControl: 'space' | 'click' | 'both' | 'voice';
  startControl: 'enter' | 'click' | 'both';
  theme: Theme;
  birdColor: BirdColor;
  soundEnabled: boolean;
  voiceJumpEnabled: boolean;
}

export interface BirdState {
  y: number;
  velocity: number;
  wingAngle: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

export interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface GameState {
  bird: BirdState;
  pipes: Pipe[];
  clouds: Cloud[];
  score: number;
  highScore: number;
  status: 'idle' | 'ready' | 'playing' | 'gameOver';
  frameCount: number;
}

export interface BirdColorScheme {
  body: { center: string; middle: string; edge: string };
  wing: string;
  tail: string;
  head: { center: string; edge: string };
  beak: { main: string; highlight: string };
}
