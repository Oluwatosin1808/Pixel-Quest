import { useEffect } from 'react';
import { useUI, setPhase } from '../store/uiStore';
import { swallowEsc } from '../store/bridge';
import { PixelButton } from './PixelButton';

interface ControlRow {
  keys: string;
  action: string;
}

const CONTROLS: ControlRow[] = [
  { keys: 'A / ←', action: 'MOVE LEFT' },
  { keys: 'D / →', action: 'MOVE RIGHT' },
  { keys: 'W / ↑ / SPACE', action: 'JUMP (hold for higher)' },
  { keys: 'J / X', action: 'SWORD ATTACK' },
  { keys: 'ESC', action: 'PAUSE' },
];

const TIPS = [
  'Slimes take TWO sword hits. Time your swings.',
  'Fall into a pit and you lose a heart — you respawn on solid ground.',
  'Checkpoints restore your hearts and save your progress.',
  'Some coins hide above the treetops. Look for odd ledges.',
  'Collect the crystal fragment to complete your relic set.',
];

/** How to play: controls, scoring and survival tips. */
export function HowToPlay() {
  const returnTo = useUI((s) => s.howtoReturn);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        swallowEsc();
        setPhase(returnTo);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [returnTo]);

  return (
    <div className="screen screen--howto">
      <div className="panel panel--wide">
        <h2 className="panel__title">HOW TO PLAY</h2>

        <div className="howto__columns">
          <section>
            <h3 className="howto__heading">CONTROLS</h3>
            <table className="howto__table">
              <tbody>
                {CONTROLS.map((row) => (
                  <tr key={row.action}>
                    <th scope="row">
                      <kbd>{row.keys}</kbd>
                    </th>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="howto__heading">SCORING</h3>
            <ul className="howto__list">
              <li>COIN — 10 PTS</li>
              <li>SLIME DEFEATED — 25 PTS</li>
              <li>CRYSTAL FRAGMENT — 100 PTS</li>
              <li>LEVEL CLEAR BONUS — 500 PTS</li>
            </ul>

            <h3 className="howto__heading">TIPS</h3>
            <ul className="howto__list howto__list--tips">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="panel__actions panel__actions--row">
          <PixelButton variant="primary" onClick={() => setPhase(returnTo)}>
            ← BACK
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
