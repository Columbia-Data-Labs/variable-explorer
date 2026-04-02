/** Canvas-based mini histogram rendering for column headers */

import { INumericHistogram, ICategoricalHistogram, IBooleanHistogram } from '../comm/protocol';

type HistogramData = INumericHistogram | ICategoricalHistogram | IBooleanHistogram;

export function drawHistogram(canvas: HTMLCanvasElement, data: HistogramData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  switch (data.type) {
    case 'numeric':
      drawNumericHistogram(ctx, w, h, data);
      break;
    case 'categorical':
      drawCategoricalHistogram(ctx, w, h, data);
      break;
    case 'boolean':
      drawBooleanBar(ctx, w, h, data);
      break;
  }
}

function drawNumericHistogram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: INumericHistogram
): void {
  const { counts } = data;
  if (counts.length === 0) return;

  const maxCount = Math.max(...counts);
  if (maxCount === 0) return;

  const barWidth = w / counts.length;
  const padding = 1;

  // Get computed style for theming
  const style = getComputedStyle(document.documentElement);
  const barColor = style.getPropertyValue('--jp-brand-color1').trim() || '#1976d2';

  for (let i = 0; i < counts.length; i++) {
    const barHeight = (counts[i] / maxCount) * (h - 2);
    const x = i * barWidth + padding / 2;
    const y = h - barHeight - 1;

    ctx.fillStyle = barColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y, barWidth - padding, barHeight);
  }
  ctx.globalAlpha = 1.0;
}

function drawCategoricalHistogram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ICategoricalHistogram
): void {
  const { counts } = data;
  if (counts.length === 0) return;

  const maxCount = Math.max(...counts);
  if (maxCount === 0) return;

  const barHeight = h / Math.min(counts.length, 8);
  const padding = 1;

  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
    '#c62828', '#00838f', '#4e342e', '#546e7a'
  ];

  for (let i = 0; i < Math.min(counts.length, 8); i++) {
    const barWidth = (counts[i] / maxCount) * (w - 2);
    const y = i * barHeight + padding / 2;

    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.6;
    ctx.fillRect(1, y, barWidth, barHeight - padding);
  }
  ctx.globalAlpha = 1.0;
}

function drawBooleanBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: IBooleanHistogram
): void {
  const total = data.trueCount + data.falseCount + data.nullCount;
  if (total === 0) return;

  const trueWidth = (data.trueCount / total) * w;
  const falseWidth = (data.falseCount / total) * w;

  const barY = h * 0.2;
  const barH = h * 0.6;

  // True (green)
  ctx.fillStyle = 'rgba(52, 168, 83, 0.7)';
  ctx.fillRect(0, barY, trueWidth, barH);

  // False (blue)
  ctx.fillStyle = 'rgba(66, 133, 244, 0.7)';
  ctx.fillRect(trueWidth, barY, falseWidth, barH);

  // Null (gray)
  if (data.nullCount > 0) {
    ctx.fillStyle = 'rgba(128, 128, 128, 0.4)';
    ctx.fillRect(trueWidth + falseWidth, barY, w - trueWidth - falseWidth, barH);
  }
}
