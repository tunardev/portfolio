import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { colors, durations, easings, radii } from "@/styles/tokens.stylex";
import { COLS, EMPTY, FIRST, ROWS, SECOND, TOP_ROW, hasRoom, type Board as BoardState } from "./engine";

const CELL = 76;
const GUTTER = 30;
const PIECE_R = 24;
const RING_R = 30;
const MARKER_W = 8;

const BOARD_W = COLS * CELL;
const BOARD_H = GUTTER + ROWS * CELL;

const EMPTY_CELL_STROKE = `color-mix(in srgb, ${colors.ink} 14%, transparent)`;

const centerX = (col: number) => col * CELL + CELL / 2;
const centerY = (row: number) => GUTTER + CELL / 2 + (TOP_ROW - row) * CELL;

type Props = {
  board: BoardState;
  canPlay: boolean;
  onPlay: (col: number) => void;
  last: [number, number] | null;
  winningLine: [number, number][];
  over: boolean;
  dim?: boolean;
};

export function Board({ board, canPlay, onPlay, last, winningLine, over, dim }: Props) {
  const [hovered, setHovered] = useState(-1);

  return (
    <div {...stylex.props(styles.boardWrap, dim && styles.boardWrapDimmed)}>
      <svg {...stylex.props(styles.board)} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
        {canPlay && hasRoom(board, hovered) && (
          <path
            d={`M${centerX(hovered)} 6 L${centerX(hovered) - MARKER_W} 18 L${centerX(hovered) + MARKER_W} 18 Z`}
            fill={colors.ink}
          />
        )}
        {board.map((cells, row) =>
          cells.map((cell, col) => {
            const won = winningLine.some(([r, c]) => r === row && c === col);
            const faded = over && winningLine.length > 0 && cell !== EMPTY && !won;
            const isLast = !over && last?.[0] === row && last[1] === col;

            return (
              <g key={`${row}-${col}`}>
                <circle
                  cx={centerX(col)}
                  cy={centerY(row)}
                  r={PIECE_R}
                  fill={cell === FIRST ? colors.ink : cell === SECOND ? colors.red : "none"}
                  stroke={cell === EMPTY ? EMPTY_CELL_STROKE : "none"}
                  strokeWidth={1.5}
                  {...stylex.props(cell !== EMPTY && styles.piece)}
                  opacity={faded ? 0.35 : 1}
                />
                {isLast && (
                  <circle
                    cx={centerX(col)}
                    cy={centerY(row)}
                    r={RING_R}
                    fill="none"
                    stroke={cell === SECOND ? colors.red : colors.ink}
                    strokeWidth={1.5}
                  />
                )}
              </g>
            );
          }),
        )}
      </svg>

      <div {...stylex.props(styles.dropZone)} onMouseLeave={() => setHovered(-1)}>
        {Array.from({ length: COLS }, (_, col) => {
          const filled = board.reduce((count, cells) => count + (cells[col] !== EMPTY ? 1 : 0), 0);
          const full = filled === ROWS;
          const playable = canPlay && !full;

          return (
            <button
              key={col}
              type="button"
              {...stylex.props(styles.drop, !playable && styles.dropDisabled)}
              aria-disabled={!playable}
              aria-label={full ? `Column ${col + 1}, full` : `Drop in column ${col + 1}, ${filled} of ${ROWS} filled`}
              onMouseEnter={() => setHovered(col)}
              onFocus={() => setHovered(col)}
              onBlur={() => setHovered(-1)}
              onClick={() => {
                if (playable) onPlay(col);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const dropIn = stylex.keyframes({
  from: { transform: "translateY(-40px)", opacity: 0.4 },
  to: { transform: "none", opacity: 1 },
});

const styles = stylex.create({
  boardWrap: {
    position: "relative",
    flexShrink: 1,
    inlineSize: "532px",
    maxInlineSize: "100%",
    transition: `opacity ${durations.calm} ease`,
  },
  boardWrapDimmed: {
    opacity: 0.35,
  },
  board: {
    display: "block",
    inlineSize: "100%",
    blockSize: "auto",
    pointerEvents: "none",
  },
  dropZone: {
    position: "absolute",
    inset: 0,
    display: "flex",
  },
  drop: {
    flex: 1,
    borderRadius: radii.lg,
  },
  dropDisabled: {
    cursor: "default",
  },
  piece: {
    transformBox: "fill-box",
    transformOrigin: "center",
    animationName: dropIn,
    animationDuration: durations.calm,
    animationTimingFunction: easings.out,
  },
});
