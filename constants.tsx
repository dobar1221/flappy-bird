
import { BirdColorScheme, BirdColor } from './types';

export const GAME_PHYSICS = {
  birdSize: 20, // Increased from 15 to 20 to make the bird a little bit bigger
  birdX: 80,
  gravity: 0.4,
  jumpPower: -8,
  pipeWidth: 60,
  pipeGap: 160,
  pipeSpeed: 2.5,
  pipeSpawnRate: 100, // frames
  groundHeight: 80,
};

export const BIRD_COLORS: Record<BirdColor, BirdColorScheme> = {
  yellow: {
    body: { center: '#FFD700', middle: '#FFA500', edge: '#FF8C00' },
    wing: '#FFA500',
    tail: '#FF8C00',
    head: { center: '#FFD700', edge: '#FFA500' },
    beak: { main: '#FF6347', highlight: '#FF8C00' }
  },
  red: {
    body: { center: '#FF6B6B', middle: '#EE5A52', edge: '#DC3545' },
    wing: '#EE5A52',
    tail: '#DC3545',
    head: { center: '#FF6B6B', edge: '#EE5A52' },
    beak: { main: '#C0392B', highlight: '#E74C3C' }
  },
  blue: {
    body: { center: '#4ECDC4', middle: '#44A08D', edge: '#2C7873' },
    wing: '#44A08D',
    tail: '#2C7873',
    head: { center: '#4ECDC4', edge: '#44A08D' },
    beak: { main: '#1A5F7A', highlight: '#2C7873' }
  },
  green: {
    body: { center: '#95E1D3', middle: '#6BCB77', edge: '#4CAF50' },
    wing: '#6BCB77',
    tail: '#4CAF50',
    head: { center: '#95E1D3', edge: '#6BCB77' },
    beak: { main: '#2E7D32', highlight: '#4CAF50' }
  },
  purple: {
    body: { center: '#A8E6CF', middle: '#DDA0DD', edge: '#BA55D3' },
    wing: '#DDA0DD',
    tail: '#BA55D3',
    head: { center: '#A8E6CF', edge: '#DDA0DD' },
    beak: { main: '#8B4789', highlight: '#BA55D3' }
  },
  pink: {
    body: { center: '#FFB6C1', middle: '#FF69B4', edge: '#FF1493' },
    wing: '#FF69B4',
    tail: '#FF1493',
    head: { center: '#FFB6C1', edge: '#FF69B4' },
    beak: { main: '#C71585', highlight: '#FF1493' }
  }
};
