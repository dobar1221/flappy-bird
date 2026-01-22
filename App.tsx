
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, UserSettings, Pipe, Cloud, BirdColorScheme } from './types.ts';
import { GAME_PHYSICS, BIRD_COLORS } from './constants.tsx';
import { audioService } from './services/audioService.ts';
import { geminiService } from './services/geminiService.ts';

const SettingsModal: React.FC<{
  settings: UserSettings;
  onClose: () => void;
  onUpdate: (s: UserSettings) => void;
}> = ({ settings, onClose, onUpdate }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">SETTINGS</h2>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white text-2xl active:scale-90 transition-transform">&times;</button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto overscroll-contain">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Voice & AI</h3>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800/30 cursor-pointer active:scale-95 transition-transform">
              <div className="flex flex-col">
                <span className="text-blue-700 dark:text-blue-300 font-bold">AI Voice Control</span>
                <span className="text-[10px] text-blue-500/70 font-medium">Shout "JUMP!" to play</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.voiceJumpEnabled}
                onChange={(e) => onUpdate({...settings, voiceJumpEnabled: e.target.checked})}
                className="w-6 h-6 rounded-full accent-blue-600"
              />
            </label>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Bird Color</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(BIRD_COLORS) as Array<keyof typeof BIRD_COLORS>).map(color => (
                <button
                  key={color}
                  onClick={() => onUpdate({...settings, birdColor: color})}
                  className={`h-14 rounded-2xl border-4 transition-all flex items-center justify-center ${settings.birdColor === color ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-transparent bg-gray-100 dark:bg-gray-800'}`}
                >
                   <div 
                    className="w-6 h-6 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${BIRD_COLORS[color].body.center}, ${BIRD_COLORS[color].body.edge})` }}
                   />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Theme</h3>
            <div className="flex gap-3">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdate({...settings, theme: t})}
                  className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all ${settings.theme === t ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-500'}`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <button 
            onClick={onClose}
            className="w-full py-5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-lg shadow-xl active:scale-95 transition-all"
          >
            DONE
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
    try {
      const saved = localStorage.getItem('flappySettings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
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

  useEffect(() => {
    localStorage.setItem('flappySettings', JSON.stringify(settings));
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings]);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) setGameState(prev => ({ ...prev, highScore: parseInt(saved, 10) || 0 }));
  }, []);

  useEffect(() => {
    localStorage.setItem('flappyHighScore', gameState.highScore.toString());
  }, [gameState.highScore]);

  useEffect(() => {
    if (settings.voiceJumpEnabled && gameState.status === 'playing') {
      let stopRecording: (() => void) | undefined;
      const setup = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
          recorder.onstop = async () => {
            if (audioChunksRef.current.length === 0) return;
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
          const interval = setInterval(() => { if (recorder.state === 'recording') { recorder.stop(); recorder.start(); } }, 1500);
          recorder.start();
          stopRecording = () => { clearInterval(interval); if (recorder.state !== 'inactive') recorder.stop(); stream.getTracks().forEach(t => t.stop()); };
        } catch (err) { console.error("Mic access failed", err); }
      };
      setup();
      return () => { if (stopRecording) stopRecording(); };
    }
  }, [settings.voiceJumpEnabled, gameState.status]);

  useEffect(() => {
    const clouds: Cloud[] = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * 400,
      y: Math.random() * 300 + 50,
      size: Math.random() * 40 + 20,
      speed: Math.random() * 0.3 + 0.2
    }));
    setGameState(prev => ({ ...prev, clouds }));
  }, []);

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
      if (prev.status !== 'playing') return prev;
      if (settings.soundEnabled) audioService.playDie();
      const newHighScore = Math.max(prev.score, prev.highScore);
      return { ...prev, status: 'gameOver', highScore: newHighScore };
    });
  }, [settings.soundEnabled]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;

    const render = () => {
      setGameState(prev => {
        if (prev.status === 'idle' || prev.status === 'gameOver') return prev;
        const newState = { ...prev };
        const currentSpeed = Math.min(GAME_PHYSICS.pipeSpeed + (prev.score * 0.1), 6.5);
        const targetDistance = 250; 
        const dynamicSpawnRate = Math.max(targetDistance / currentSpeed, 45);

        newState.clouds = prev.clouds.map(c => ({
          ...c,
          x: c.x - c.speed < -c.size * 2 ? 400 + c.size : c.x - c.speed
        }));

        newState.bird = { ...prev.bird };
        newState.bird.wingAngle += prev.status === 'playing' ? (0.3 + Math.abs(prev.bird.velocity) * 0.1) : 0.1;

        if (prev.status === 'playing') {
          newState.bird.velocity += GAME_PHYSICS.gravity;
          newState.bird.y += newState.bird.velocity;

          if (newState.bird.y - GAME_PHYSICS.birdSize < 0) {
            newState.bird.y = GAME_PHYSICS.birdSize;
            newState.bird.velocity = 0;
          }
          if (newState.bird.y + GAME_PHYSICS.birdSize > 600 - GAME_PHYSICS.groundHeight) {
            requestAnimationFrame(() => endGame());
            return prev;
          }

          newState.frameCount++;
          if (newState.frameCount >= dynamicSpawnRate) {
            const minGapY = 100;
            const maxGapY = 600 - GAME_PHYSICS.groundHeight - GAME_PHYSICS.pipeGap - 100;
            const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
            newState.pipes.push({ x: 400, topHeight: gapY, bottomY: gapY + GAME_PHYSICS.pipeGap, passed: false });
            newState.frameCount = 0;
          }

          newState.pipes = prev.pipes.map(p => ({ ...p, x: p.x - currentSpeed }));
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

      ctx.clearRect(0, 0, 400, 600);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 600);
      if (settings.theme === 'light') { skyGrad.addColorStop(0, '#87CEEB'); skyGrad.addColorStop(1, '#E0F6FF'); }
      else { skyGrad.addColorStop(0, '#1a1a2e'); skyGrad.addColorStop(1, '#16213e'); }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 400, 600);

      ctx.fillStyle = settings.theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
      gameState.clouds.forEach(c => {
        ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.arc(c.x + c.size * 0.6, c.y, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.2, c.y, c.size * 0.7, 0, Math.PI * 2); ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.5, c.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      gameState.pipes.forEach(p => {
        ctx.fillStyle = '#228B22'; ctx.fillRect(p.x, 0, GAME_PHYSICS.pipeWidth, p.topHeight);
        ctx.fillRect(p.x, p.bottomY, GAME_PHYSICS.pipeWidth, 600 - GAME_PHYSICS.groundHeight - p.bottomY);
        ctx.fillStyle = '#32CD32'; ctx.fillRect(p.x - 5, p.topHeight - 20, GAME_PHYSICS.pipeWidth + 10, 20); ctx.fillRect(p.x - 5, p.bottomY, GAME_PHYSICS.pipeWidth + 10, 20);
      });

      const groundY = 600 - GAME_PHYSICS.groundHeight;
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, 600);
      groundGrad.addColorStop(0, '#8B7355'); groundGrad.addColorStop(1, '#654321');
      ctx.fillStyle = groundGrad; ctx.fillRect(0, groundY, 400, GAME_PHYSICS.groundHeight);
      ctx.fillStyle = '#228B22'; ctx.fillRect(0, groundY, 400, 8);

      const { bird } = gameState;
      const colors = BIRD_COLORS[settings.birdColor];
      const flap = Math.sin(bird.wingAngle) * 0.3;
      const x = GAME_PHYSICS.birdX; const y = bird.y; const size = GAME_PHYSICS.birdSize;

      ctx.save(); ctx.translate(x, y); ctx.rotate(bird.velocity * 0.05);
      ctx.fillStyle = colors.body.center; ctx.beginPath(); ctx.ellipse(0, 0, size * 1.2, size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(-5, 0); ctx.rotate(flap); ctx.fillStyle = colors.wing; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = colors.head.center; ctx.beginPath(); ctx.arc(8, -size * 0.6, size * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(12, -size * 0.7, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(14, -size * 0.7, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.beak.main; ctx.beginPath(); ctx.moveTo(15, -size * 0.4); ctx.lineTo(25, -size * 0.2); ctx.lineTo(15, 0); ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, settings, endGame]);

  const handleInteraction = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      if ('button' in e && e.button !== 0) return;
      if (e.type === 'touchstart') e.preventDefault();
    }
    if (isSettingsOpen) return;
    if (gameState.status === 'idle' || gameState.status === 'gameOver') startGame();
    else if (gameState.status === 'ready' || gameState.status === 'playing') jump();
  };

  return (
    <div className={`h-[100dvh] w-full flex items-center justify-center overscroll-none touch-none select-none ${settings.theme === 'dark' ? 'bg-black' : 'bg-blue-50'}`}>
      <div className="relative w-full h-full max-w-[500px] max-h-[900px] bg-black shadow-2xl overflow-hidden md:rounded-[3rem] md:border-8 border-gray-900">
        
        <canvas 
          ref={canvasRef}
          width={400}
          height={600}
          onMouseDown={handleInteraction}
          onTouchStart={handleInteraction}
          className="w-full h-full cursor-pointer object-cover"
        />

        <div className="absolute top-0 left-0 right-0 p-8 pt-12 flex justify-between items-start pointer-events-none safe-top">
          <div className="flex flex-col drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Score</span>
            <span className="text-5xl font-black text-white tabular-nums">{gameState.score}</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="pointer-events-auto w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-2xl hover:scale-110 active:scale-90 transition-transform shadow-xl"
          >
            ⚙️
          </button>
        </div>

        {(gameState.status === 'idle' || gameState.status === 'ready' || gameState.status === 'gameOver') && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500" onClick={handleInteraction}>
            {gameState.status === 'idle' && (
              <div className="space-y-6">
                <h1 className="text-7xl font-black text-white italic tracking-tighter drop-shadow-2xl">FLAPPY<br/>BIRD</h1>
                <div className="py-4 px-8 bg-blue-600 text-white rounded-full font-black text-xl animate-bounce shadow-2xl">
                  TAP TO START
                </div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-12">Pro Mobile Edition</p>
              </div>
            )}
            
            {gameState.status === 'ready' && (
              <div className="animate-pulse space-y-4">
                <p className="text-4xl font-black text-white italic uppercase tracking-widest">GET READY</p>
                <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              </div>
            )}

            {gameState.status === 'gameOver' && (
              <div className="w-full max-w-xs bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl border-b-8 border-red-600/50 animate-in zoom-in duration-300">
                <h2 className="text-5xl font-black text-red-500 mb-6 italic tracking-tighter">Ouch!</h2>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-end border-b-2 border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Score</span>
                    <span className="text-4xl font-black text-gray-800 dark:text-white tabular-nums">{gameState.score}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Best</span>
                    <span className="text-2xl font-black text-blue-500 tabular-nums">{gameState.highScore}</span>
                  </div>
                </div>
                <button 
                  onClick={startGame}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all uppercase tracking-widest"
                >
                  RETRY
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={setSettings} />
      )}
    </div>
  );
};

export default App;
