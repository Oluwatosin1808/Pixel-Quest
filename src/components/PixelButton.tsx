import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AudioManager } from '../game/systems/AudioManager';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface PixelButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  children: ReactNode;
  /** Play the UI click sound (default true). */
  sound?: boolean;
}

/** Hard-edged, animated pixel-art button used across all menus. */
export function PixelButton({ variant = 'secondary', children, sound = true, className = '', onClick, ...rest }: PixelButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className}`.trim()}
      onClick={(event) => {
        if (sound) AudioManager.get().playSfx('click');
        onClick?.(event);
      }}
      {...rest}
    >
      <span className="btn__label">{children}</span>
    </button>
  );
}
