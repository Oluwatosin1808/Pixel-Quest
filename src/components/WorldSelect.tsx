import { commands } from '../store/bridge';
import { useUI, showToast, setPhase } from '../store/uiStore';
import { AudioManager } from '../game/systems/AudioManager';
import { LEVELS } from '../game/config/levels';
import { PixelButton } from './PixelButton';
import { LockIcon, PlayIcon } from './icons/PixelIcons';

/** World selection: worlds unlock in order as the previous one is cleared. */
export function WorldSelect() {
  const bestScore = useUI((s) => s.bestScore);
  const highestUnlockedWorld = useUI((s) => s.highestUnlockedWorld);
  const completedLevels = useUI((s) => s.completedLevels);

  const enter = (worldIndex: number, unlocked: boolean): void => {
    if (unlocked) {
      commands.startWorld(worldIndex);
      return;
    }
    AudioManager.get().playSfx('locked');
    showToast(`CLEAR WORLD ${worldIndex - 1} FIRST`, 'cream');
  };

  return (
    <div className="screen screen--worlds">
      <div className="worlds__inner">
        <header className="worlds__header">
          <h2 className="panel__title">SELECT WORLD</h2>
          <p className="worlds__hint">THE ANCIENT CRYSTAL SHATTERED INTO FOUR PIECES</p>
        </header>

        <div className="worlds__grid">
          {LEVELS.map((level) => {
            const unlocked = level.worldIndex <= highestUnlockedWorld;
            const cleared = completedLevels.includes(level.id);
            return (
              <article key={level.id} className={`world-card ${unlocked ? 'is-open' : 'is-locked'}`}>
                <div className="world-card__badge">
                  WORLD {level.worldIndex}
                  {cleared && <span className="world-card__cleared">CLEARED</span>}
                </div>
                <h3 className="world-card__name">{level.levelName}</h3>
                <p className="world-card__sub">{level.subtitle}</p>
                {unlocked ? (
                  <PixelButton variant="primary" onClick={() => enter(level.worldIndex, true)}>
                    <PlayIcon size={11} />
                    {cleared ? 'REPLAY' : 'ENTER'}
                  </PixelButton>
                ) : (
                  <button
                    type="button"
                    className="btn btn--locked"
                    onClick={() => enter(level.worldIndex, false)}
                    aria-disabled="true"
                  >
                    <span className="btn__label">
                      <LockIcon size={11} />
                      LOCKED
                    </span>
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <footer className="worlds__footer">
          <span className="record">
            BEST <strong>{String(bestScore).padStart(6, '0')}</strong>
          </span>
          <PixelButton onClick={() => setPhase('menu')}>← BACK</PixelButton>
        </footer>
      </div>
    </div>
  );
}
