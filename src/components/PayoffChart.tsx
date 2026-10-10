import { useMemo, useState, useRef, useCallback } from 'react';
import type { StrategyLeg, PayoffPoint } from '@/types';
import { generatePayoffCurve, strategyPayoff, getStrikePrices } from '@/lib/calcEngine';
import { formatINRCompact } from '@/lib/riskEngine';

interface PayoffChartProps {
  legs: StrategyLeg[];
  minPrice: number;
  maxPrice: number;
  spotPrice: number;
  selectedPrice: number;
  breakevens: number[];
  showIndividualLegs?: boolean;
  onPriceSelect?: (price: number) => void;
  height?: number;
}

export function PayoffChart({
  legs,
  minPrice,
  maxPrice,
  spotPrice,
  selectedPrice,
  breakevens,
  showIndividualLegs = false,
  onPriceSelect,
  height = 420,
}: PayoffChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPoint, setHoverPoint] = useState<{ price: number; pnl: number; legPnls: number[] } | null>(null);

  const width = 900;
  const margin = { top: 30, right: 50, bottom: 50, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const curve = useMemo(
    () => generatePayoffCurve(legs, minPrice, maxPrice, 300),
    [legs, minPrice, maxPrice]
  );

  const strikes = useMemo(() => getStrikePrices(legs), [legs]);

  // Compute y range from curve data, but ensure we include 0
  const { yMin, yMax } = useMemo(() => {
    if (curve.length === 0) return { yMin: -100, yMax: 100 };
    const pnls = curve.map((p) => p.pnl);
    let min = Math.min(...pnls, 0);
    let max = Math.max(...pnls, 0);
    // Add padding
    const range = max - min;
    if (range === 0) {
      min -= 100;
      max += 100;
    } else {
      min -= range * 0.15;
      max += range * 0.15;
    }
    return { yMin: min, yMax: max };
  }, [curve]);

  const xScale = useCallback(
    (price: number) => margin.left + ((price - minPrice) / (maxPrice - minPrice)) * plotW,
    [minPrice, maxPrice, margin.left, plotW]
  );

  const yScale = useCallback(
    (pnl: number) => margin.top + plotH - ((pnl - yMin) / (yMax - yMin)) * plotH,
    [yMin, yMax, margin.top, plotH]
  );

  // Build the main payoff path
  const mainPath = useMemo(() => {
    if (curve.length === 0) return '';
    return curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.price).toFixed(2)} ${yScale(p.pnl).toFixed(2)}`)
      .join(' ');
  }, [curve, xScale, yScale]);

  // Profit area path (where pnl > 0)
  const profitAreaPath = useMemo(() => {
    if (curve.length === 0) return '';
    const zeroY = yScale(0);
    const parts: string[] = [];
    let inProfit = false;
    let segmentStart = 0;

    for (let i = 0; i < curve.length; i++) {
      const isProfit = curve[i].pnl > 0;
      if (isProfit && !inProfit) {
        inProfit = true;
        segmentStart = i;
      } else if (!isProfit && inProfit) {
        inProfit = false;
        const seg = curve.slice(segmentStart, i + 1);
        parts.push(buildAreaPath(seg, zeroY, xScale, yScale));
      }
    }
    if (inProfit) {
      const seg = curve.slice(segmentStart);
      parts.push(buildAreaPath(seg, zeroY, xScale, yScale));
    }
    return parts.join(' ');
  }, [curve, xScale, yScale]);

  // Loss area path (where pnl < 0)
  const lossAreaPath = useMemo(() => {
    if (curve.length === 0) return '';
    const zeroY = yScale(0);
    const parts: string[] = [];
    let inLoss = false;
    let segmentStart = 0;

    for (let i = 0; i < curve.length; i++) {
      const isLoss = curve[i].pnl < 0;
      if (isLoss && !inLoss) {
        inLoss = true;
        segmentStart = i;
      } else if (!isLoss && inLoss) {
        inLoss = false;
        const seg = curve.slice(segmentStart, i + 1);
        parts.push(buildAreaPath(seg, zeroY, xScale, yScale));
      }
    }
    if (inLoss) {
      const seg = curve.slice(segmentStart);
      parts.push(buildAreaPath(seg, zeroY, xScale, yScale));
    }
    return parts.join(' ');
  }, [curve, xScale, yScale]);

  // Individual leg curves
  const legCurves = useMemo(() => {
    if (!showIndividualLegs || legs.length === 0) return [];
    return legs.map((leg, legIdx) => {
      const points = curve.map((p) => ({
        price: p.price,
        pnl: p.legPnls[legIdx],
      }));
      const path = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.price).toFixed(2)} ${yScale(p.pnl).toFixed(2)}`)
        .join(' ');
      return { legIdx, path, leg };
    });
  }, [showIndividualLegs, legs, curve, xScale, yScale]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 6;
    for (let i = 0; i <= count; i++) {
      ticks.push(yMin + ((yMax - yMin) * i) / count);
    }
    return ticks;
  }, [yMin, yMax]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 8;
    for (let i = 0; i <= count; i++) {
      ticks.push(minPrice + ((maxPrice - minPrice) * i) / count);
    }
    return ticks;
  }, [minPrice, maxPrice]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || curve.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = width / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      // Convert x to price
      if (x < margin.left || x > margin.left + plotW) {
        setHoverPoint(null);
        return;
      }
      const price = minPrice + ((x - margin.left) / plotW) * (maxPrice - minPrice);
      const { total, legPnls } = strategyPayoff(legs, price);
      setHoverPoint({ price, pnl: total, legPnls });
    },
    [curve, minPrice, maxPrice, margin.left, plotW, legs]
  );

  const handleClick = useCallback(() => {
    if (hoverPoint && onPriceSelect) {
      onPriceSelect(hoverPoint.price);
    }
  }, [hoverPoint, onPriceSelect]);

  const handleMouseLeave = useCallback(() => setHoverPoint(null), []);

  const legColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (legs.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200" style={{ height }}>
        <p className="text-slate-400 text-sm">Add a position to see the payoff chart</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: onPriceSelect ? 'crosshair' : 'default' }}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`ygrid-${i}`}>
            <line
              x1={margin.left}
              y1={yScale(tick)}
              x2={margin.left + plotW}
              y2={yScale(tick)}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? '' : '4 4'}
            />
            <text
              x={margin.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-500"
            >
              {formatINRCompact(tick)}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {xTicks.map((tick, i) => (
          <g key={`xtick-${i}`}>
            <line
              x1={xScale(tick)}
              y1={margin.top}
              x2={xScale(tick)}
              y2={margin.top + plotH}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={xScale(tick)}
              y={margin.top + plotH + 18}
              textAnchor="middle"
              className="text-[10px] fill-slate-500"
            >
              {tick.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Profit area */}
        {profitAreaPath && <path d={profitAreaPath} fill="rgba(34, 197, 94, 0.12)" />}

        {/* Loss area */}
        {lossAreaPath && <path d={lossAreaPath} fill="rgba(239, 68, 68, 0.12)" />}

        {/* Zero line */}
        <line
          x1={margin.left}
          y1={yScale(0)}
          x2={margin.left + plotW}
          y2={yScale(0)}
          stroke="#64748b"
          strokeWidth={1.5}
        />

        {/* Individual leg curves */}
        {legCurves.map((lc) => (
          <path
            key={`leg-${lc.legIdx}`}
            d={lc.path}
            fill="none"
            stroke={legColors[lc.legIdx % legColors.length]}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.6}
          />
        ))}

        {/* Main payoff curve */}
        <path
          d={mainPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Strike markers */}
        {strikes.map((strike, i) => (
          <g key={`strike-${i}`}>
            <line
              x1={xScale(strike)}
              y1={margin.top}
              x2={xScale(strike)}
              y2={margin.top + plotH}
              stroke="#6366f1"
              strokeDasharray="3 3"
              opacity={0.7}
            />
            <text
              x={xScale(strike)}
              y={margin.top - 6}
              textAnchor="middle"
              className="text-[9px] fill-indigo-600 font-medium"
            >
              K={strike.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Spot price marker */}
        {spotPrice >= minPrice && spotPrice <= maxPrice && (
          <g>
            <line
              x1={xScale(spotPrice)}
              y1={margin.top}
              x2={xScale(spotPrice)}
              y2={margin.top + plotH}
              stroke="#0891b2"
              strokeWidth={1.5}
            />
            <circle cx={xScale(spotPrice)} cy={margin.top - 4} r={4} fill="#0891b2" />
            <text
              x={xScale(spotPrice)}
              y={margin.top - 10}
              textAnchor="middle"
              className="text-[9px] fill-cyan-700 font-medium"
            >
              Spot {spotPrice.toFixed(0)}
            </text>
          </g>
        )}

        {/* Breakeven markers */}
        {breakevens.map((be, i) => {
          if (be < minPrice || be > maxPrice) return null;
          return (
            <g key={`be-${i}`}>
              <line
                x1={xScale(be)}
                y1={yScale(0) - 6}
                x2={xScale(be)}
                y2={yScale(0) + 6}
                stroke="#f59e0b"
                strokeWidth={2.5}
              />
              <text
                x={xScale(be)}
                y={yScale(0) + 20}
                textAnchor="middle"
                className="text-[9px] fill-amber-600 font-medium"
              >
                BE={be.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Selected price marker */}
        {selectedPrice >= minPrice && selectedPrice <= maxPrice && (
          <g>
            <line
              x1={xScale(selectedPrice)}
              y1={margin.top}
              x2={xScale(selectedPrice)}
              y2={margin.top + plotH}
              stroke="#2563EB"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            <circle
              cx={xScale(selectedPrice)}
              cy={yScale(strategyPayoff(legs, selectedPrice).total)}
              r={5}
              fill="#2563EB"
              stroke="white"
              strokeWidth={2}
            />
          </g>
        )}

        {/* Hover tooltip */}
        {hoverPoint && (
          <g>
            <line
              x1={xScale(hoverPoint.price)}
              y1={margin.top}
              x2={xScale(hoverPoint.price)}
              y2={margin.top + plotH}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={xScale(hoverPoint.price)}
              cy={yScale(hoverPoint.pnl)}
              r={5}
              fill={hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444'}
              stroke="white"
              strokeWidth={2}
            />
          </g>
        )}

        {/* Axis labels */}
        <text
          x={margin.left + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[11px] fill-slate-600 font-medium"
        >
          Underlying Price at Expiry
        </text>
        <text
          x={16}
          y={margin.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 16, ${margin.top + plotH / 2})`}
          className="text-[11px] fill-slate-600 font-medium"
        >
          Profit / Loss (INR)
        </text>
      </svg>

      {/* Tooltip overlay */}
      {hoverPoint && (
        <div
          className="absolute bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs pointer-events-none z-10"
          style={{
            left: `${(xScale(hoverPoint.price) / width) * 100}%`,
            top: `${(yScale(hoverPoint.pnl) / height) * 100}%`,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <div className="font-semibold text-slate-800">
            Price: ₹{hoverPoint.price.toFixed(2)}
          </div>
          <div className={hoverPoint.pnl >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            P&L: {formatINRCompact(hoverPoint.pnl)}
          </div>
          {showIndividualLegs && hoverPoint.legPnls.length > 1 && (
            <div className="mt-1 pt-1 border-t border-slate-100 space-y-0.5">
              {hoverPoint.legPnls.map((lp, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: legColors[i % legColors.length] }}
                  />
                  <span className="text-slate-500">Leg {i + 1}:</span>
                  <span className={lp >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatINRCompact(lp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildAreaPath(
  segment: PayoffPoint[],
  zeroY: number,
  xScale: (p: number) => number,
  yScale: (p: number) => number
): string {
  if (segment.length === 0) return '';
  const top = segment
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.price).toFixed(2)} ${yScale(p.pnl).toFixed(2)}`)
    .join(' ');
  const last = segment[segment.length - 1];
  const first = segment[0];
  return `${top} L ${xScale(last.price).toFixed(2)} ${zeroY.toFixed(2)} L ${xScale(first.price).toFixed(2)} ${zeroY.toFixed(2)} Z`;
}
