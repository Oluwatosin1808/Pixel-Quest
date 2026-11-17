import { useEffect, useState } from 'react';

/**
 * True on touch-first devices (phones / tablets). Used to decide whether the
 * on-screen controls are shown. The `?touch=1` query param forces them on,
 * which is handy for testing on a desktop browser.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).has('touch')) return true;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const onChange = (event: MediaQueryListEvent): void => setIsTouch(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}
