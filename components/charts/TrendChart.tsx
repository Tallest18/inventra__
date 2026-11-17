// components/charts/TrendChart.tsx
//
// Responsive line chart for phones (and web), drawn with react-native-svg.
//
// Built for small screens:
//  - width follows its container (onLayout), so it fits any phone/tablet/web
//  - x labels are shortened ("Week 45 2026" -> "Wk 45") and thinned so they
//    never collide; first and last always show
//  - y axis: 4 "nice" ticks with compact money (₦286k, ₦1.1M), no raw 286000
//  - no number on every point: tap or drag across the chart and the legend
//    row above it shows the exact values for that point (defaults to latest)
//  - monotone curves, so the line never swings above/below the real values
import React, { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

export interface TrendSeries {
  name: string;
  color: string;
  data: number[];
  /** Light area under the line (use for at most one series). */
  area?: boolean;
}

interface Props {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  /** Formats values for the readout; axis uses compact money. */
  formatValue?: (n: number) => string;
}

const FONT = "DMSans_400Regular";
const AXIS_INK = "#8A94A6";
const GRID = "#E6EAF2";
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };
const MIN_LABEL_GAP = 52; // px each x label needs to stay readable

// ─── formatting ──────────────────────────────────────────────────────────────

export const compactNaira = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}₦${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}₦${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}₦${trim(abs / 1e3)}k`;
  return `${sign}₦${Math.round(abs)}`;
};
const trim = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, ""));

const fullNaira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** "Week 45 2026" -> "Wk 45", "Sep 2026" -> "Sep", "2026-11-16" -> "16 Nov". */
export const shortLabel = (label: string): string => {
  const week = /^week\s+(\d+)/i.exec(label);
  if (week) return `Wk ${week[1]}`;
  const monthYear = /^([A-Za-z]{3,})\s+\d{4}$/.exec(label);
  if (monthYear) return monthYear[1].slice(0, 3);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
  }
  return label;
};

// ─── scales ──────────────────────────────────────────────────────────────────

/** 0-based "nice" ticks (1/2/2.5/5 x 10^n), about `count` of them. */
const niceTicks = (max: number, count = 4): number[] => {
  if (max <= 0) return [0];
  const raw = max / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001 || ticks.length < 2; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
};

/** Monotone cubic path (Fritsch–Carlson): smooth, never overshoots the data. */
const monotonePath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const n = pts.length;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const s = 3 / Math.sqrt(h); t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
};

// ─── component ───────────────────────────────────────────────────────────────

export const TrendChart: React.FC<Props> = ({
  labels,
  series,
  height = 200,
  formatValue = fullNaira,
}) => {
  const [width, setWidth] = useState(0);
  const count = labels.length;
  const [selected, setSelected] = useState<number | null>(null);
  // Default to the latest point; also after a period switch shrinks the data.
  const active = selected != null && selected < count ? selected : count - 1;

  const geo = useMemo(() => {
    if (!width || count === 0) return null;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const max = Math.max(0, ...series.flatMap((s) => s.data.slice(0, count)));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1] || 1;
    const x = (i: number) => PAD.left + (count === 1 ? innerW / 2 : (innerW * i) / (count - 1));
    const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
    // Show every k-th label so each gets MIN_LABEL_GAP px; always keep the last.
    const step = Math.max(1, Math.ceil((MIN_LABEL_GAP * count) / innerW));
    const shown = new Set<number>();
    for (let i = 0; i < count; i += step) shown.add(i);
    shown.add(count - 1);
    // Drop a label that would sit on top of the always-shown last one.
    for (const i of shown) if (i !== count - 1 && x(count - 1) - x(i) < MIN_LABEL_GAP) shown.delete(i);
    return { innerW, innerH, ticks, x, y, shown, baseline: PAD.top + innerH };
  }, [width, height, count, series]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Tap / drag anywhere on the plot -> nearest point.
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const pick = (e: GestureResponderEvent) => {
    const geo = geoRef.current;
    if (!geo || count === 0) return;
    const px = e.nativeEvent.locationX;
    let best = 0;
    for (let i = 1; i < count; i++) if (Math.abs(geo.x(i) - px) < Math.abs(geo.x(best) - px)) best = i;
    setSelected(best);
  };

  // Taps select a point; only mostly-horizontal drags are claimed, so a
  // vertical swipe over the chart still scrolls the page.
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy) + 4,
      onPanResponderGrant: (e) => pickRef.current(e),
      onPanResponderMove: (e) => pickRef.current(e),
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  return (
    <View>
      {/* Legend doubles as the readout for the selected point. */}
      <View style={styles.readout}>
        <Text style={styles.readoutLabel} numberOfLines={1}>
          {count ? labels[active] : "No data"}
        </Text>
        <View style={styles.legendRow}>
          {series.map((s) => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendName}>{s.name}</Text>
              <Text style={styles.legendValue} numberOfLines={1}>
                {count ? formatValue(s.data[active] ?? 0) : "–"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{ height }}
        onLayout={onLayout}
        {...pan.panHandlers}
        accessible
        accessibilityLabel={series
          .map((s) => `${s.name}: ${labels.map((l, i) => `${l} ${formatValue(s.data[i] ?? 0)}`).join(", ")}`)
          .join(". ")}
      >
        {geo && (
          // Touches go to the container, not the SVG shapes, so locationX is
          // always measured from the chart's left edge (matters on web).
          <View pointerEvents="none">
          <Svg width={width} height={height}>
            <Defs>
              {series.map((s, si) => (
                <LinearGradient key={si} id={`area-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.16} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>

            {/* Recessive grid + compact y labels */}
            {geo.ticks.map((t) => (
              <React.Fragment key={t}>
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.y(t)}
                  y2={geo.y(t)}
                  stroke={GRID}
                  strokeWidth={1}
                  strokeDasharray={t === 0 ? undefined : "3 4"}
                />
                <SvgText
                  x={PAD.left - 8}
                  y={geo.y(t) + 4}
                  fontSize={11}
                  fontFamily={FONT}
                  fill={AXIS_INK}
                  textAnchor="end"
                >
                  {compactNaira(t)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* x labels: short, thinned, never overlapping */}
            {labels.map((l, i) =>
              geo.shown.has(i) ? (
                <SvgText
                  key={i}
                  x={geo.x(i)}
                  y={height - 6}
                  fontSize={11}
                  fontFamily={FONT}
                  fill={i === active ? "#1C1C1C" : AXIS_INK}
                  textAnchor={count === 1 ? "middle" : i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
                >
                  {shortLabel(l)}
                </SvgText>
              ) : null,
            )}

            {/* Crosshair at the selected point */}
            <Line
              x1={geo.x(active)}
              x2={geo.x(active)}
              y1={PAD.top}
              y2={geo.baseline}
              stroke="#C9D2E3"
              strokeWidth={1}
            />

            {series.map((s, si) => {
              const pts = s.data.slice(0, count).map((v, i) => ({ x: geo.x(i), y: geo.y(v) }));
              const line = monotonePath(pts);
              return (
                <React.Fragment key={s.name}>
                  {s.area && pts.length > 1 && (
                    <Path
                      d={`${line} L${pts[pts.length - 1].x},${geo.baseline} L${pts[0].x},${geo.baseline} Z`}
                      fill={`url(#area-${si})`}
                    />
                  )}
                  <Path d={line} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </React.Fragment>
              );
            })}

            {/* Markers only on the selected point (surface ring keeps them distinct). */}
            {series.map((s) =>
              s.data[active] != null ? (
                <Circle
                  key={s.name}
                  cx={geo.x(active)}
                  cy={geo.y(s.data[active])}
                  r={5}
                  fill={s.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </Svg>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  readout: { marginBottom: 8 },
  readoutLabel: {
    fontSize: 12,
    color: "#667085",
    fontFamily: "DMSans_500Medium",
    marginBottom: 6,
  },
  legendRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendName: { fontSize: 13, color: "#667085", fontFamily: "DMSans_400Regular", marginRight: 6 },
  legendValue: { fontSize: 15, color: "#1C1C1C", fontFamily: "DMSans_700Bold", flexShrink: 1 },
});

export default TrendChart;
