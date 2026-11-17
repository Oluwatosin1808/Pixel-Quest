import type { ReactElement } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Renders an ASCII pixel-art grid (`#` = filled, anything else = empty).
 * Keeping the art as readable strings makes the tiny sprites easy to tune.
 */
function PixelArt({
  rows,
  size,
  className = '',
  label,
}: {
  rows: string[];
  size: number;
  className?: string;
  label?: string;
}): ReactElement {
  const w = rows[0].length;
  const h = rows.length;
  const cells: ReactElement[] = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      cells.push(<rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} />);
    }
  }
  return (
    <svg
      width={size}
      height={Math.max(1, Math.round((size * h) / w))}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
    >
      {label ? <title>{label}</title> : null}
      {cells}
    </svg>
  );
}

/** Right-pointing play triangle; rotate for other directions. */
export function PlayIcon({ size = 11, className = '', dir = 'right' }: IconProps & { dir?: 'right' | 'left' | 'up' | 'down' }) {
  const angle = { right: 0, down: 90, left: 180, up: 270 }[dir];
  const rows = ['#....', '##...', '###..', '##...', '#....'];
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      width={size}
      height={Math.max(1, Math.round((size * h) / w))}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <g transform={`rotate(${angle} ${w / 2} ${h / 2})`}>
        {rows.flatMap((row, y) =>
          row.split('').map((ch, x) => (ch === '#' ? <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} /> : null)),
        )}
      </g>
    </svg>
  );
}

/** Circular-arrow "restart" glyph. */
export function RestartIcon({ size = 12, className = '' }: IconProps) {
  return (
    <PixelArt
      size={size}
      className={className}
      rows={[
        '..######.',
        '.##...###',
        '##...##..',
        '#.......#',
        '#.......#',
        '#.......#',
        '##.....##',
        '.##...##.',
        '..#####..',
      ]}
    />
  );
}

/** Two-bar pause glyph. */
export function PauseIcon({ size = 11, className = '' }: IconProps) {
  return <PixelArt size={size} className={className} rows={['##..##', '##..##', '##..##', '##..##', '##..##']} />;
}

/** Padlock used on the locked world cards. */
export function LockIcon({ size = 11, className = '' }: IconProps) {
  return (
    <PixelArt
      size={size}
      className={className}
      rows={['...###...', '..#...#..', '..#...#..', '..#...#..', '.#######.', '.###o###.', '.###o###.', '.#######.', '.#######.']}
    />
  );
}

/** Vertical sword used by the touch ATTACK pad. */
export function SwordIcon({ size = 20, className = '' }: IconProps) {
  return (
    <PixelArt
      size={size}
      className={className}
      rows={[
        '....#.....',
        '...###....',
        '...###....',
        '...###....',
        '...###....',
        '...###....',
        '...###....',
        '..#####...',
        '.#######..',
        '...###....',
        '..#####...',
      ]}
    />
  );
}

/** Pixel-art heart (7x6 grid) for the health HUD. */
export function HeartIcon({ size = 14, filled = true, className = '' }: IconProps & { filled?: boolean }) {
  const color = filled ? '#ef6a55' : '#26302b';
  const highlight = filled ? '#ffd0c2' : '#3a4741';
  return (
    <svg
      width={size}
      height={(size * 6) / 7}
      viewBox="0 0 7 6"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <g fill={color}>
        <rect x="1" y="0" width="2" height="1" />
        <rect x="4" y="0" width="2" height="1" />
        <rect x="0" y="1" width="7" height="2" />
        <rect x="1" y="3" width="5" height="1" />
        <rect x="2" y="4" width="3" height="1" />
        <rect x="3" y="5" width="1" height="1" />
      </g>
      {filled && (
        <g fill={highlight}>
          <rect x="1" y="1" width="1" height="1" />
          <rect x="2" y="1" width="1" height="1" />
        </g>
      )}
      {!filled && (
        <g fill="#1b221e">
          <rect x="1" y="1" width="2" height="1" />
          <rect x="4" y="1" width="2" height="1" />
          <rect x="1" y="2" width="5" height="1" />
          <rect x="2" y="3" width="3" height="1" />
          <rect x="3" y="4" width="1" height="1" />
        </g>
      )}
    </svg>
  );
}

/** Pixel-art gold coin (10x10). */
export function CoinIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <g>
        <rect x="3" y="0" width="4" height="1" fill="#b8860b" />
        <rect x="1" y="1" width="8" height="1" fill="#f4c430" />
        <rect x="0" y="2" width="10" height="6" fill="#f4c430" />
        <rect x="1" y="8" width="8" height="1" fill="#b8860b" />
        <rect x="3" y="9" width="4" height="1" fill="#8a6508" />
        <rect x="1" y="2" width="3" height="3" fill="#ffe08a" />
        <rect x="7" y="3" width="2" height="4" fill="#b8860b" />
        <rect x="4" y="3" width="2" height="4" fill="#ffe08a" />
      </g>
    </svg>
  );
}

/** Pixel-art crystal fragment (12x16). */
export function CrystalIcon({ size = 14, className = '' }: IconProps) {  return (
    <svg
      width={(size * 12) / 16}
      height={size}
      viewBox="0 0 12 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <g>
        <rect x="5" y="0" width="2" height="1" fill="#080b0a" />
        <rect x="4" y="1" width="4" height="1" fill="#f4c430" />
        <rect x="3" y="2" width="6" height="1" fill="#f4c430" />
        <rect x="2" y="3" width="8" height="1" fill="#f4c430" />
        <rect x="1" y="4" width="10" height="7" fill="#f4c430" />
        <rect x="2" y="11" width="8" height="1" fill="#f4c430" />
        <rect x="3" y="12" width="6" height="1" fill="#b8860b" />
        <rect x="4" y="13" width="4" height="2" fill="#b8860b" />
        <rect x="5" y="15" width="2" height="1" fill="#8a6508" />
        <rect x="1" y="4" width="2" height="7" fill="#ffe08a" />
        <rect x="5" y="3" width="2" height="8" fill="#fff3c9" />
        <rect x="9" y="4" width="2" height="7" fill="#b8860b" />
        <rect x="0" y="4" width="1" height="7" fill="#080b0a" />
        <rect x="11" y="4" width="1" height="7" fill="#080b0a" />
      </g>
    </svg>
  );
}
