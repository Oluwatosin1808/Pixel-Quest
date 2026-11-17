import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config/createGameConfig';
import { attachGame, detachGame } from '../store/bridge';
import { AudioManager } from '../game/systems/AudioManager';

/**
 * Hosts the Phaser canvas. React StrictMode mounts effects twice in
 * development, so the game is created and torn down cleanly each time.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new Phaser.Game(createGameConfig(host));
    attachGame(game);

    // Dev-only handle for automated playtesting / debugging.
    if (import.meta.env.DEV) {
      (window as unknown as { __PQ_GAME__?: Phaser.Game }).__PQ_GAME__ = game;
    }

    return () => {
      detachGame();
      if (import.meta.env.DEV) {
        delete (window as unknown as { __PQ_GAME__?: Phaser.Game }).__PQ_GAME__;
      }
      try {
        AudioManager.get().stopMusic();
        const canvas = game.canvas;
        game.destroy(true);
        // Phaser defers canvas removal to its next frame; remove it right away
        // so StrictMode's double-mount never leaves a stale canvas behind.
        if (canvas && canvas.parentElement === host) {
          canvas.parentElement.removeChild(canvas);
        }
      } catch (error) {
        console.warn('[PixelQuest] game teardown', error);
      }
    };
  }, []);

  return <div className="game-canvas" ref={hostRef} />;
}
