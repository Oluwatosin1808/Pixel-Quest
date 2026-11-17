import { useEffect } from 'react';
import { commands, swallowEsc } from '../store/bridge';
import { useUI } from '../store/uiStore';
import { PixelButton } from './PixelButton';
import { CoinIcon, CrystalIcon, HeartIcon, RestartIcon } from './icons/PixelIcons';

/** Game over: final stats with retry / main-menu actions. */
export function GameOver() {
  const hud = useUI((s) => s.hud);
  const bestScore = useUI((s) => s.bestScore);

  // Enter / Space = retry, Escape = main menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        commands.restartLevel();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        swallowEsc();
        commands.returnToMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isBest = hud.score > 0 && hud.score >= bestScore;

  return (
    <div className="overlay overlay--dim">
      <div className="panel panel--result">
        <h2 className="panel__title panel__title--danger">GAME OVER</h2>
        {isBest && <p className="result__best">NEW BEST SCORE!</p>}

        <dl className="result__stats">
          <div className="result__row">
            <dt>SCORE</dt>
            <dd>{String(hud.score).padStart(6, '0')}</dd>
          </div>
          <div className="result__row">
            <dt>
              <CoinIcon size={12} /> COINS
            </dt>
            <dd>{String(hud.coins).padStart(2, '0')}</dd>
          </div>
          <div className="result__row">
            <dt>
              <CrystalIcon size={13} /> CRYSTALS
            </dt>
            <dd>
              {hud.crystals}/{hud.crystalsTotal}
            </dd>
          </div>
          <div className="result__row">
            <dt>
              <HeartIcon size={12} filled={false} /> HEARTS LEFT
            </dt>
            <dd>0</dd>
          </div>
          <div className="result__row result__row--best">
            <dt>BEST</dt>
            <dd>{String(bestScore).padStart(6, '0')}</dd>
          </div>
        </dl>

        <div className="panel__actions">
          <PixelButton variant="primary" onClick={() => commands.restartLevel()}>
            <RestartIcon size={12} />RETRY
          </PixelButton>
          <PixelButton onClick={() => commands.returnToMenu()}>MAIN MENU</PixelButton>
        </div>

        <p className="panel__hint">ENTER RETRY · ESC MENU</p>
      </div>
    </div>
  );
}
