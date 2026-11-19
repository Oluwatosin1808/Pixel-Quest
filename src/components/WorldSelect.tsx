import { commands } from '../store/bridge';
import { useUI, showToast, setPhase } from '../store/uiStore';
import { AudioManager } from '../game/systems/AudioManager';
import { LEVELS, WORLD_COUNT, isLevelUnlocked } from '../game/config/levels';
import { PixelButton } from './PixelButton';
import { LockIcon, PlayIcon } from './icons/PixelIcons';

/** World/stage select: stages unlock one at a time within each world. */
export function WorldSelect() {
  const bestScore = useUI((s) => s.bestScore);
  const highestUnlockedWorld = useUI((s) => s.highestUnlockedWorld);
  const completedLevels = useUI((s) => s.completedLevels);

  const enter = (levelId: string, unlocked: boolean, worldIndex: number): void => {
    if (unlocked) {
      commands.startLevel(levelId);
      return;
    }
    AudioManager.get().playSfx('locked');
    showToast(worldIndex > highestUnlockedWorld ? `CLEAR WORLD ${worldIndex - 1} FIRST` : 'CLEAR THE PREVIOUS LEVEL', 'cream');
  };

  return (
    <div className="screen screen--worlds">
      <div className="worlds__inner">
        <header className="worlds__header">
          <h2 className="panel__title">SELECT LEVEL</h2>
          <p className="worlds__hint">FIVE STAGES PER WORLD · CLEAR ONE TO OPEN THE NEXT</p>
        </header>

        <div className="worlds__grid">
          {Array.from({ length: WORLD_COUNT }, (_, i) => i + 1).map((worldIndex) => {
            const stages = LEVELS.filter((level) => level.worldIndex === worldIndex);
            const worldUnlocked = worldIndex <= highestUnlockedWorld;
            const clearedCount = stages.filter((level) => completedLevels.includes(level.id)).length;
            const worldCleared = clearedCount === stages.length;

            return (
              <article key={worldIndex} className={`world-card ${worldUnlocked ? 'is-open' : 'is-locked'}`}>
                <div className="world-card__badge">
                  WORLD {worldIndex}
                  {worldCleared && <span className="world-card__cleared">CLEARED</span>}
                </div>
                <h3 className="world-card__name">{stages[0].worldTitle}</h3>
                <p className="world-card__sub">
                  {stages[0].subtitle} · {clearedCount}/{stages.length}
                </p>

                <div className="world-card__levels" role="group" aria-label={`World ${worldIndex} stages`}>
                  {stages.map((level) => {
                    const unlocked = worldUnlocked && isLevelUnlocked(level.id, completedLevels, highestUnlockedWorld);
                    const cleared = completedLevels.includes(level.id);
                    return (
                      <button
                        key={level.id}
                        type="button"
                        className={`level-chip ${cleared ? 'is-cleared' : ''} ${unlocked ? '' : 'is-locked'}`}
                        onClick={() => enter(level.id, unlocked, worldIndex)}
                        title={`LEVEL ${level.levelIndex} · ${level.levelName}`}
                        aria-label={`WORLD ${worldIndex} LEVEL ${level.levelIndex}: ${level.levelName}`}
                      >
                        {unlocked ? (cleared ? '✓' : level.levelIndex) : <LockIcon size={9} />}
                      </button>
                    );
                  })}
                </div>

                {worldUnlocked && (
                  <PixelButton variant="primary" onClick={() => commands.startWorld(worldIndex)}>
                    <PlayIcon size={11} />
                    {worldCleared ? 'REPLAY' : 'ENTER'}
                  </PixelButton>
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
