import { useEffect, useState } from 'react';
import { commands, swallowEsc } from '../store/bridge';
import { setPhase, setUI, useUI } from '../store/uiStore';
import { SaveSystem } from '../game/systems/SaveSystem';
import { AudioManager } from '../game/systems/AudioManager';
import { setSettings } from '../store/uiStore';
import { PixelButton } from './PixelButton';

/** Audio preferences + save-data reset (with a two-step confirm). */
export function SettingsMenu() {
  const settings = useUI((s) => s.settings);
  const notice = useUI((s) => s.notice);
  const returnTo = useUI((s) => s.settingsReturn);
  const [confirming, setConfirming] = useState(false);

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

  // Any change is persisted immediately and applied to the live audio manager.
  const update = (patch: Partial<typeof settings>): void => {
    const next = { ...settings, ...patch };
    setSettings(next);
    SaveSystem.saveSettings(next);
    AudioManager.get().applySettings(next);
  };

  const resetData = (): void => {
    if (!confirming) {
      setConfirming(true);
      setUI({ notice: 'PRESS AGAIN TO ERASE ALL DATA' });
      return;
    }
    setConfirming(false);
    commands.resetAllData();
  };

  return (
    <div className="screen screen--settings">
      <div className="panel panel--settings">
        <h2 className="panel__title">SETTINGS</h2>

        <div className="settings__group">
          <div className="settings__row">
            <span className="settings__label">MUSIC</span>
            <button
              type="button"
              className={`toggle ${settings.music ? 'is-on' : ''}`}
              aria-pressed={settings.music}
              onClick={() => update({ music: !settings.music })}
            >
              {settings.music ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings__row">
            <span className="settings__label">MUSIC VOLUME</span>
            <input
              className="slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.musicVolume * 100)}
              aria-label="Music volume"
              onChange={(e) => update({ musicVolume: Number(e.target.value) / 100 })}
            />
            <span className="settings__value">{Math.round(settings.musicVolume * 100)}</span>
          </div>

          <div className="settings__row">
            <span className="settings__label">SOUND EFFECTS</span>
            <button
              type="button"
              className={`toggle ${settings.sfx ? 'is-on' : ''}`}
              aria-pressed={settings.sfx}
              onClick={() => update({ sfx: !settings.sfx })}
            >
              {settings.sfx ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings__row">
            <span className="settings__label">SFX VOLUME</span>
            <input
              className="slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.sfxVolume * 100)}
              aria-label="Sound effects volume"
              onChange={(e) => update({ sfxVolume: Number(e.target.value) / 100 })}
            />
            <span className="settings__value">{Math.round(settings.sfxVolume * 100)}</span>
          </div>
        </div>

        <div className="settings__danger">
          <PixelButton variant="danger" onClick={resetData}>
            {confirming ? 'ARE YOU SURE? TAP AGAIN' : 'RESET ALL DATA'}
          </PixelButton>
          {notice && <p className="settings__notice">{notice}</p>}
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
