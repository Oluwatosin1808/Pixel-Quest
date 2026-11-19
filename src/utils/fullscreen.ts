/**
 * Mobile fullscreen helpers — entering fullscreen (with the browser UI /
 * URL bar hidden) is what makes the game fill the whole phone screen.
 *
 * iOS Safari has no Fullscreen API for normal pages; there the installed
 * web-app ("Add to Home Screen") standalone mode is the fallback, so every
 * call here degrades silently instead of throwing.
 */

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void;
};
type OrientationLock = (orientation: 'landscape' | 'portrait') => Promise<void>;

/** True for touch-first devices (phones / tablets). */
export function isCoarsePointer(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** True when the document is currently displayed fullscreen. */
export function isFullscreen(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
}

/** True when this browser exposes the Fullscreen API at all. */
export function supportsFullscreen(): boolean {
  const el = document.documentElement as WebkitElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

/** Enter fullscreen, hide the browser UI, and prefer landscape. */
export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as WebkitElement;
  try {
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      await el.webkitRequestFullscreen();
    } else {
      return false;
    }
  } catch {
    return false;
  }

  // Best effort: some mobile browsers refuse to lock (and desktops throw).
  // `lock` is outside the standard TS DOM lib, so it is accessed loosely.
  try {
    const orientation = screen.orientation as unknown as { lock?: OrientationLock };
    if (orientation?.lock) await orientation.lock('landscape');
  } catch {
    /* orientation lock unsupported — fullscreen alone still helps */
  }
  return true;
}

/** Leave fullscreen (no-op when not fullscreen). */
export async function exitFullscreen(): Promise<void> {
  const doc = document as WebkitDocument;
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    /* ignore — browsers can refuse during transitions */
  }
}

/** Toggle fullscreen; resolves to the resulting state. */
export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    await exitFullscreen();
    return false;
  }
  return enterFullscreen();
}

/** Subscribe to fullscreen changes (both standard + webkit prefixed). */
export function onFullscreenChange(handler: () => void): () => void {
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
