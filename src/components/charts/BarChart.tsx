import { T } from "../../theme";
import type { MonthStat } from "../../types";

/** Monthly net profit bars, centered around a zero baseline. */
export function BarChart({ data }: { data: MonthStat[] }) {
  const W = 500;
  const H = 200;
  const pad = 40;
  const cw = W - pad * 2;
  const ch = H - pad - 20;

  const mx = Math.max(...data.map((v) => Math.abs(v.profit))) * 1.3;
  const bw = (cw / data.length) * 0.55;
  const zy = pad + ch / 2;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={zy} x2={W - pad} y2={zy} stroke={T.gb} />
      {data.map((v, i) => {
        const bx = pad + (i + 0.5) * (cw / data.length) - bw / 2;
        const bh = (Math.abs(v.profit) / mx) * (ch / 2);
        const by = v.profit >= 0 ? zy - bh : zy;
        return (
          <g key={"b" + i}>
            <rect
              x={bx}
              y={by}
              width={bw}
              height={bh}
              rx={6}
              fill={v.profit >= 0 ? T.em : T.ro}
              fillOpacity={0.7}
            />
            <text
              x={bx + bw / 2}
              y={H - 6}
              fill={T.td}
              fontSize={11}
              textAnchor="middle"
              fontFamily="'IBM Plex Mono'"
            >
              {v.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
