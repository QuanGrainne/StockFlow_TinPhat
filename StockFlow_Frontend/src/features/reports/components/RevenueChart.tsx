'use client';

// Biểu đồ đường doanh thu thuần và lợi nhuận gộp theo ngày – SVG thuần, không thêm thư viện.
// Một trục tiền (cùng đơn vị), có chú giải, đường tham chiếu 0 và tooltip theo vị trí con trỏ.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyRevenuePoint } from '../types';
import { formatMoney, formatMoneyShort } from '../utils/reportFormat';

const SERIES = [
  { key: 'netRevenue' as const, label: 'Doanh thu thuần', color: '#0071BA' },
  { key: 'grossProfit' as const, label: 'Lợi nhuận gộp', color: '#E07B00' },
];

const HEIGHT = 260;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 64 };

/** Các mốc trục tung "đẹp" (bội của 1, 2, 5 × 10^n), luôn chứa 0 */
function niceTicks(min: number, max: number, count = 5): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (lo === hi) return [0, 1];
  const rawStep = (hi - lo) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function RevenueChart({ points }: { points: DailyRevenuePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = Math.max(120, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { ticks, yMin, yMax } = useMemo(() => {
    const values = points.flatMap((p) => [p.netRevenue, p.grossProfit]);
    const t = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
    return { ticks: t, yMin: t[0], yMax: t[t.length - 1] };
  }, [points]);

  const x = (i: number) => (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const paths = SERIES.map((s) => ({
    ...s,
    d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join(' '),
  }));

  // Nhãn trục hoành: tối đa ~7 mốc, luôn có ngày đầu và ngày cuối
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const labelIndexes = points.map((_, i) => i).filter((i) => i % labelEvery === 0);
  const last = points.length - 1;
  if (last > 0 && labelIndexes[labelIndexes.length - 1] !== last) {
    // Mốc cuối quá gần mốc trước thì thay mốc trước bằng ngày cuối để nhãn không chồng nhau
    if (last - labelIndexes[labelIndexes.length - 1] < labelEvery / 2) labelIndexes.pop();
    labelIndexes.push(last);
  }
  const xLabels = labelIndexes.map((i) => ({ i, text: shortDate(points[i].date) }));

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = points.length <= 1 ? 0 : Math.round((px / rect.width) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeft = hoverIndex !== null ? MARGIN.left + x(hoverIndex) : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Biểu đồ doanh thu thuần và lợi nhuận gộp theo ngày"
          className="block"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={0}
                  x2={plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? '#94a3b8' : '#eef2f6'}
                  strokeWidth={1}
                />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8c8c8c">
                  {formatMoneyShort(t)}
                </text>
              </g>
            ))}
            {xLabels.map(({ i, text }) => (
              <text
                key={i}
                x={x(i)}
                y={plotH + 18}
                textAnchor={points.length <= 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                fontSize={11}
                fill="#8c8c8c"
              >
                {text}
              </text>
            ))}
            {paths.map((s) => (
              <path
                key={s.key}
                d={s.d}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {points.length === 1 &&
              SERIES.map((s) => (
                <circle key={s.key} cx={x(0)} cy={y(points[0][s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
              ))}
            {hovered && hoverIndex !== null && (
              <g pointerEvents="none">
                <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={0} y2={plotH} stroke="#94a3b8" strokeDasharray="3 3" />
                {SERIES.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(hoverIndex)}
                    cy={y(hovered[s.key])}
                    r={4}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
            <rect
              x={0}
              y={0}
              width={plotW}
              height={plotH}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </g>
        </svg>
        {hovered && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[190px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={
              tooltipLeft > width / 2
                ? { right: width - tooltipLeft + 12 }
                : { left: tooltipLeft + 12 }
            }
          >
            <div className="mb-1 font-semibold text-slate-800">{shortDate(hovered.date)}/{hovered.date.slice(0, 4)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-medium text-slate-800">{formatMoney(hovered[s.key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
