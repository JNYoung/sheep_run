import type { GridCoord, LevelDefinition } from "../game/types";

export interface IsoLayout {
  width: number;
  height: number;
  dpr: number;
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
  scale: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export function createIsoLayout(canvas: HTMLCanvasElement, level: LevelDefinition): IsoLayout {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const baseTileWidth = 104;
  const baseTileHeight = 58;
  const unscaledBoardWidth = (level.width + level.height) * baseTileWidth * 0.5;
  const unscaledBoardHeight = (level.width + level.height) * baseTileHeight * 0.5;
  const availableWidth = width * 0.86;
  const availableHeight = height * (width < 720 ? 0.46 : 0.58);
  const scale = clamp(Math.min(availableWidth / unscaledBoardWidth, availableHeight / unscaledBoardHeight), 0.66, 1.18);
  const tileWidth = baseTileWidth * scale;
  const tileHeight = baseTileHeight * scale;
  const boardHeight = (level.width + level.height) * tileHeight * 0.5;

  return {
    width,
    height,
    dpr,
    tileWidth,
    tileHeight,
    originX: width * 0.5,
    originY: Math.max(height * 0.26, height * 0.5 - boardHeight * 0.55),
    scale,
  };
}

export function gridToScreen(layout: IsoLayout, coord: GridCoord): ScreenPoint {
  return {
    x: layout.originX + (coord.x - coord.y) * layout.tileWidth * 0.5,
    y: layout.originY + (coord.x + coord.y) * layout.tileHeight * 0.5,
  };
}

export function diamondPoints(layout: IsoLayout, center: ScreenPoint, inset = 1): ScreenPoint[] {
  const halfW = layout.tileWidth * 0.5 * inset;
  const halfH = layout.tileHeight * 0.5 * inset;
  return [
    { x: center.x, y: center.y - halfH },
    { x: center.x + halfW, y: center.y },
    { x: center.x, y: center.y + halfH },
    { x: center.x - halfW, y: center.y },
  ];
}

export function pointInDiamond(layout: IsoLayout, point: ScreenPoint, center: ScreenPoint, widthScale = 1, heightScale = 1): boolean {
  const dx = Math.abs(point.x - center.x) / (layout.tileWidth * 0.5 * widthScale);
  const dy = Math.abs(point.y - center.y) / (layout.tileHeight * 0.5 * heightScale);
  return dx + dy <= 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
