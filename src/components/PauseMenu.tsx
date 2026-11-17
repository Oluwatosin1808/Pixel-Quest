import { useEffect } from 'react';
import { commands, swallowEsc } from '../store/bridge';
import { PixelButton } from './PixelButton';
import { PlayIcon, RestartIcon } from './icons/PixelIcons';

/** Pause overlay: resume, restart, settings, return to menu. */
export function PauseMenu() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        swallowEsc();
        commands.resumeGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="overlay overlay--dim">
      <div className="panel panel--pause">
        <h2 className="panel__title">PAUSED</h2>

        <div className="panel__actions">
          <PixelButton variant="primary" onClick={() => commands.resumeGame()}>
            <PlayIcon size={12} />RESUME
          </PixelButton>
          <PixelButton onClick={() => commands.restartLevel()}>
            <RestartIcon size={12} />RESTART LEVEL
          </PixelButton>
          <PixelButton onClick={() => commands.openSettings('paused')}>SETTINGS</PixelButton>
          <PixelButton onClick={() => commands.returnToMenu()}>MAIN MENU</PixelButton>
        </div>

        <p className="panel__hint">
          A/D MOVE · SPACE JUMP · J SWORD · ESC PAUSE
        </p>
      </div>
    </div>
  );
}
