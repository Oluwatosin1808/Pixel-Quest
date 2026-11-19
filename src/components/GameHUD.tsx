import { commands } from '../store/bridge';
import { useUI } from '../store/uiStore';
import { CoinIcon, CrystalIcon, HeartIcon, PauseIcon } from './icons/PixelIcons';

/** In-game heads-up display: hearts, coins, score, crystals and area name. */
export function GameHUD() {
  const hud = useUI((s) => s.hud);
  const phase = useUI((s) => s.phase);
  const playing = phase === 'playing';

  return (
    <div className="hud">
      <div className="hud__row">
        <div className="hearts" aria-label={`Health ${hud.health} of ${hud.maxHealth}`}>
          {Array.from({ length: hud.maxHealth }, (_, i) => (
            <HeartIcon key={i} size={16} filled={i < hud.health} />
          ))}
        </div>

        <div className="hud__stats">
          <span className="stat" title="Coins">
            <CoinIcon size={14} />
            <strong>{String(hud.coins).padStart(2, '0')}</strong>
          </span>
          <span className="stat stat--crystal" title="Crystal fragments">
            <CrystalIcon size={15} />
            <strong>
              {hud.crystals}/{hud.crystalsTotal}
            </strong>
          </span>
          <span className="stat stat--score" title="Score">
            {String(hud.score).padStart(6, '0')}
          </span>
          {playing && (
            <button
              type="button"
              className="hud__pause"
              aria-label="Pause game"
              onClick={() => commands.pauseGame()}
            >
              <PauseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="hud__row hud__row--bottom">
        <span className="hud__area">
          {hud.worldName} <span className="hud__area-sep">·</span> {hud.levelName}
        </span>
        <span className="hud__part" aria-label={`Level ${hud.levelIndex} of ${hud.levelsInWorld}`}>
          LEVEL {hud.levelIndex}/{hud.levelsInWorld}
        </span>
      </div>
    </div>
  );
}
