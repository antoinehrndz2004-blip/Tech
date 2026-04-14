import { T } from "../../theme";
import type { MonthStat } from "../../types";

/** Revenue vs expenses area chart. Pure SVG, no dependencies. */
export function AreaChart({ data }: { data: MonthStat[] }) {
  const W = 500;
  const H = 220;
  const pad = 40;
  const cw = W - pad * 2;
  const ch = H - pad - 20;

  const mx =
    Math.max(...data.map((v) => Math.max(v.revenue, v.expenses))) * 1.15;

  const gx = (i: number) => pad + i * (cw / (data.length - 1));
  const gy = (v: number) => pad + ch - (v / mx) * ch;

  const rp = data.map((v, i) => `${gx(i)},${gy(v.revenue)}`).join(" ");
  const ep = data.map((v, i) => `${gx(i)},${gy(v.expenses)}`).join(" ");
  const ra = `${rp} ${gx(data.length - 1)},${gy(0)} ${gx(0)},${gy(0)}`;
  const ea = `${ep} ${gx(data.length - 1)},${gy(0)} ${gx(0)},${gy(0)}`;

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const gv = (mx * i) / 4;
    gridLines.push(
      <line
        key={"g" + i}
        x1={pad}
        y1={gy(gv)}
        x2={W - pad}
        y2={gy(gv)}
        stroke={T.gb}
        strokeDasharray="3 3"
      />,
    );
    gridLines.push(
      <text
        key={"gt" + i}
        x={pad - 8}
        y={gy(gv) + 4}
        fill={T.td}
        fontSize={10}
        textAnchor="end"
        fontFamily="'IBM Plex Mono'"
      >
        €{(gv / 1000).toFixed(0)}k
      </text>,
    );
  }

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.em} stopOpacity={0.25} />
          <stop offset="100%" stopColor={T.em} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.ro} stopOpacity={0.25} />
          <stop offset="100%" stopColor={T.ro} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridLines}
      <polygon points={ra} fill="url(#gr1)" />
      <polyline points={rp} fill="none" stroke={T.em} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={ea} fill="url(#gr2)" />
      <polyline points={ep} fill="none" stroke={T.ro} strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((v, i) => (
        <g key={"d" + i}>
          <circle cx={gx(i)} cy={gy(v.revenue)} r={3.5} fill={T.em} />
          <circle cx={gx(i)} cy={gy(v.expenses)} r={3.5} fill={T.ro} />
          <text
            x={gx(i)}
            y={H - 8}
            fill={T.td}
            fontSize={11}
            textAnchor="middle"
            fontFamily="'IBM Plex Mono'"
          >
            {v.month}
          </text>
        </g>
      ))}
      <g transform={`translate(${W - pad - 120}, 12)`}>
        <circle cx={0} cy={0} r={4} fill={T.em} />
        <text x={8} y={4} fill={T.ts} fontSize={11}>
          Revenue
        </text>
        <circle cx={70} cy={0} r={4} fill={T.ro} />
        <text x={78} y={4} fill={T.ts} fontSize={11}>
          Expenses
        </text>
      </g>
    </svg>
  );
}
