import { getWaveColor } from "./beerStyleColors";

/**
 * Wind waves + paper grain for the tap menu cards.
 * Uses a wide viewBox offset by tap position so waves flow continuously
 * across all 4 cards.
 */
export function TapWindBackground({
  styleName,
  estimatedColor,
  tapNumber,
}: {
  styleName: string;
  estimatedColor: number | undefined;
  tapNumber: string;
}) {
  const [baseHue, baseSat, baseLightness] = getWaveColor(
    styleName,
    estimatedColor,
  );
  const tapIndex = (parseInt(tapNumber) || 1) - 1;

  // Total width spans all 4 cards; each card shows a 420px slice
  const totalWidth = 1680; // 420 * 4
  const offsetX = tapIndex * 420;

  // Generate waves that span the full width (seeded consistently across all taps)
  const waves = Array.from({ length: 4 }, (_, i) => {
    const amplitude = 14 + i * 4;
    const frequency = 0.004 + i * 0.001;
    const yOffset = 60 + i * 95;
    const phase = i * 1.2;
    return { amplitude, frequency, yOffset, phase };
  });

  const paths = waves.map((wave, i) => {
    const points = [];
    for (let x = offsetX; x <= offsetX + 420; x += 5) {
      const baseY =
        wave.yOffset +
        Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
        Math.sin(x * wave.frequency * 1.7 + wave.phase * 2) *
          (wave.amplitude * 0.4);
      const t = x / totalWidth;
      const thickness =
        (6 + i * 3) * (0.4 + Math.sin(t * Math.PI * 2 + wave.phase) * 0.6);
      points.push({
        x: Math.round((x - offsetX) * 10) / 10,
        baseY: Math.round(baseY * 10) / 10,
        thickness: Math.round(thickness * 10) / 10,
      });
    }

    let d = `M ${points[0].x} ${points[0].baseY - points[0].thickness}`;
    for (let j = 1; j < points.length; j++) {
      d += ` L ${points[j].x} ${points[j].baseY - points[j].thickness}`;
    }
    for (let j = points.length - 1; j >= 0; j--) {
      d += ` L ${points[j].x} ${points[j].baseY + points[j].thickness}`;
    }
    d += " Z";

    return (
      <path
        key={`wave-${i}`}
        d={d}
        fill={`hsla(${baseHue}, ${baseSat}%, ${baseLightness}%, ${0.18 - i * 0.03})`}
        stroke="none"
      />
    );
  });

  // Paper grain
  const grainDots = Array.from({ length: 200 }, (_, i) => {
    const hash = (s: number) => {
      let t = (s + 0x6d2b79f5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const base = tapIndex * 7919 + i;
    const x = hash(base);
    const y = hash(base + 100003);
    const size = hash(base + 200003);
    return (
      <circle
        key={`grain-${i}`}
        cx={Math.round(x * 4200) / 10}
        cy={Math.round(y * 4500) / 10}
        r={Math.round((0.5 + size * 1) * 10) / 10}
        fill="#000"
        opacity={Math.round((0.05 + size * 0.05) * 100) / 100}
      />
    );
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      viewBox="0 0 420 450"
      preserveAspectRatio="xMidYMid slice"
      suppressHydrationWarning
    >
      {grainDots}
      {paths}
    </svg>
  );
}

export default TapWindBackground;
