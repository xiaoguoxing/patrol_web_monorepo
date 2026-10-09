interface CardPositionOptions {
  viewportWidth: number;
  viewportHeight: number;
  cardWidth: number;
  cardHeight: number;
  panelRight: number;
  point?: { x: number; y: number };
}

// Prefer the point's right side, flip to its left at the edge, then keep the card inside the map.
export function getCardPosition(options: CardPositionOptions) {
  const { viewportWidth, viewportHeight, cardWidth, cardHeight, panelRight, point } = options;
  const margin = 16;
  const gap = 32;
  const maxX = Math.max(margin, viewportWidth - cardWidth - margin);
  const minX = maxX >= panelRight ? panelRight : margin;
  const maxY = Math.max(margin, viewportHeight - cardHeight - margin);
  const minY = Math.min(72, maxY);
  const x = point?.x ?? (minX + maxX + cardWidth) / 2;
  const y = point?.y ?? viewportHeight / 2;
  const desiredX = x + gap + cardWidth <= viewportWidth - margin ? x + gap : x - cardWidth - gap;
  return {
    left: Math.min(Math.max(desiredX, minX), maxX),
    top: Math.min(Math.max(y - cardHeight / 2, minY), maxY),
  };
}
