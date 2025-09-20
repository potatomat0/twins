import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Text, useWindowDimensions, ScrollView } from 'react-native';
import { Svg, G, Path, Line, Text as SvgText, Circle } from 'react-native-svg';
import { toRgb, toRgba } from '@themes/index';
import { useTheme } from '@context/ThemeContext';
import { FACTOR_EXPLANATIONS, FACTOR_ORDER } from '@data/factors';
// Placeholder grid + polygon. d3 dependencies are declared but not strictly required for this stub.

type Datum = { label: string; score: number };

type Props = {
  data: Datum[]; // 0-100 scale
  size?: number;
  color?: string; // triplet 'r g b' for polygon
  iconColor?: string; // triplet for info icons (defaults to accent)
  closeColor?: string; // triplet for close button (defaults to danger)
  tooltipMaxHeight?: number;
};

const toRads = (deg: number) => (deg * Math.PI) / 180;

const RadarChart: React.FC<Props> = ({ data, size, color = '99 102 241', iconColor = '34 211 238', closeColor = '239 68 68', tooltipMaxHeight = 300 }) => {
  const { theme } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const computedSize = Math.max(200, Math.floor((size ?? windowWidth * 0.95))); // ~95% width
  const [active, setActive] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);
  const cx = computedSize / 2;
  const cy = computedSize / 2;
  const radius = computedSize * 0.30; // slightly larger
  const angleSlice = (Math.PI * 2) / data.length;

  const rScale = (v: number) => (v / 100) * radius;

  const points = data.map((d, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    const r = rScale(d.score);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
    .join(' ') + ' Z';

  const factorIndexByLabel = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d, i) => (map[d.label] = i));
    return map;
  }, [data]);

  const handleSvgPress = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent || {};
    const dx = locationX - cx;
    const dy = locationY - cy;
    const ang = Math.atan2(dy, dx); // -PI..PI, 0 at +X
    // Convert so that index 0 starts at top (-PI/2)
    let idx = Math.round(((ang + Math.PI / 2) / (2 * Math.PI)) * data.length);
    idx = ((idx % data.length) + data.length) % data.length;
    setActive(idx);
    const label = data[idx].label;
    const title = FACTOR_ORDER.find((f) => f === label) ?? label;
    const text = FACTOR_EXPLANATIONS[title] ?? '';
    setOverlay({ title, text });
  };

  return (
    <View style={{ width: computedSize, height: computedSize, position: 'relative', alignSelf: 'center' }}>
      <Svg width={computedSize} height={computedSize} onPress={handleSvgPress}>
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((f, idx) => (
          <Circle
            key={idx}
            cx={cx}
            cy={cy}
            r={radius * f}
            stroke={toRgba(theme.colors['--border'], 0.06 + idx * 0.03)}
            fill="none"
          />
        ))}
        {/* axes + labels + info icons */}
        {data.map((d, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          const lx = cx + (radius + 14) * Math.cos(angle);
          const ly = cy + (radius + 14) * Math.sin(angle);
          // Place icon further out and slightly tangential to avoid label overlap
          const radial = radius + 36;
          const tangentOffset = 10; // px
          const tangentAngle = angle + Math.PI / 2;
          const ix = cx + radial * Math.cos(angle) + tangentOffset * Math.cos(tangentAngle);
          const iy = cy + radial * Math.sin(angle) + tangentOffset * Math.sin(tangentAngle);
          const isActive = active === i;
          return (
            <G key={i}>
              <Line x1={cx} y1={cy} x2={x2} y2={y2} stroke={toRgba(theme.colors['--border'], 0.12)} />
              <SvgText x={lx} y={ly} fill={toRgb(theme.colors['--text-secondary'])} fontSize={10} textAnchor="middle">
                {d.label}
              </SvgText>
              {/* Glowing info icon */}
              <G
                onPress={() => {
                  setActive(i);
                  const label = d.label;
                  const title = FACTOR_ORDER.find((f) => f === label) ?? label;
                  const text = FACTOR_EXPLANATIONS[title] ?? '';
                  setOverlay({ title, text });
                }}
              >
                <Circle cx={ix} cy={iy} r={12} fill={toRgba(iconColor, isActive ? 0.35 : 0.2)} />
                {isActive && <Circle cx={ix} cy={iy} r={18} fill={toRgba(iconColor, 0.12)} />}
                <SvgText x={ix} y={iy + 3} fill="#fff" fontSize={12} textAnchor="middle">i</SvgText>
              </G>
            </G>
          );
        })}
        {/* data */}
        <Path d={path} fill={toRgba(color, 0.35)} stroke={toRgb(color)} strokeWidth={2} />
      </Svg>

      {overlay && (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject as any} onPress={() => setOverlay(null)} />
          { /* Tooltip container with capped height */ }
          <View style={[
            styles.tooltip,
            {
              maxHeight: Math.min(tooltipMaxHeight, windowHeight * 0.9),
              width: Math.min(0.94 * windowWidth, 760),
              backgroundColor: toRgb(theme.colors['--surface']),
              borderColor: toRgba(theme.colors['--border'], 0.08),
            },
          ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setOverlay(null)}
              style={[styles.closeBtn, { backgroundColor: toRgb(closeColor) }]}
            >
              <Text style={styles.closeTxt}>×</Text>
            </Pressable>
            { /* Make inner scroll area fixed so it always scrolls when content is longer */ }
            <ScrollView
              style={{ height: Math.max(0, Math.min(tooltipMaxHeight, windowHeight * 0.9) - 56) }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator
            >
              <Text style={[styles.tipTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{overlay.title}</Text>
              <Text style={[styles.tipText, { color: toRgb(theme.colors['--text-secondary']) }]}>{overlay.text}</Text>
              <Text style={[styles.tipHint, { color: toRgb(theme.colors['--text-secondary']) }]}>Tap outside or × to dismiss</Text>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default RadarChart;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  tooltip: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  closeTxt: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 20 },
  tipTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  tipText: { fontSize: 14, lineHeight: 20 },
  tipHint: { fontSize: 12, marginTop: 12, textAlign: 'right' },
});
