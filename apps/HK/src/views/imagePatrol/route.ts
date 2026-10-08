import type { ImagePoint } from './types';

export interface CurveSegment {
  command: string;
}

export function curveSegment(
  start: ImagePoint,
  end: ImagePoint,
  index: number,
  imageWidth: number,
  imageHeight: number
): CurveSegment {
  const deltaX = end.pointX - start.pointX;
  const deltaY = end.pointY - start.pointY;
  const length = Math.hypot(deltaX, deltaY);
  const bend = Math.min(100, length * 0.15) * (index % 2 === 0 ? 1 : -1);
  const normalX = length ? -deltaY / length : 0;
  const normalY = length ? deltaX / length : 0;
  const controlX1 = Math.max(0, Math.min(imageWidth, start.pointX + deltaX / 3 + normalX * bend));
  const controlY1 = Math.max(0, Math.min(imageHeight, start.pointY + deltaY / 3 + normalY * bend));
  const controlX2 = Math.max(0, Math.min(imageWidth, start.pointX + (deltaX * 2) / 3 + normalX * bend));
  const controlY2 = Math.max(0, Math.min(imageHeight, start.pointY + (deltaY * 2) / 3 + normalY * bend));
  return {
    command: `C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${end.pointX} ${end.pointY}`,
  };
}

export function routePath(points: ImagePoint[], imageWidth: number, imageHeight: number, until = points.length - 1) {
  if (points.length < 2 || until < 1) return '';
  const lastSegment = Math.min(until, points.length - 1);
  const commands = [`M ${points[0].pointX} ${points[0].pointY}`];
  for (let index = 0; index < lastSegment; index += 1) {
    commands.push(curveSegment(points[index], points[index + 1], index, imageWidth, imageHeight).command);
  }
  return commands.join(' ');
}

export function segmentPath(
  start: ImagePoint | undefined,
  end: ImagePoint | undefined,
  index: number,
  imageWidth: number,
  imageHeight: number
) {
  if (!start || !end) return '';
  return `M ${start.pointX} ${start.pointY} ${curveSegment(start, end, index, imageWidth, imageHeight).command}`;
}
