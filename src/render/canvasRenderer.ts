import { directionBetween } from "../game/rules";
import type { Direction, GameViewState, GridCoord, LevelDefinition, ObstacleDefinition, SheepDefinition, TapIntent, TapTarget } from "../game/types";
import { createIsoLayout, diamondPoints, gridToScreen, pointInDiamond, type IsoLayout, type ScreenPoint } from "./iso";

type HitTarget = {
  type: TapTarget;
  coord: GridCoord | null;
  sheepId?: string;
  depth: number;
  contains: (point: ScreenPoint) => boolean;
};

type Drawable = {
  depth: number;
  draw: () => void;
};

const ASSET_BASE = "/assets/v1";
const ASSET_EXT = "webp";

const assetPaths = {
  barn: `${ASSET_BASE}/structures/barn.${ASSET_EXT}`,
  boardEdgeCorner: `${ASSET_BASE}/scene/board_edge_corner.${ASSET_EXT}`,
  contactShadow: `${ASSET_BASE}/scene/contact_shadow.${ASSET_EXT}`,
  fenceSegment: `${ASSET_BASE}/obstacles/fence_segment.${ASSET_EXT}`,
  flowerPatch: `${ASSET_BASE}/obstacles/flower_patch.${ASSET_EXT}`,
  gateSegment: `${ASSET_BASE}/obstacles/gate_segment.${ASSET_EXT}`,
  grassCornerFlowers: `${ASSET_BASE}/scene/grass_corner_flowers.${ASSET_EXT}`,
  grassTileDark: `${ASSET_BASE}/scene/grass_tile_dark.${ASSET_EXT}`,
  grassTileLight: `${ASSET_BASE}/scene/grass_tile_light.${ASSET_EXT}`,
  hayBale: `${ASSET_BASE}/obstacles/hay_bale.${ASSET_EXT}`,
  hayBucket: `${ASSET_BASE}/obstacles/hay_bucket.${ASSET_EXT}`,
  hedge: `${ASSET_BASE}/obstacles/hedge.${ASSET_EXT}`,
  pastureTree: `${ASSET_BASE}/obstacles/pasture_tree.${ASSET_EXT}`,
  shrubFlower: `${ASSET_BASE}/obstacles/shrub_flower.${ASSET_EXT}`,
  successSparkle: `${ASSET_BASE}/scene/success_sparkle.${ASSET_EXT}`,
  wrongTapRipple: `${ASSET_BASE}/scene/wrong_tap_ripple.${ASSET_EXT}`,
  sheepIdleNorth: `${ASSET_BASE}/sprites/sheep/sheep_idle_north.${ASSET_EXT}`,
  sheepIdleEast: `${ASSET_BASE}/sprites/sheep/sheep_idle_east.${ASSET_EXT}`,
  sheepIdleSouth: `${ASSET_BASE}/sprites/sheep/sheep_idle_south.${ASSET_EXT}`,
  sheepIdleWest: `${ASSET_BASE}/sprites/sheep/sheep_idle_west.${ASSET_EXT}`,
  sheepRunNorth: `${ASSET_BASE}/sprites/sheep/sheep_run_north.${ASSET_EXT}`,
  sheepRunEast: `${ASSET_BASE}/sprites/sheep/sheep_run_east.${ASSET_EXT}`,
  sheepRunSouth: `${ASSET_BASE}/sprites/sheep/sheep_run_south.${ASSET_EXT}`,
  sheepRunWest: `${ASSET_BASE}/sprites/sheep/sheep_run_west.${ASSET_EXT}`,
} as const;

type AssetKey = keyof typeof assetPaths;

type DrawImageOptions = {
  alpha?: number;
  anchorX?: number;
  anchorY?: number;
  height?: number;
  rotation?: number;
  width?: number;
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly assets = this.loadAssets();
  private hitTargets: HitTarget[] = [];
  private layout: IsoLayout | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }

    this.ctx = ctx;
  }

  private loadAssets(): Record<AssetKey, HTMLImageElement> {
    const assets = {} as Record<AssetKey, HTMLImageElement>;
    for (const [key, src] of Object.entries(assetPaths) as [AssetKey, string][]) {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      assets[key] = image;
    }

    return assets;
  }

  private asset(key: AssetKey): HTMLImageElement | null {
    const image = this.assets[key];
    return image.complete && image.naturalWidth > 0 ? image : null;
  }

  render(view: GameViewState): void {
    const layout = this.prepareCanvas(view.level);
    this.layout = layout;
    this.hitTargets = [];

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    this.drawBackground(layout, view.level, view.now);
    this.drawPenPark(layout, view.level);
    this.drawBoardBase(layout, view.level);
    this.drawTiles(layout, view.level);

    const drawables: Drawable[] = [];
    const hintIds = new Set(view.hintSheepIds ?? []);
    for (const obstacle of view.level.obstacles) {
      drawables.push({
        depth: obstacle.x + obstacle.y + 0.1,
        draw: () => this.drawObstacle(layout, obstacle),
      });
    }

    drawables.push({
      depth: view.level.pen.x + view.level.pen.y + 0.35,
      draw: () => this.drawSheepPen(layout, view.level.pen),
    });

    for (const sheep of view.sheep) {
      if (view.move?.sheepId === sheep.id) {
        continue;
      }

      drawables.push({
        depth: sheep.x + sheep.y + 0.5,
        draw: () => this.drawSheep(layout, sheep, false, view.now, hintIds.has(sheep.id)),
      });
    }

    const movingSheep = this.resolveMovingSheep(view);
    if (movingSheep) {
      drawables.push({
        depth: movingSheep.x + movingSheep.y + 0.75,
        draw: () => this.drawSheep(layout, movingSheep, true, view.now, false),
      });
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const drawable of drawables) {
      drawable.draw();
    }

    this.drawFeedback(layout, view);
    this.drawForegroundDecor(layout, view.level);
    ctx.restore();
  }

  pick(clientX: number, clientY: number): TapIntent {
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    const sorted = [...this.hitTargets].sort((a, b) => b.depth - a.depth);
    for (const target of sorted) {
      if (target.contains(point)) {
        return {
          target: target.type,
          coord: target.coord,
          sheepId: target.sheepId,
        };
      }
    }

    return {
      target: "none",
      coord: null,
    };
  }

  private prepareCanvas(level: LevelDefinition): IsoLayout {
    const layout = createIsoLayout(this.canvas, level);
    const targetWidth = Math.round(layout.width * layout.dpr);
    const targetHeight = Math.round(layout.height * layout.dpr);
    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    return layout;
  }

  private resolveMovingSheep(view: GameViewState): SheepDefinition | null {
    if (!view.move || view.move.path.length === 0) {
      return null;
    }

    const elapsed = Math.max(0, view.now - view.move.startedAt);
    const segmentFloat = elapsed / view.move.msPerTile;
    const segmentIndex = Math.min(view.move.path.length - 1, Math.floor(segmentFloat));
    const localT = Math.min(1, segmentFloat - segmentIndex);
    const from = segmentIndex === 0 ? view.move.from : view.move.path[segmentIndex - 1];
    const to = view.move.path[segmentIndex];
    const source = view.sheep.find((sheep) => sheep.id === view.move?.sheepId);

    return {
      id: view.move.sheepId,
      x: from.x + (to.x - from.x) * this.ease(localT),
      y: from.y + (to.y - from.y) * this.ease(localT),
      facing: directionBetween(from, to),
      color: source?.color ?? "cream",
    };
  }

  private drawBackground(layout: IsoLayout, level: LevelDefinition, now: number): void {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, layout.height);
    sky.addColorStop(0, "#a9ddf4");
    sky.addColorStop(0.44, "#d9f3d7");
    sky.addColorStop(1, "#79c96a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, layout.width, layout.height);

    this.drawSun(layout.width * 0.82, layout.height * 0.14, 34 * layout.scale);
    this.drawCloud(layout.width * 0.14, layout.height * 0.18 + Math.sin(now * 0.0004) * 4, layout.scale * 0.9);
    this.drawCloud(layout.width * 0.68, layout.height * 0.21 + Math.cos(now * 0.00035) * 3, layout.scale * 0.7);

    this.ctx.fillStyle = "#77cf6d";
    this.ctx.beginPath();
    this.ctx.ellipse(layout.width * 0.23, layout.height * 0.6, layout.width * 0.42, layout.height * 0.16, -0.12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "#57b85e";
    this.ctx.beginPath();
    this.ctx.ellipse(layout.width * 0.78, layout.height * 0.62, layout.width * 0.48, layout.height * 0.18, 0.08, 0, Math.PI * 2);
    this.ctx.fill();

    if (!this.drawAsset("pastureTree", layout.width * 0.15, layout.height * 0.51, { width: 128 * layout.scale, anchorY: 1 })) {
      this.drawCandyTree(layout, layout.width * 0.15, layout.height * 0.46, 1.05);
    }
    this.drawAsset("shrubFlower", layout.width * 0.29, layout.height * 0.52, { width: 86 * layout.scale, anchorY: 1 });
    this.drawAsset("pastureTree", layout.width * 0.87, layout.height * 0.49, { width: 112 * layout.scale, anchorY: 1 });
    this.drawAsset("pastureTree", layout.width * 0.08, layout.height * 0.73, { width: 82 * layout.scale, anchorY: 1, alpha: 0.95 });
    this.drawAsset("pastureTree", layout.width * 0.94, layout.height * 0.73, { width: 78 * layout.scale, anchorY: 1, alpha: 0.95 });
    this.drawAsset("hayBucket", layout.width * 0.76, layout.height * 0.88, { width: 82 * layout.scale, anchorY: 1, alpha: 0.95 });

    const penAnchor = gridToScreen(layout, level.pen);
    if (!this.drawAsset("fenceSegment", penAnchor.x - 145 * layout.scale, penAnchor.y + 82 * layout.scale, { width: 126 * layout.scale, anchorY: 1, rotation: 0.08, alpha: 0.9 })) {
      this.drawFenceRun(layout, penAnchor.x - 176 * layout.scale, penAnchor.y + 76 * layout.scale, 0.74);
    }
    this.drawAsset("fenceSegment", penAnchor.x + 132 * layout.scale, penAnchor.y + 82 * layout.scale, { width: 126 * layout.scale, anchorY: 1, rotation: 0.08, alpha: 0.9 });
  }

  private drawPenPark(layout: IsoLayout, level: LevelDefinition): void {
    const center = gridToScreen(layout, level.pen);
    const ctx = this.ctx;
    const s = layout.scale;
    ctx.save();
    ctx.fillStyle = "rgba(255, 230, 146, 0.42)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 76 * s, 220 * s, 62 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(center.x - 98 * s, center.y + 78 * s);
    ctx.quadraticCurveTo(center.x, center.y + 122 * s, center.x + 98 * s, center.y + 78 * s);
    ctx.stroke();
    ctx.restore();
  }

  private drawBoardBase(layout: IsoLayout, level: LevelDefinition): void {
    const ctx = this.ctx;
    const topLeft = gridToScreen(layout, { x: 0, y: 0 });
    const bottomRight = gridToScreen(layout, { x: level.width - 1, y: level.height - 1 });
    const boardCenter = {
      x: (topLeft.x + bottomRight.x) * 0.5,
      y: (topLeft.y + bottomRight.y) * 0.5,
    };
    const baseWidth = (level.width + level.height) * layout.tileWidth * 0.53;
    const baseHeight = (level.width + level.height) * layout.tileHeight * 0.55;

    ctx.save();
    ctx.shadowColor = "rgba(36, 63, 33, 0.3)";
    ctx.shadowBlur = 28 * layout.scale;
    ctx.shadowOffsetY = 20 * layout.scale;
    this.fillDiamond(boardCenter, baseWidth, baseHeight, "#75b75c", "#e4f7c8");
    ctx.restore();
    this.fillDiamond({ x: boardCenter.x, y: boardCenter.y + 8 * layout.scale }, baseWidth * 0.96, baseHeight * 0.9, "#5c9f51", "rgba(255,255,255,0.28)");
  }

  private drawTiles(layout: IsoLayout, level: LevelDefinition): void {
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const coord = { x, y };
        const center = gridToScreen(layout, coord);
        const fill = (x + y) % 2 === 0 ? "#8fda68" : "#7fcb5d";
        const tileKey = (x + y) % 2 === 0 ? "grassTileLight" : "grassTileDark";
        if (!this.drawAsset(tileKey, center.x, center.y + layout.tileHeight * 0.58, { width: layout.tileWidth * 1.02, anchorY: 1 })) {
          this.fillPolygon(diamondPoints(layout, center, 0.94), fill, "rgba(255,255,255,0.52)");
          this.fillPolygon(diamondPoints(layout, { x: center.x, y: center.y + layout.tileHeight * 0.14 }, 0.9), "rgba(68,118,52,0.12)");
          this.drawGrassFlecks(layout, center, x, y);
        }
        this.hitTargets.push({
          type: "board",
          coord,
          depth: x + y,
          contains: (point) => pointInDiamond(layout, point, center, 0.94, 0.94),
        });
      }
    }
  }

  private drawObstacle(layout: IsoLayout, obstacle: ObstacleDefinition): void {
    const center = gridToScreen(layout, obstacle);
    const s = layout.obstacleScale;
    const hitS = Math.max(layout.scale * 0.58, s);
    this.drawShadow(center.x, center.y + 20 * s, 72 * s, 18 * s, 0.13);

    let drewAsset = false;
    if (obstacle.kind === "tree") {
      drewAsset = this.drawAsset("pastureTree", center.x, center.y + 48 * s, { width: 94 * s, anchorY: 1 });
    } else if (obstacle.kind === "hay") {
      drewAsset = this.drawAsset("hayBale", center.x, center.y + 36 * s, { width: 82 * s, anchorY: 1 });
    } else if (obstacle.kind === "flower") {
      drewAsset = this.drawAsset("shrubFlower", center.x, center.y + 34 * s, { width: 82 * s, anchorY: 1 });
    } else {
      drewAsset = this.drawAsset("fenceSegment", center.x, center.y + 32 * s, { width: 96 * s, anchorY: 1 });
    }

    if (!drewAsset) {
      if (obstacle.kind === "tree") {
        this.drawMiniTree(layout, center);
      } else if (obstacle.kind === "hay") {
        this.drawHay(layout, center);
      } else if (obstacle.kind === "flower") {
        this.drawFlowerPatch(layout, center);
      } else {
        this.drawFence(layout, center);
      }
    }

    this.hitTargets.push({
      type: "obstacle",
      coord: obstacle,
      depth: obstacle.x + obstacle.y + 0.4,
      contains: (point) => this.pointInRect(point, center.x, center.y - 18 * hitS, 78 * hitS, 72 * hitS),
    });
  }

  private drawSheepPen(layout: IsoLayout, pen: GridCoord): void {
    const ctx = this.ctx;
    const center = gridToScreen(layout, pen);
    const s = layout.scale;
    if (this.asset("barn")) {
      this.drawAsset("grassCornerFlowers", center.x, center.y + 106 * s, { width: 160 * s, anchorY: 1, alpha: 0.65 });
      this.drawShadow(center.x, center.y + 86 * s, 190 * s, 42 * s, 0.18);
      this.drawAsset("barn", center.x + 18 * s, center.y + 102 * s, { width: 230 * s, anchorY: 1 });
      this.hitTargets.push({
        type: "pen",
        coord: pen,
        depth: pen.x + pen.y + 0.55,
        contains: (point) => this.pointInRect(point, center.x, center.y + 36 * s, 216 * s, 168 * s),
      });
      return;
    }

    this.drawShadow(center.x, center.y + 42 * s, 184 * s, 36 * s, 0.18);

    ctx.save();
    ctx.translate(center.x, center.y + 12 * s);
    this.fillPolygon([
      { x: -88 * s, y: 8 * s },
      { x: 0, y: -36 * s },
      { x: 88 * s, y: 8 * s },
      { x: 0, y: 52 * s },
    ], "#fff2cf", "#ffffff");
    this.fillPolygon([
      { x: -72 * s, y: 8 * s },
      { x: 0, y: -26 * s },
      { x: 72 * s, y: 8 * s },
      { x: 0, y: 42 * s },
    ], "#f9c86a", "#fff4cc");
    ctx.strokeStyle = "#9a6f34";
    ctx.lineWidth = 9 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-58 * s, 0);
    ctx.lineTo(-58 * s, 50 * s);
    ctx.moveTo(-26 * s, -14 * s);
    ctx.lineTo(-26 * s, 58 * s);
    ctx.moveTo(26 * s, -14 * s);
    ctx.lineTo(26 * s, 58 * s);
    ctx.moveTo(58 * s, 0);
    ctx.lineTo(58 * s, 50 * s);
    ctx.stroke();
    ctx.strokeStyle = "#b98642";
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(-82 * s, 18 * s);
    ctx.quadraticCurveTo(0, 56 * s, 82 * s, 18 * s);
    ctx.moveTo(-78 * s, 36 * s);
    ctx.quadraticCurveTo(0, 76 * s, 78 * s, 36 * s);
    ctx.stroke();
    ctx.fillStyle = "#fff8df";
    this.roundRect(-45 * s, -68 * s, 90 * s, 32 * s, 15 * s);
    ctx.fill();
    ctx.strokeStyle = "#e8bd73";
    ctx.lineWidth = 4 * s;
    ctx.stroke();
    ctx.fillStyle = "#6d4b2b";
    ctx.beginPath();
    ctx.ellipse(-10 * s, -52 * s, 9 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(7 * s, -52 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.arc(17 * s, -52 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.hitTargets.push({
      type: "pen",
      coord: pen,
      depth: pen.x + pen.y + 0.55,
      contains: (point) => this.pointInRect(point, center.x, center.y + 12 * s, 184 * s, 120 * s),
    });
  }

  private drawSheep(layout: IsoLayout, sheep: SheepDefinition, moving: boolean, now: number, highlighted: boolean): void {
    const ctx = this.ctx;
    const center = gridToScreen(layout, sheep);
    const s = layout.entityScale;
    const hitS = Math.max(layout.scale * 0.56, s);
    const bounce = moving ? Math.sin(now * 0.024) * 5 * s : Math.sin(now * 0.003) * 2 * s;
    if (highlighted) {
      this.drawRescueGlow(layout, center, now);
    }

    if (this.drawSheepAsset(layout, sheep, moving, center, bounce)) {
      this.hitTargets.push({
        type: "sheep",
        coord: { x: Math.round(sheep.x), y: Math.round(sheep.y) },
        sheepId: sheep.id,
        depth: sheep.x + sheep.y + 0.75,
        contains: (point) => this.pointInRect(point, center.x, center.y - 26 * hitS, 104 * hitS, 96 * hitS),
      });
      return;
    }

    const phase = moving ? Math.sin(now * 0.026) : Math.sin(now * 0.004);
    const bodyY = center.y - 34 * s + bounce;
    const headOffset = this.headOffsetFor(sheep.facing, s);
    const palette = this.sheepPalette(sheep.color ?? "cream");

    this.drawShadow(center.x, center.y + 22 * s, 72 * s, 22 * s, 0.22);

    ctx.save();
    ctx.translate(center.x, bodyY);
    if (moving) {
      ctx.scale(1 + Math.abs(phase) * 0.03, 1 - Math.abs(phase) * 0.025);
    }

    const wool = palette.wool;
    const woolShade = palette.shade;
    const face = palette.face;
    const leg = "#3f2a21";

    for (const puff of [
      [-20, 2, 18],
      [-6, -8, 21],
      [12, -3, 19],
      [24, 7, 15],
      [-1, 10, 22],
    ]) {
      ctx.fillStyle = woolShade;
      ctx.beginPath();
      ctx.ellipse((puff[0] + 2) * s, (puff[1] + 3) * s, puff[2] * s, puff[2] * 0.78 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = wool;
      ctx.beginPath();
      ctx.ellipse(puff[0] * s, puff[1] * s, puff[2] * s, puff[2] * 0.78 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawLegs(s, leg, phase, moving);

    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(headOffset.x, headOffset.y, 16 * s, 14 * s, headOffset.rotation, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b77d55";
    ctx.beginPath();
    ctx.ellipse(headOffset.x - 7 * s, headOffset.y - 12 * s, 6 * s, 3.5 * s, -0.55, 0, Math.PI * 2);
    ctx.ellipse(headOffset.x + 7 * s, headOffset.y - 12 * s, 6 * s, 3.5 * s, 0.55, 0, Math.PI * 2);
    ctx.fill();

    const eyeShift = sheep.facing === "west" ? -4 : sheep.facing === "east" ? 4 : 0;
    ctx.fillStyle = "#2b211d";
    ctx.beginPath();
    ctx.arc(headOffset.x - 4 * s + eyeShift * s * 0.3, headOffset.y - 2 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.arc(headOffset.x + 6 * s + eyeShift * s * 0.3, headOffset.y - 2 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();

    this.drawDirectionBadge(ctx, sheep.facing, s);
    ctx.restore();

    this.hitTargets.push({
      type: "sheep",
      coord: { x: Math.round(sheep.x), y: Math.round(sheep.y) },
      sheepId: sheep.id,
      depth: sheep.x + sheep.y + 0.75,
      contains: (point) => this.pointInRect(point, center.x, center.y - 38 * hitS, 88 * hitS, 86 * hitS),
    });
  }

  private drawFeedback(layout: IsoLayout, view: GameViewState): void {
    if (!view.feedback) {
      return;
    }

    const age = view.now - view.feedback.startedAt;
    const alpha = Math.max(0, 1 - age / 780);
    if (alpha <= 0) {
      return;
    }

    if (view.feedback.path?.length) {
      this.drawFeedbackPath(layout, view.feedback.path, view.feedback.kind, alpha, age);
    }

    const center = view.feedback.coord ? gridToScreen(layout, view.feedback.coord) : { x: layout.width * 0.5, y: layout.height * 0.54 };
    const ctx = this.ctx;
    if (this.drawAsset("wrongTapRipple", center.x, center.y + 8 * layout.scale, {
      width: (64 + age * 0.018) * layout.scale,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha,
    })) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff3f3f";
    ctx.lineWidth = 5 * layout.scale;
    ctx.beginPath();
    ctx.arc(center.x, center.y - 18 * layout.scale, (28 + age * 0.045) * layout.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFeedbackPath(layout: IsoLayout, path: GridCoord[], kind: "fail" | "warn", alpha: number, age: number): void {
    const ctx = this.ctx;
    const color = kind === "warn" ? "#ffe45d" : "#ff574d";
    const halo = kind === "warn" ? "rgba(255, 248, 177, 0.48)" : "rgba(255, 97, 82, 0.38)";
    const points = path.map((coord) => gridToScreen(layout, coord));
    if (points.length === 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = halo;
    ctx.lineWidth = Math.max(5, 13 * layout.scale);
    ctx.setLineDash([12 * layout.scale, 8 * layout.scale]);
    ctx.lineDashOffset = -age * 0.04;
    ctx.beginPath();
    points.forEach((point, index) => {
      const y = point.y - 8 * layout.scale;
      if (index === 0) {
        ctx.moveTo(point.x, y);
      } else {
        ctx.lineTo(point.x, y);
      }
    });
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, 5 * layout.scale);
    ctx.beginPath();
    points.forEach((point, index) => {
      const y = point.y - 8 * layout.scale;
      if (index === 0) {
        ctx.moveTo(point.x, y);
      } else {
        ctx.lineTo(point.x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    const last = points[points.length - 1];
    ctx.fillStyle = kind === "warn" ? "rgba(255, 236, 92, 0.28)" : "rgba(255, 84, 72, 0.24)";
    ctx.beginPath();
    ctx.ellipse(last.x, last.y - 8 * layout.scale, 36 * layout.scale, 22 * layout.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawForegroundDecor(layout: IsoLayout, level: LevelDefinition): void {
    const last = gridToScreen(layout, { x: level.width - 1, y: level.height - 1 });
    const s = layout.decorScale;
    const drewGate = this.drawAsset("gateSegment", last.x - 80 * s, last.y + 102 * s, { width: 98 * s, anchorY: 1, rotation: -0.05, alpha: 0.95 });
    this.drawAsset("flowerPatch", last.x + 22 * s, last.y + 105 * s, { width: 68 * s, anchorY: 1, alpha: 0.95 });
    if (!drewGate) {
      this.drawFencePost(layout, last.x - 90 * layout.scale, last.y + 74 * layout.scale);
      this.drawFencePost(layout, last.x - 38 * layout.scale, last.y + 92 * layout.scale);
      this.drawFencePost(layout, last.x + 16 * layout.scale, last.y + 104 * layout.scale);
    }
  }

  private drawSheepAsset(layout: IsoLayout, sheep: SheepDefinition, moving: boolean, center: ScreenPoint, bounce: number): boolean {
    const assetKey = this.sheepAssetKey(sheep.facing, moving);
    if (!this.asset(assetKey)) {
      return false;
    }

    const s = layout.entityScale;
    this.drawShadow(center.x, center.y + 26 * s, 76 * s, 21 * s, 0.2);
    this.drawAsset(assetKey, center.x, center.y + 36 * s + bounce, { height: 92 * s, anchorY: 0.95 });
    this.drawDirectionCue(layout, center, sheep.facing);
    return true;
  }

  private sheepAssetKey(facing: Direction, moving: boolean): AssetKey {
    const prefix = moving ? "sheepRun" : "sheepIdle";
    switch (facing) {
      case "north":
        return `${prefix}North` as AssetKey;
      case "east":
        return `${prefix}East` as AssetKey;
      case "south":
        return `${prefix}South` as AssetKey;
      case "west":
      default:
        return `${prefix}West` as AssetKey;
    }
  }

  private drawDirectionCue(layout: IsoLayout, center: ScreenPoint, facing: Direction): void {
    const ctx = this.ctx;
    const s = layout.entityScale;
    const badgeRadius = Math.max(9, Math.min(24, 17 * Math.max(s, layout.scale * 0.72)));
    const offsetY = -42 * s;
    ctx.save();
    ctx.translate(center.x, center.y + offsetY);
    this.drawDirectionGlyph(ctx, facing, badgeRadius, "#2469c8", "#fff8d2", "#5a351e");
    ctx.restore();
  }

  private drawRescueGlow(layout: IsoLayout, center: ScreenPoint, now: number): void {
    const ctx = this.ctx;
    const s = layout.entityScale;
    const pulse = 0.5 + Math.sin(now * 0.006) * 0.5;
    const width = (58 + pulse * 18) * s;
    if (this.drawAsset("successSparkle", center.x, center.y - 22 * s, {
      width,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 0.84,
      rotation: Math.sin(now * 0.002) * 0.12,
    })) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.58 + pulse * 0.22;
    ctx.strokeStyle = "#ffe55a";
    ctx.lineWidth = Math.max(2, 5 * s);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y - 16 * s, 44 * s, 28 * s, -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private sheepPalette(color: SheepDefinition["color"]): { wool: string; shade: string; face: string } {
    switch (color) {
      case "pink":
        return { wool: "#ffd4e6", shade: "#efabc9", face: "#c98664" };
      case "mint":
        return { wool: "#cbf7d1", shade: "#97dba8", face: "#ba835f" };
      case "blue":
        return { wool: "#cfe7ff", shade: "#9fc4ec", face: "#b98464" };
      case "yellow":
        return { wool: "#fff2a9", shade: "#e8c86f", face: "#bf855f" };
      case "cream":
      default:
        return { wool: "#fff0c8", shade: "#ead8b7", face: "#c79063" };
    }
  }

  private drawDirectionBadge(ctx: CanvasRenderingContext2D, facing: Direction, s: number): void {
    ctx.save();
    ctx.translate(0, -38 * s);
    this.drawDirectionGlyph(ctx, facing, 13 * s, "#2469c8", "#fff8d2", "#5a351e");
    ctx.restore();
  }

  private drawDirectionGlyph(
    ctx: CanvasRenderingContext2D,
    facing: Direction,
    radius: number,
    arrowFill: string,
    badgeFill: string,
    badgeStroke: string,
  ): void {
    ctx.save();
    ctx.shadowColor = "rgba(55, 38, 18, 0.22)";
    ctx.shadowBlur = radius * 0.35;
    ctx.shadowOffsetY = radius * 0.16;
    ctx.fillStyle = badgeFill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = Math.max(2, radius * 0.16);
    ctx.strokeStyle = badgeStroke;
    ctx.stroke();
    ctx.rotate(this.directionRotation(facing));
    ctx.fillStyle = arrowFill;
    ctx.beginPath();
    ctx.moveTo(radius * 0.62, 0);
    ctx.lineTo(radius * 0.08, -radius * 0.44);
    ctx.lineTo(radius * 0.08, -radius * 0.18);
    ctx.lineTo(-radius * 0.52, -radius * 0.18);
    ctx.lineTo(-radius * 0.52, radius * 0.18);
    ctx.lineTo(radius * 0.08, radius * 0.18);
    ctx.lineTo(radius * 0.08, radius * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCandyTree(layout: IsoLayout, x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    const s = layout.scale * scale;
    this.drawShadow(x, y + 54 * s, 92 * s, 26 * s, 0.14);
    ctx.save();
    ctx.fillStyle = "#8d5e2e";
    this.roundRect(x - 12 * s, y + 4 * s, 24 * s, 62 * s, 9 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    this.roundRect(x - 7 * s, y + 10 * s, 4 * s, 42 * s, 3 * s);
    ctx.fill();
    const blobs = [
      [-32, -18, 31],
      [-12, -38, 37],
      [18, -30, 34],
      [34, -4, 30],
      [-10, -4, 38],
    ];
    for (const [bx, by, r] of blobs) {
      const gradient = ctx.createRadialGradient(x + (bx - 8) * s, y + (by - 10) * s, 4 * s, x + bx * s, y + by * s, r * s);
      gradient.addColorStop(0, "#d7f26d");
      gradient.addColorStop(0.55, "#9bd846");
      gradient.addColorStop(1, "#6fb334");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMiniTree(layout: IsoLayout, center: ScreenPoint): void {
    this.drawCandyTree(layout, center.x, center.y - 28 * layout.scale, 0.42);
  }

  private drawFenceRun(layout: IsoLayout, x: number, y: number, scale: number): void {
    const s = layout.scale * scale;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#f6e8be";
    ctx.lineWidth = 7 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 126 * s, y + 10 * s);
    ctx.stroke();
    ctx.strokeStyle = "#d4a968";
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      this.drawFencePost(layout, x + i * 42 * s, y - 2 * s + i * 3 * s);
    }
    ctx.restore();
  }

  private drawHay(layout: IsoLayout, center: ScreenPoint): void {
    const ctx = this.ctx;
    const s = layout.scale;
    this.drawShadow(center.x, center.y + 18 * s, 58 * s, 18 * s, 0.17);
    ctx.save();
    ctx.translate(center.x, center.y - 10 * s);
    this.fillPolygon([
      { x: -28 * s, y: -2 * s },
      { x: 0, y: -16 * s },
      { x: 30 * s, y: -2 * s },
      { x: 0, y: 14 * s },
    ], "#edbd43", "#fff0a8");
    this.fillPolygon([
      { x: -28 * s, y: -2 * s },
      { x: 0, y: 14 * s },
      { x: 0, y: 32 * s },
      { x: -28 * s, y: 15 * s },
    ], "#d79c31");
    this.fillPolygon([
      { x: 0, y: 14 * s },
      { x: 30 * s, y: -2 * s },
      { x: 30 * s, y: 15 * s },
      { x: 0, y: 32 * s },
    ], "#c98a29");
    ctx.restore();
  }

  private drawFence(layout: IsoLayout, center: ScreenPoint): void {
    const s = layout.scale;
    this.drawShadow(center.x, center.y + 18 * s, 76 * s, 16 * s, 0.16);
    this.drawFencePost(layout, center.x - 30 * s, center.y + 2 * s);
    this.drawFencePost(layout, center.x + 30 * s, center.y + 2 * s);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#8f612f";
    ctx.lineWidth = 8 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(center.x - 42 * s, center.y - 8 * s);
    ctx.lineTo(center.x + 42 * s, center.y + 8 * s);
    ctx.moveTo(center.x - 42 * s, center.y + 10 * s);
    ctx.lineTo(center.x + 42 * s, center.y + 26 * s);
    ctx.stroke();
    ctx.restore();
  }

  private drawFencePost(layout: IsoLayout, x: number, y: number): void {
    const ctx = this.ctx;
    const s = layout.scale;
    ctx.save();
    ctx.fillStyle = "#a8783e";
    this.roundRect(x - 6 * s, y - 38 * s, 12 * s, 44 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    this.roundRect(x - 4 * s, y - 36 * s, 3 * s, 34 * s, 2 * s);
    ctx.fill();
    ctx.restore();
  }

  private drawFlowerPatch(layout: IsoLayout, center: ScreenPoint): void {
    const ctx = this.ctx;
    const s = layout.scale;
    this.drawShadow(center.x, center.y + 11 * s, 48 * s, 13 * s, 0.12);
    const colors = ["#ff78a7", "#fff072", "#8c72ff", "#ffffff"];
    for (let i = 0; i < 8; i += 1) {
      const angle = i * 1.83;
      const x = center.x + Math.cos(angle) * (8 + (i % 3) * 7) * s;
      const y = center.y - 4 * s + Math.sin(angle) * (4 + (i % 2) * 4) * s;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4b8f45";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y + 4 * s);
      ctx.lineTo(x + 2 * s, y + 14 * s);
      ctx.stroke();
    }
  }

  private drawLegs(s: number, color: string, phase: number, moving: boolean): void {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5 * s;
    ctx.lineCap = "round";
    const swing = moving ? phase * 5 * s : 0;
    for (const leg of [
      [-20, 16, -swing],
      [-4, 19, swing],
      [12, 18, -swing],
      [26, 15, swing],
    ]) {
      ctx.beginPath();
      ctx.moveTo(leg[0] * s, leg[1] * s);
      ctx.lineTo(leg[0] * s + leg[2], (leg[1] + 16) * s);
      ctx.stroke();
    }
  }

  private headOffsetFor(facing: Direction, s: number): { x: number; y: number; rotation: number } {
    switch (facing) {
      case "north":
        return { x: -2 * s, y: -22 * s, rotation: 0 };
      case "south":
        return { x: 4 * s, y: 22 * s, rotation: 0 };
      case "west":
        return { x: -32 * s, y: 0, rotation: -0.08 };
      case "east":
      default:
        return { x: 34 * s, y: 0, rotation: 0.08 };
    }
  }

  private drawGrassFlecks(layout: IsoLayout, center: ScreenPoint, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = Math.max(1, 1.4 * layout.scale);
    for (let i = 0; i < 4; i += 1) {
      const px = center.x + (((x * 17 + y * 23 + i * 13) % 50) - 25) * layout.scale;
      const py = center.y + (((x * 29 + y * 11 + i * 19) % 24) - 12) * layout.scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 4 * layout.scale, py - 5 * layout.scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    for (const circle of [
      [-28, 6, 18],
      [-8, -4, 24],
      [18, 0, 20],
      [38, 7, 14],
    ]) {
      ctx.beginPath();
      ctx.arc(x + circle[0] * scale, y + circle[1] * scale, circle[2] * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSun(x: number, y: number, radius: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    gradient.addColorStop(0, "#fff6a8");
    gradient.addColorStop(1, "#ffc45d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawShadow(x: number, y: number, width: number, height: number, alpha: number): void {
    if (this.drawAsset("contactShadow", x, y, { width, height, alpha, anchorY: 0.5 })) {
      return;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(35, 58, 30, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawAsset(key: AssetKey, x: number, y: number, options: DrawImageOptions): boolean {
    const image = this.asset(key);
    if (!image) {
      return false;
    }

    const width = options.width ?? (options.height ? image.naturalWidth * (options.height / image.naturalHeight) : image.naturalWidth);
    const height = options.height ?? image.naturalHeight * (width / image.naturalWidth);
    const anchorX = options.anchorX ?? 0.5;
    const anchorY = options.anchorY ?? 1;
    const alpha = options.alpha ?? 1;
    const rotation = options.rotation ?? 0;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    ctx.drawImage(image, -width * anchorX, -height * anchorY, width, height);
    ctx.restore();
    return true;
  }

  private directionRotation(facing: Direction): number {
    switch (facing) {
      case "east":
        return Math.PI * 0.5;
      case "south":
        return Math.PI;
      case "west":
        return -Math.PI * 0.5;
      case "north":
      default:
        return 0;
    }
  }

  private fillDiamond(center: ScreenPoint, width: number, height: number, fill: string | CanvasGradient, stroke?: string): void {
    this.fillPolygon([
      { x: center.x, y: center.y - height * 0.5 },
      { x: center.x + width * 0.5, y: center.y },
      { x: center.x, y: center.y + height * 0.5 },
      { x: center.x - width * 0.5, y: center.y },
    ], fill, stroke);
  }

  private fillPolygon(points: ScreenPoint[], fill: string | CanvasGradient, stroke?: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const ctx = this.ctx;
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private pointInRect(point: ScreenPoint, centerX: number, centerY: number, width: number, height: number): boolean {
    return point.x >= centerX - width * 0.5 &&
      point.x <= centerX + width * 0.5 &&
      point.y >= centerY - height * 0.5 &&
      point.y <= centerY + height * 0.5;
  }

  private ease(t: number): number {
    return t * t * (3 - 2 * t);
  }
}
