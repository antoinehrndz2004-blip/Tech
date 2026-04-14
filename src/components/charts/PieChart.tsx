import { PC, T } from "../../theme";

export interface PieSlice {
  name: string;
  value: number;
}

/** Donut chart, pure SVG. */
export function PieChart({ data }: { data: PieSlice[] }) {
  const size = 160;
  const total = data.reduce((s, v) => s + v.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const ir = 38;
  let a = -Math.PI / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      {data.map((v, i) => {
        const an = (v.value / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(a);
        const y1 = cy + r * Math.sin(a);
        const ix1 = cx + ir * Math.cos(a);
        const iy1 = cy + ir * Math.sin(a);
        a += an;
        const x2 = cx + r * Math.cos(a);
        const y2 = cy + r * Math.sin(a);
        const ix2 = cx + ir * Math.cos(a);
        const iy2 = cy + ir * Math.sin(a);
        const large = an > Math.PI ? 1 : 0;
        return (
          <path
            key={"s" + i}
            d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`}
            fill={PC[i % PC.length]}
            stroke={T.bg}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
