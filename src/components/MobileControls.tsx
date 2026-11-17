import { useEffect, useRef } from 'react';
import { touchInput } from '../store/bridge';
import { useIsTouch } from '../hooks/useIsTouch';
import { PlayIcon, SwordIcon } from './icons/PixelIcons';

interface PadProps {
  label: string;
  glyph: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
  className?: string;
}

/** A single held touch button (movement / jump / attack). */
function TouchPad({ label, glyph, onDown, onUp, className = '' }: PadProps) {
  const active = useRef(false);

  const press = (event: React.PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    // Capture the pointer so slides off the button still release cleanly.
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = true;
    onDown();
  };

  const release = (event: React.PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (!active.current) return;
    active.current = false;
    onUp();
  };

  return (
    <button
      type="button"
      className={`touchpad ${className}`.trim()}
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="touchpad__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="touchpad__label">{label}</span>
    </button>
  );
}

/**
 * On-screen controls for touch devices. Hidden entirely on desktop
 * (unless `?touch=1` forces them on for testing).
 */
export function MobileControls({ visible }: { visible: boolean }) {
  const isTouch = useIsTouch();

  // Safety net: drop every held flag when the pads unmount.
  useEffect(() => {
    if (visible) return;
    touchInput.left = false;
    touchInput.right = false;
    touchInput.jump = false;
    touchInput.attack = false;
  }, [visible]);

  if (!visible || !isTouch) return null;

  return (
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-controls__move">
        <TouchPad
          label="LEFT"
          glyph={<PlayIcon size={22} dir="left" />}
          onDown={() => (touchInput.left = true)}
          onUp={() => (touchInput.left = false)}
        />
        <TouchPad
          label="RIGHT"
          glyph={<PlayIcon size={22} dir="right" />}
          onDown={() => (touchInput.right = true)}
          onUp={() => (touchInput.right = false)}
        />
      </div>

      <div className="touch-controls__actions">
        <TouchPad
          label="ATTACK"
          glyph={<SwordIcon size={26} />}
          className="touchpad--attack"
          onDown={() => (touchInput.attack = true)}
          onUp={() => (touchInput.attack = false)}
        />
        <TouchPad
          label="JUMP"
          glyph="▲"
          className="touchpad--jump"
          onDown={() => (touchInput.jump = true)}
          onUp={() => (touchInput.jump = false)}
        />
      </div>
    </div>
  );
}
