
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, UserSettings, Pipe, Cloud, BirdColorScheme } from './types';
import { GAME_PHYSICS, BIRD_COLORS } from './constants';
import { audioService } from './services/audioService';
import { geminiService } from './services/geminiService';

// --- Sub-components (defined outside to avoid re-renders) ---

const SettingsModal: React.FC<{
  settings: UserSettings;
  onClose: () => void;
  onUpdate: (s: UserSettings) => void;
}> = ({ settings, onClose, onUpdate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors text-2xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Controls</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Jump Control</label>
                <select 
                  value={settings.jumpControl}
                  onChange={(e) => onUpdate({...settings, jumpControl: e.target.value as any})}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="both">Both (Key + Tap)</option>
                  <option value="click">Touch Only</option>
                  <option value="space">Spacebar Only</option>
                </select>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input 
                  type="checkbox" 
                  checked={settings.voiceJumpEnabled}
                  onChange={(e) => onUpdate({...settings, voiceJumpEnabled: e.target.checked})}
                  className="w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">Enable AI Voice Jump</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Appearance</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {(Object.keys(BIRD_COLORS) as Array<keyof typeof BIRD_COLORS>).map(color => (
                <button
                  key={color}
                  onClick={() => onUpdate({...settings, birdColor: color})}
                  className={`w-12 h-12 rounded-full border-4 transition-all ${settings.birdColor === color ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-70'}`}
                  style={{ background: `linear-gradient(135deg, ${BIRD_COLORS[color].body.center}, ${BIRD_COLORS[color].body.edge})` }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-4 flex gap-4">
              <label className="flex-1">
                <input 
                  type="radio" name="theme" value="light" checked={settings.theme === 'light'} 
                  onChange={() => onUpdate({...settings, theme: 'light'})}
                  className="sr-only"
                />
                <div className={`text-center p-3 rounded-xl border transition-all cursor-pointer ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>Light</div>
              </label>
              <label className="flex-1">
                <input 
                  type="radio" name="theme" value="dark" checked={settings.theme === 'dark'} 
                  onChange={() => onUpdate({...settings, theme: 'dark'})}
                  className="sr-only"
                />
                <div className={`text-center p-3 rounded-xl border transition-all cursor-pointer ${settings.theme === 'dark' ? 'border-blue-500 bg-blue-900/50 text-blue-200' : 'border-gray-200 text-gray-500'}`}>Dark</div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Audio</h3>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input 
                type="checkbox" 
                checked={settings.soundEnabled}
                onChange={(e) => onUpdate({...settings, soundEnabled: e.target.checked})}
                className="w-5 h-5 rounded accent-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-200 font-medium">Sound Effects</span>
            </label>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
          <button 
            onClick={() => {
              const defaults: UserSettings = {
                jumpControl: 'both',
                startControl: 'both',
                theme: 'light',
                birdColor: 'yellow',
                soundEnabled: true,
                voiceJumpEnabled: false
              };
              onUpdate(defaults);
            }}
            className="flex-1 py-3 px-4 rounded-xl text-gray-600 hover:text-gray-800 font-semibold"
          >
            Reset
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-transform active:scale-95"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    bird: { y: 300, velocity: 0, wingAngle: 0 },
    pipes: [],
    clouds: [],
    score: 0,
    highScore: 0,
    status: 'idle',
    frameCount: 0
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('flappySettings');
    if (saved) return JSON.parse(saved);
    return {
      jumpControl: 'both',
      startControl: 'both',
      theme: 'light',
      birdColor: 'yellow',
      soundEnabled: true,
      voiceJumpEnabled: false
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('flappySettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) {
      setGameState(prev => ({ ...prev, highScore: parseInt(saved, 10) }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flappyHighScore', gameState.highScore.toString());
  }, [gameState.highScore]);

  // --- Voice Command Recording ---
  useEffect(() => {
    if (settings.voiceJumpEnabled && gameState.status === 'playing') {
      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const shouldJump = await geminiService.checkVoiceCommand(base64);
              if (shouldJump) jump();
            };
          };

          // Capture audio in segments
          const interval = setInterval(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
              recorder.start();
            }
          }, 1500); // Check every 1.5s

          recorder.start();
          return () => {
            clearInterval(interval);
            recorder.stop();
            stream.getTracks().forEach(t => t.stop());
          };
        } catch (err) {
          console.error("Mic access failed", err);
        }
      };

      const stopFnPromise = startRecording();
      return () => {
        stopFnPromise.then(stopFn => stopFn?.());
      };
    }
  }, [settings.voiceJumpEnabled, gameState.status]);

  // --- Initialization ---
  useEffect(() => {
    // Generate initial clouds
    const clouds: Cloud[] = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * 400,
      y: Math.random() * 300 + 50,
      size: Math.random() * 40 + 20,
      speed: Math.random() * 0.3 + 0.2
    }));
    setGameState(prev => ({ ...prev, clouds }));
  }, []);

  // --- Game Logic Handlers ---

  const jump = useCallback(() => {
    setGameState(prev => {
      if (prev.status === 'ready') {
        if (settings.soundEnabled) audioService.playJump();
        return { ...prev, status: 'playing', bird: { ...prev.bird, velocity: GAME_PHYSICS.jumpPower } };
      }
      if (prev.status === 'playing') {
        if (settings.soundEnabled) audioService.playJump();
        return { ...prev, bird: { ...prev.bird, velocity: GAME_PHYSICS.jumpPower } };
      }
      return prev;
    });
  }, [settings.soundEnabled]);

  const startGame = useCallback(() => {
    audioService.init();
    setGameState(prev => ({
      ...prev,
      status: 'ready',
      bird: { y: 300, velocity: 0, wingAngle: 0 },
      pipes: [],
      score: 0,
      frameCount: 0
    }));
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => {
      if (settings.soundEnabled && prev.status === 'playing') audioService.playDie();
      const newHighScore = Math.max(prev.score, prev.highScore);
      return { ...prev, status: 'gameOver', highScore: newHighScore };
    });
  }, [settings.soundEnabled]);

  // --- Event Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen) return;
      if (e.code === 'Enter') {
        if (gameState.status === 'idle' || gameState.status === 'gameOver') startGame();
        else if (gameState.status === 'ready') jump();
      }
      if (e.code === 'Space') {
        if (settings.jumpControl === 'both' || settings.jumpControl === 'space') {
          if (gameState.status === 'playing' || gameState.status === 'ready') jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, settings.jumpControl, jump, startGame, isSettingsOpen]);

  // --- Canvas Rendering & Game Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Update Logic
      setGameState(prev => {
        if (prev.status === 'idle' || prev.status === 'gameOver') return prev;

        const newState = { ...prev };
        
        // 1. Calculate dynamic difficulty based on score
        // Every point increases speed slightly.
        const currentSpeed = Math.min(GAME_PHYSICS.pipeSpeed + (prev.score * 0.1), 6.5);
        // Decrease frames between pipes to maintain gap consistency or make it tighter
        const targetDistance = 250; // Ideal pixel distance between pipes
        const dynamicSpawnRate = Math.max(targetDistance / currentSpeed, 45);

        // 2. Update Clouds
        newState.clouds = prev.clouds.map(c => ({
          ...c,
          x: c.x - c.speed < -c.size * 2 ? 400 + c.size : c.x - c.speed
        }));

        // 3. Bird Movement (flapping always)
        newState.bird = { ...prev.bird };
        newState.bird.wingAngle += prev.status === 'playing' ? (0.3 + Math.abs(prev.bird.velocity) * 0.1) : 0.1;

        if (prev.status === 'playing') {
          newState.bird.velocity += GAME_PHYSICS.gravity;
          newState.bird.y += newState.bird.velocity;

          // Ceiling/Ground collision
          if (newState.bird.y - GAME_PHYSICS.birdSize < 0) {
            newState.bird.y = GAME_PHYSICS.birdSize;
            newState.bird.velocity = 0;
          }
          if (newState.bird.y + GAME_PHYSICS.birdSize > 600 - GAME_PHYSICS.groundHeight) {
            requestAnimationFrame(() => endGame());
            return prev;
          }

          // 4. Pipes Movement & Spawning
          newState.frameCount++;
          if (newState.frameCount >= dynamicSpawnRate) {
            const minGapY = 100;
            const maxGapY = 600 - GAME_PHYSICS.groundHeight - GAME_PHYSICS.pipeGap - 100;
            const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
            newState.pipes.push({
              x: 400,
              topHeight: gapY,
              bottomY: gapY + GAME_PHYSICS.pipeGap,
              passed: false
            });
            newState.frameCount = 0;
          }

          newState.pipes = prev.pipes.map(p => ({ ...p, x: p.x - currentSpeed }));
          
          // Collision Check & Scoring
          for (let p of newState.pipes) {
            const birdLeft = GAME_PHYSICS.birdX - GAME_PHYSICS.birdSize;
            const birdRight = GAME_PHYSICS.birdX + GAME_PHYSICS.birdSize;
            if (birdRight > p.x && birdLeft < p.x + GAME_PHYSICS.pipeWidth) {
              const birdTop = newState.bird.y - GAME_PHYSICS.birdSize;
              const birdBottom = newState.bird.y + GAME_PHYSICS.birdSize;
              if (birdTop < p.topHeight || birdBottom > p.bottomY) {
                requestAnimationFrame(() => endGame());
                return prev;
              }
            }

            // Score increment
            if (!p.passed && p.x + GAME_PHYSICS.pipeWidth < GAME_PHYSICS.birdX) {
              p.passed = true;
              newState.score += 1;
              if (settings.soundEnabled) audioService.playScore();
            }
          }

          newState.pipes = newState.pipes.filter(p => p.x + GAME_PHYSICS.pipeWidth > 0);
        }

        return newState;
      });

      // DRAWING
      ctx.clearRect(0, 0, 400, 600);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 600);
      if (settings.theme === 'light') {
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#E0F6FF');
      } else {
        skyGrad.addColorStop(0, '#1a1a2e');
        skyGrad.addColorStop(1, '#16213e');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 400, 600);

      // Clouds
      ctx.fillStyle = settings.theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
      gameState.clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.6, c.y, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.2, c.y, c.size * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.5, c.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pipes
      gameState.pipes.forEach(p => {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(p.x, 0, GAME_PHYSICS.pipeWidth, p.topHeight);
        ctx.fillRect(p.x, p.bottomY, GAME_PHYSICS.pipeWidth, 600 - GAME_PHYSICS.groundHeight - p.bottomY);
        // Caps
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(p.x - 5, p.topHeight - 20, GAME_PHYSICS.pipeWidth + 10, 20);
        ctx.fillRect(p.x - 5, p.bottomY, GAME_PHYSICS.pipeWidth + 10, 20);
      });

      // Ground
      const groundY = 600 - GAME_PHYSICS.groundHeight;
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, 600);
      groundGrad.addColorStop(0, '#8B7355');
      groundGrad.addColorStop(1, '#654321');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, 400, GAME_PHYSICS.groundHeight);
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, groundY, 400, 8);

      // Bird
      const { bird } = gameState;
      const colors = BIRD_COLORS[settings.birdColor];
      const flap = Math.sin(bird.wingAngle) * 0.3;
      const x = GAME_PHYSICS.birdX;
      const y = bird.y;
      const size = GAME_PHYSICS.birdSize;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bird.velocity * 0.05); // Tilt based on velocity

      // Body
      ctx.fillStyle = colors.body.center;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.2, size, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(flap);
      ctx.fillStyle = colors.wing;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Head
      ctx.fillStyle = colors.head.center;
      ctx.beginPath();
      ctx.arc(8, -size * 0.6, size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(12, -size * 0.7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(14, -size * 0.7, 3, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = colors.beak.main;
      ctx.beginPath();
      ctx.moveTo(15, -size * 0.4);
      ctx.lineTo(25, -size * 0.2);
      ctx.lineTo(15, 0);
      ctx.fill();

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, settings, endGame]);

  const handleInteraction = () => {
    if (isSettingsOpen) return;
    if (gameState.status === 'idle' || gameState.status === 'gameOver') {
      startGame();
    } else if (gameState.status === 'ready' || gameState.status === 'playing') {
      if (settings.jumpControl === 'both' || settings.jumpControl === 'click') {
        jump();
      }
    }
  };

  return (
    <div className={`h-screen w-full flex items-center justify-center p-4 transition-colors duration-500 ${settings.theme === 'dark' ? 'bg-gray-950' : 'bg-indigo-100'}`}>
      <div className="relative w-full max-w-[400px] aspect-[2/3] bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-gray-800 ring-4 ring-gray-900/10">
        
        {/* Canvas Layer */}
        <canvas 
          ref={canvasRef}
          width={400}
          height={600}
          onMouseDown={(e) => e.button === 0 && handleInteraction()}
          onTouchStart={(e) => { e.preventDefault(); handleInteraction(); }}
          className="w-full h-full cursor-pointer"
        />

        {/* HUD Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col drop-shadow-lg">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Score</span>
            <span className="text-4xl font-black text-gray-800 dark:text-white tabular-nums">{gameState.score}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end drop-shadow-lg">
              <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Best</span>
              <span className="text-xl font-bold text-red-500 tabular-nums">{gameState.highScore}</span>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xl hover:scale-110 active:scale-90 transition-transform"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Start/Game Over Screens */}
        {(gameState.status === 'idle' || gameState.status === 'ready' || gameState.status === 'gameOver') && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center" onClick={handleInteraction}>
            {gameState.status === 'idle' && (
              <div className="animate-bounce-slow">
                <h1 className="text-5xl font-black text-white drop-shadow-2xl mb-4 italic tracking-tighter">FLAPPY<br/>BIRD</h1>
                <p className="text-white/90 font-medium text-lg mb-8">Tap to start your flight</p>
                <div className="w-16 h-16 rounded-full border-4 border-white/50 border-t-white animate-spin mx-auto opacity-50" />
              </div>
            )}
            
            {gameState.status === 'ready' && (
              <div className="space-y-4 animate-pulse">
                <p className="text-3xl font-black text-white uppercase italic">Ready?</p>
                <p className="text-white/80 font-bold">Tap to Jump</p>
                {settings.voiceJumpEnabled && <p className="text-blue-300 font-bold text-sm">AI Voice Control Active! Shout "JUMP!"</p>}
              </div>
            )}

            {gameState.status === 'gameOver' && (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border-4 border-red-500 animate-in zoom-in duration-300">
                <h2 className="text-4xl font-black text-red-500 mb-2 uppercase italic">Splat!</h2>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center gap-12 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="text-gray-500 font-bold uppercase text-sm">Final Score</span>
                    <span className="text-3xl font-black text-gray-800 dark:text-white">{gameState.score}</span>
                  </div>
                  {gameState.score >= gameState.highScore && gameState.score > 0 && (
                    <div className="text-amber-500 font-black text-lg animate-pulse">🎉 NEW RECORD! 🎉</div>
                  )}
                </div>
                <button 
                  onClick={startGame}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Fly Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          settings={settings} 
          onClose={() => setIsSettingsOpen(false)} 
          onUpdate={setSettings} 
        />
      )}
    </div>
  );
};

export default App;
