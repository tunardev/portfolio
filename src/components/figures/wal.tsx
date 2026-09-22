import { INK, ink, PAPER, paper, RED, SOFT, STAGE_H, STAGE_W } from "./palette";
import { Label } from "./shared";

const CELLS = 12;
const RECORDS = 10;
const CELL_W = 40;
const CELL_H = 28;
const cellX = (i: number) => 78 + i * 44;
const crashAt = 6.4;
const replayAt = 7.2;
const CY = 42;
const TY = 140;
export const WAL_PACE = 1.4;
// WCAG 2.3.1 caps flashing at three per second; t runs WAL_PACE times slower than wall-clock time
const FLASHES_PER_SECOND = 3;
const flashOn = (t: number) => Math.sin(2 * Math.PI * FLASHES_PER_SECOND * WAL_PACE * t) > 0;

const applied = (t: number) => {
  if (t >= replayAt + 1.2) return 10;
  if (t >= replayAt + 0.8) return 9;
  if (t >= replayAt + 0.4) return 8;
  if (t >= 5.0) return 7;
  if (t >= 3.0) return 4;
  return 0;
};
const recordsBy = (t: number, start: number) => Math.min(RECORDS, Math.max(0, Math.floor((t - start) / 0.5) + 1));
const written = (t: number) => recordsBy(t, 0.4);
const durable = (t: number) => (t < crashAt ? recordsBy(t, 0.6) : RECORDS);

const isApplying = (t: number) =>
  (t >= 3.0 && t < 3.6) || (t >= 5.0 && t < 5.6) || (t >= replayAt && t < replayAt + 1.4);

type Progress = { applied: number; durable: number; written: number };

function LogCell({ index, applied, durable, written }: Progress & { index: number }) {
  const x = cellX(index);
  const base = { x, y: CY, width: CELL_W, height: CELL_H, rx: 3 };
  if (index < applied) return <rect {...base} fill={ink(0.1)} stroke={ink(0.35)} />;
  if (index < durable) return <rect {...base} fill={PAPER} stroke={INK} strokeWidth={1.3} />;
  if (index < written) {
    return (
      <g>
        <rect {...base} fill={PAPER} stroke={RED} strokeWidth={1.3} strokeDasharray="3 3" />
        <circle cx={x + CELL_W / 2} cy={CY + CELL_H / 2} r={2.4} fill={RED} />
      </g>
    );
  }
  return <rect {...base} fill="none" stroke={ink(0.18)} strokeDasharray="3 3" />;
}

function Marker({
  x,
  top,
  labelY,
  color,
  children,
}: {
  x: number;
  top: number;
  labelY: number;
  color?: string;
  children: string;
}) {
  return (
    <g>
      <line x1={x} y1={top} x2={x} y2={top + 12} stroke={color ?? ink(0.55)} strokeWidth={1.3} />
      <Label x={x} y={labelY} color={color} anchor="middle">
        {children}
      </Label>
    </g>
  );
}

function TableRows({ applied }: { applied: number }) {
  return Array.from({ length: Math.min(4, applied) }, (_, i) => (
    <line
      key={i}
      x1={90}
      y1={TY + 8 + i * 16}
      x2={90 + 60 + ((i * 37) % 60) + Math.max(0, applied - 4) * 6}
      y2={TY + 8 + i * 16}
      stroke={ink(0.22)}
      strokeWidth={3}
      strokeLinecap="round"
    />
  ));
}

function ApplyArrow({ applied, replay }: { applied: number; replay: boolean }) {
  const src = cellX(Math.max(0, applied - 1)) + CELL_W / 2;
  return (
    <g stroke={replay ? RED : ink(0.55)} strokeWidth={1.4}>
      <path d={`M${src} ${CY + 32} C${src} ${TY - 10}, 356 ${TY + 32}, 306 ${TY + 32}`} />
      <path d={`M314 ${TY + 26} L306 ${TY + 32} L314 ${TY + 38}`} />
      <Label x={368} y={TY} color={replay ? RED : SOFT}>
        {replay ? "replay" : "apply"}
      </Label>
    </g>
  );
}

function PowerLoss({ t }: { t: number }) {
  return (
    <g>
      <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={paper(flashOn(t) ? 0.55 : 0.35)} />
      <Label x={STAGE_W / 2} y={STAGE_H - 10} color={RED} anchor="middle">
        power loss
      </Label>
    </g>
  );
}

export function Wal({ t }: { t: number }) {
  const progress = { applied: applied(t), durable: durable(t), written: written(t) };
  return (
    <g fill="none">
      <Label x={78} y={CY - 22}>
        log
      </Label>
      <Label x={78} y={TY - 18}>
        table
      </Label>
      {Array.from({ length: CELLS }, (_, i) => (
        <LogCell key={i} index={i} {...progress} />
      ))}
      {progress.durable > 0 && t < crashAt && (
        <Marker x={cellX(progress.durable) - 2} top={CY - 18} labelY={CY - 30} color={RED}>
          fsync
        </Marker>
      )}
      {progress.applied > 0 && (
        <Marker x={cellX(progress.applied) - 2} top={CY + 34} labelY={CY + 56}>
          checkpoint
        </Marker>
      )}
      <rect x={78} y={TY} width={220} height={64} rx={4} fill={PAPER} stroke={ink(0.35)} />
      <TableRows applied={progress.applied} />
      {isApplying(t) && <ApplyArrow applied={progress.applied} replay={t >= replayAt} />}
      {t >= crashAt && t < replayAt && <PowerLoss t={t} />}
    </g>
  );
}
