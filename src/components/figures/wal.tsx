import type { ReactNode } from "react";
import { type Figure, INK, RED, SOFT, PAPER, ink, STAGE_W, STAGE_H } from "./palette";
import { Label } from "./shared";

export const wal: Figure = (() => {
  const cellX = (i: number) => 78 + i * 44;
  const crashAt = 6.4;
  const replayAt = 7.2;
  const CY = 42;
  const TY = 140;

  const applied = (t: number) => {
    if (t >= replayAt + 1.2) return 10;
    if (t >= replayAt + 0.8) return 9;
    if (t >= replayAt + 0.4) return 8;
    if (t >= 5.0) return 7;
    if (t >= 3.0) return 4;
    return 0;
  };
  const written = (t: number) => Math.min(10, Math.max(0, Math.floor((t - 0.4) / 0.5) + 1));
  const durable = (t: number) => (t < crashAt ? Math.min(10, Math.max(0, Math.floor((t - 0.6) / 0.5) + 1)) : 10);

  return {
    caption: "Write-ahead log. Every write reaches the log and fsync before the table. Lose power, replay the log.",
    duration: 11,
    pace: 1.4,
    View({ t }) {
      const crashed = t >= crashAt && t < replayAt;
      const w = written(t);
      const d = durable(t);
      const a = applied(t);
      const cells: ReactNode[] = [];
      for (let i = 0; i < 12; i++) {
        const x = cellX(i);
        const base = { x, y: CY, width: 40, height: 28, rx: 3 };
        if (i < a) cells.push(<rect key={i} {...base} fill={ink(0.1)} stroke={ink(0.35)} />);
        else if (i < d) cells.push(<rect key={i} {...base} fill={PAPER} stroke={INK} strokeWidth={1.3} />);
        else if (i < w)
          cells.push(
            <g key={i}>
              <rect {...base} fill={PAPER} stroke={RED} strokeWidth={1.3} strokeDasharray="3 3" />
              <circle cx={x + 20} cy={CY + 14} r={2.4} fill={RED} />
            </g>,
          );
        else cells.push(<rect key={i} {...base} fill="none" stroke={ink(0.18)} strokeDasharray="3 3" />);
      }
      const fx = cellX(d) - 2;
      const cx = cellX(a) - 2;
      const rows = Math.min(4, a);
      const applying = (t >= 3.0 && t < 3.6) || (t >= 5.0 && t < 5.6) || (t >= replayAt && t < replayAt + 1.4);
      const src = cellX(Math.max(0, a - 1)) + 20;
      const replay = t >= replayAt;
      return (
        <g fill="none">
          <Label x={78} y={CY - 22}>
            log
          </Label>
          <Label x={78} y={TY - 18}>
            table
          </Label>
          {cells}
          {d > 0 && t < crashAt && (
            <g>
              <path d={`M${fx} ${CY - 18} L${fx} ${CY - 6}`} stroke={RED} strokeWidth={1.3} />
              <Label x={fx} y={CY - 30} color={RED} anchor="middle">
                fsync
              </Label>
            </g>
          )}
          {a > 0 && (
            <g>
              <path d={`M${cx} ${CY + 34} L${cx} ${CY + 46}`} stroke={ink(0.55)} strokeWidth={1.3} />
              <Label x={cx} y={CY + 56} anchor="middle">
                checkpoint
              </Label>
            </g>
          )}
          <rect x={78} y={TY} width={220} height={64} rx={4} fill={PAPER} stroke={ink(0.35)} />
          {Array.from({ length: rows }, (_, i) => (
            <path
              key={i}
              d={`M90 ${TY + 8 + i * 16} L${90 + 60 + ((i * 37) % 60) + Math.max(0, a - 4) * 6} ${TY + 8 + i * 16}`}
              stroke={ink(0.22)}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
          {applying && (
            <g stroke={replay ? RED : ink(0.55)} strokeWidth={1.4}>
              <path d={`M${src} ${CY + 32} C${src} ${TY - 10}, 356 ${TY + 32}, 306 ${TY + 32}`} />
              <path d={`M314 ${TY + 26} L306 ${TY + 32} L314 ${TY + 38}`} />
              <Label x={368} y={TY} color={replay ? RED : SOFT}>
                {replay ? "replay" : "apply"}
              </Label>
            </g>
          )}
          {crashed && (
            <g>
              <rect
                x={0}
                y={0}
                width={STAGE_W}
                height={STAGE_H}
                fill={`color-mix(in srgb, var(--paper) ${Math.sin(t * 40) > 0 ? 55 : 35}%, transparent)`}
              />
              <Label x={STAGE_W / 2} y={STAGE_H - 10} color={RED} anchor="middle">
                power loss
              </Label>
            </g>
          )}
        </g>
      );
    },
  };
})();
