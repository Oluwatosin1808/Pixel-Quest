import { commands } from '../store/bridge';
import { useUI } from '../store/uiStore';
import { GAME_VERSION } from '../game/config/gameConfig';
import { PixelButton } from './PixelButton';
import { CrystalIcon, PlayIcon } from './icons/PixelIcons';

/** Title screen: logo, animated backdrop (Phaser) and menu actions. */
export function MainMenu() {
  const hasContinue = useUI((s) => s.hasContinue);
  const bestScore = useUI((s) => s.bestScore);
  const crystalsFound = useUI((s) => s.crystalsFound);

  return (
    <div className="screen screen--menu">
      <div className="menu__inner">
        <header className="menu__header">
          <h1 className="logo" aria-label="Pixel Quest">
            <span className="logo__pixel">PIXEL</span>
            <span className="logo__quest">QUEST</span>
          </h1>
          <p className="logo__tagline">THE SHATTERED CRYSTAL</p>
        </header>

        <nav className="menu__actions" aria-label="Main menu">
          <PixelButton variant="primary" onClick={() => commands.startNewGame()}>
            <PlayIcon size={12} />PLAY
          </PixelButton>
          {hasContinue && (
            <PixelButton onClick={() => commands.continueGame()}>CONTINUE</PixelButton>
          )}
          <PixelButton onClick={() => commands.openWorlds()}>WORLD SELECT</PixelButton>
          <PixelButton onClick={() => commands.openSettings('menu')}>SETTINGS</PixelButton>
          <PixelButton onClick={() => commands.openHowto('menu')}>HOW TO PLAY</PixelButton>
        </nav>

        <footer className="menu__footer">
          <div className="menu__records">
            <span className="record">
              BEST <strong>{String(bestScore).padStart(6, '0')}</strong>
            </span>
            <span className="record record--crystal" title="Crystal fragments recovered">
              <CrystalIcon size={12} /> <strong>{crystalsFound}</strong>
            </span>
          </div>
          <span className="version">PIXEL QUEST v{GAME_VERSION}</span>
        </footer>
      </div>
    </div>
  );
}
