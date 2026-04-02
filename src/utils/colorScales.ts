/** Color scale utilities for conditional formatting */

export function numericHeatmap(value: number, min: number, max: number): string {
  if (value == null || isNaN(value)) return 'transparent';
  const range = max - min;
  if (range === 0) return 'rgba(100, 149, 237, 0.15)';

  const t = Math.max(0, Math.min(1, (value - min) / range));

  // Blue (cold) → transparent (mid) → Red (hot)
  if (t < 0.5) {
    const s = 1 - t * 2; // 1..0
    return `rgba(66, 133, 244, ${(s * 0.25).toFixed(3)})`;
  }
  const s = (t - 0.5) * 2; // 0..1
  return `rgba(234, 67, 53, ${(s * 0.25).toFixed(3)})`;
}

export function booleanColor(value: any): string {
  if (value === true || value === 1) {
    return 'rgba(52, 168, 83, 0.7)';  // Green
  }
  if (value === false || value === 0) {
    return 'rgba(66, 133, 244, 0.7)';  // Blue
  }
  return 'rgba(128, 128, 128, 0.3)';  // Gray for null
}
