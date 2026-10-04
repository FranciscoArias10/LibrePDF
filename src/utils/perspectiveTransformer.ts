import { CornerPoint, DocumentCorners } from '../types';

/**
 * Euclidean distance between two 2D points
 */
export function pointDistance(p1: CornerPoint, p2: CornerPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes destination width and height for a perspective crop,
 * preserving natural aspect ratio based on original image dimensions.
 */
export function computeWarpDimensions(
  corners: DocumentCorners,
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  // Convert normalized [0..1] to pixel coords
  const tl = { x: corners.tl.x * originalWidth, y: corners.tl.y * originalHeight };
  const tr = { x: corners.tr.x * originalWidth, y: corners.tr.y * originalHeight };
  const br = { x: corners.br.x * originalWidth, y: corners.br.y * originalHeight };
  const bl = { x: corners.bl.x * originalWidth, y: corners.bl.y * originalHeight };

  // Width: maximum of top and bottom edges
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  let destWidth = Math.max(widthTop, widthBottom);

  // Height: maximum of left and right edges
  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
  let destHeight = Math.max(heightLeft, heightRight);

  // Round to integer pixels
  destWidth = Math.round(destWidth);
  destHeight = Math.round(destHeight);

  // Ensure minimum dimensions
  destWidth = Math.max(100, destWidth);
  destHeight = Math.max(100, destHeight);

  // Bound to maximum 3200px to avoid GPU texture limits on mobile
  const maxDim = 3200;
  if (destWidth > maxDim || destHeight > maxDim) {
    const scale = Math.min(maxDim / destWidth, maxDim / destHeight);
    destWidth = Math.round(destWidth * scale);
    destHeight = Math.round(destHeight * scale);
  }

  return { width: destWidth, height: destHeight };
}

/**
 * Returns default rectangular inset corners (e.g. 5% margin)
 */
export function getDefaultCorners(margin: number = 0.05): DocumentCorners {
  return {
    tl: { x: margin, y: margin },
    tr: { x: 1 - margin, y: margin },
    br: { x: 1 - margin, y: 1 - margin },
    bl: { x: margin, y: 1 - margin },
  };
}

/**
 * Validates if 4 corners form a valid non-inverted convex polygon
 */
export function isValidQuad(corners: DocumentCorners): boolean {
  const { tl, tr, br, bl } = corners;

  // Cross product of 2 vectors
  const cross = (
    p1: CornerPoint,
    p2: CornerPoint,
    p3: CornerPoint
  ) => {
    return (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
  };

  const c1 = cross(tl, tr, br);
  const c2 = cross(tr, br, bl);
  const c3 = cross(br, bl, tl);
  const c4 = cross(bl, tl, tr);

  // All signs must match for a convex polygon
  const allPositive = c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0;
  const allNegative = c1 < 0 && c2 < 0 && c3 < 0 && c4 < 0;

  return allPositive || allNegative;
}
