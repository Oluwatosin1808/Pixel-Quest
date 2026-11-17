import { useEffect } from 'react';
import { useUI } from './store/uiStore';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { WorldSelect } from './components/WorldSelect';
import { HowToPlay } from './components/HowToPlay';
import { SettingsMenu } from './components/SettingsMenu';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { GameOver } from './components/GameOver';
import { VictoryScreen } from './components/VictoryScreen';
import { MobileControls } from './components/MobileControls';
import { Toast } from './components/Toast';

/**
 * Application shell: Phaser renders the game world; React owns every menu,
 * overlay and HUD element around it.
 */
export default function App() {
  const phase = useUI((state) => state.phase);

  // Block browser scrolling / zooming gestures on the game surface.
  useEffect(() => {
    const prevent = (event: TouchEvent): void => {
      if (event.touches.length > 1) event.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, []);

  return (
    <div className="app-root">
      <GameCanvas />

      {phase === 'menu' && <MainMenu />}
      {phase === 'worlds' && <WorldSelect />}
      {phase === 'howto' && <HowToPlay />}
      {phase === 'settings' && <SettingsMenu />}

      {(phase === 'playing' || phase === 'paused') && <GameHUD />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'gameover' && <GameOver />}
      {phase === 'victory' && <VictoryScreen />}

      <MobileControls visible={phase === 'playing'} />
      <Toast />

      <div className="scanlines" aria-hidden="true" />
      <div className="rotate-hint" aria-hidden="true">
        <span>ROTATE YOUR DEVICE</span>
      </div>
    </div>
  );
}
