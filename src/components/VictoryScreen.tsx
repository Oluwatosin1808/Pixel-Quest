import { useEffect } from 'react';
import { commands, swallowEsc } from '../store/bridge';
import { useUI } from '../store/uiStore';
import { PixelButton } from './PixelButton';
import { CoinIcon, CrystalIcon, PlayIcon, RestartIcon } from './icons/PixelIcons';

/** Level complete: run statistics, best score and replay / continue. */
export function VictoryScreen() {
  const hud = useUI((s) => s.hud);
  const bestScore = useUI((s) => s.bestScore);
  const crystalsFound = useUI((s) => s.crystalsFound);
  const nextLevelId = useUI((s) => s.nextLevelId);

  // Enter = next level, R = replay, Escape = main menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commands.nextLevel();
      } else if (event.key === 'r' || event.key === 'R') {
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
        <h2 className="panel__title panel__title--gold">LEVEL COMPLETE!</h2>
        <p className="result__area">
          {hud.worldName} <span className="hud__area-sep">·</span> {hud.levelName}
        </p>
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
          <div className="result__row result__row--best">
            <dt>BEST</dt>
            <dd>{String(bestScore).padStart(6, '0')}</dd>
          </div>
        </dl>

        <p className="result__relic">
          RELICS RECOVERED <strong>{crystalsFound}</strong> / 4
        </p>

        <div className="panel__actions">
          <PixelButton variant="primary" onClick={() => commands.nextLevel()}>
            <PlayIcon size={12} />{nextLevelId ? 'NEXT LEVEL' : 'WORLD SELECT'}
          </PixelButton>
          <PixelButton onClick={() => commands.restartLevel()}>
            <RestartIcon size={12} />REPLAY
          </PixelButton>
          <PixelButton onClick={() => commands.returnToMenu()}>MAIN MENU</PixelButton>
        </div>

        <p className="panel__hint">ENTER NEXT · R REPLAY · ESC MENU</p>
      </div>
    </div>
  );
}
