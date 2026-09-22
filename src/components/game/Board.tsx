import { useState } from "react";
import { COLS, EMPTY, FIRST, ROWS, SECOND, TOP_ROW, hasRoom, type Board as BoardState } from "./engine";
import styles from "./FourInARow.module.css";

const CELL = 76;
const GUTTER = 30;
const PIECE_R = 24;
const RING_R = 30;
const MARKER_W = 8;

const BOARD_W = COLS * CELL;
const BOARD_H = GUTTER + ROWS * CELL;

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
    <div className={styles.boardWrap} data-dim={dim || undefined}>
      <svg className={styles.board} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
        {canPlay && hasRoom(board, hovered) && (
          <path
            d={`M${centerX(hovered)} 6 L${centerX(hovered) - MARKER_W} 18 L${centerX(hovered) + MARKER_W} 18 Z`}
            fill="var(--ink)"
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
                  fill={cell === FIRST ? "var(--ink)" : cell === SECOND ? "var(--red)" : "none"}
                  stroke={cell === EMPTY ? "color-mix(in srgb, var(--ink) 14%, transparent)" : "none"}
                  strokeWidth={1.5}
                  className={cell !== EMPTY ? styles.piece : undefined}
                  opacity={faded ? 0.35 : 1}
                />
                {isLast && (
                  <circle
                    cx={centerX(col)}
                    cy={centerY(row)}
                    r={RING_R}
                    fill="none"
                    stroke={cell === SECOND ? "var(--red)" : "var(--ink)"}
                    strokeWidth={1.5}
                  />
                )}
              </g>
            );
          }),
        )}
      </svg>

      <div className={styles.dropZone} onMouseLeave={() => setHovered(-1)}>
        {Array.from({ length: COLS }, (_, col) => {
          const filled = board.reduce((count, cells) => count + (cells[col] !== EMPTY ? 1 : 0), 0);
          const full = filled === ROWS;
          const playable = canPlay && !full;

          return (
            // aria-disabled, not disabled: a disabled button drops focus to the body the moment a move ends the turn
            <button
              key={col}
              type="button"
              className={styles.drop}
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
