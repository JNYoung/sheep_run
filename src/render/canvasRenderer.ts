import { directionBetween } from "../game/rules";
import type { Direction, GameViewState, GridCoord, LevelDefinition, ObstacleDefinition, TapIntent, TapTarget } from "../game/types";
import { createIsoLayout, diamondPoints, gridToScreen, pointInDiamond, type IsoLayout, type ScreenPoint } from "./iso";

type HitTarget = {
  type: TapTarget;
  coord: GridCoord | null;
  depth: number;
  contains: (point: ScreenPoint) => boolean;
};

type Drawable = {
  depth: number;
  draw: () => void;
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
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

  render(view: GameViewState): void {
    const layout = this.prepareCanvas(view.level);
    this.layout = layout;
    this.hitTargets = [];

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    this.drawBackground(layout, view.now);
    this.drawBoardBase(layout, view.level);
    this.drawTiles(layout, view.level);

    const drawables: Drawable[] = [];
    for (const obstacle of view.level.obstacles) {
      drawables.push({
        depth: obstacle.x + obstacle.y + 0.1,
        draw: () => this.drawObstacle(layout, obstacle),
      });
    }

    drawables.push({
      depth: view.level.barn.x + view.level.barn.y + 0.35,
      draw: () => this.drawBarn(layout, view.level.barn),
    });

    const sheepRender = this.resolveSheepRender(view);
    drawables.push({
      depth: sheepRender.coord.x + sheepRender.coord.y + 0.5,
      draw: () => this.drawSheep(layout, sheepRender.coord, sheepRender.facing, view.phase === "moving", view.now),
    });

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

  private resolveSheepRender(view: GameViewState): { coord: GridCoord; facing: Direction } {
    if (!view.move || view.move.path.length === 0) {
      return {
        coord: view.sheepCoord,
        facing: view.sheepFacing,
      };
    }

    const elapsed = Math.max(0, view.now - view.move.startedAt);
    const segmentFloat = elapsed / view.move.msPerTile;
    const segmentIndex = Math.min(view.move.path.length - 1, Math.floor(segmentFloat));
    const localT = Math.min(1, segmentFloat - segmentIndex);
    const from = segmentIndex === 0 ? view.sheepCoord : view.move.path[segmentIndex - 1];
    const to = view.move.path[segmentIndex];

    return {
      coord: {
        x: from.x + (to.x - from.x) * this.ease(localT),
        y: from.y + (to.y - from.y) * this.ease(localT),
      },
      facing: directionBetween(from, to),
    };
  }

  private drawBackground(layout: IsoLayout, now: number): void {
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

    this.ctx.fillStyle = "#6abf63";
    this.ctx.beginPath();
    this.ctx.ellipse(layout.width * 0.23, layout.height * 0.6, layout.width * 0.42, layout.height * 0.16, -0.12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "#58ad5a";
    this.ctx.beginPath();
    this.ctx.ellipse(layout.width * 0.78, layout.height * 0.62, layout.width * 0.48, layout.height * 0.18, 0.08, 0, Math.PI * 2);
    this.ctx.fill();
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
        this.fillPolygon(diamondPoints(layout, center, 0.94), fill, "rgba(255,255,255,0.52)");
        this.fillPolygon(diamondPoints(layout, { x: center.x, y: center.y + layout.tileHeight * 0.14 }, 0.9), "rgba(68,118,52,0.12)");
        this.drawGrassFlecks(layout, center, x, y);
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
    if (obstacle.kind === "hay") {
      this.drawHay(layout, center);
    } else if (obstacle.kind === "flower") {
      this.drawFlowerPatch(layout, center);
    } else {
      this.drawFence(layout, center);
    }

    this.hitTargets.push({
      type: "obstacle",
      coord: obstacle,
      depth: obstacle.x + obstacle.y + 0.4,
      contains: (point) => this.pointInRect(point, center.x, center.y - 18 * layout.scale, 78 * layout.scale, 72 * layout.scale),
    });
  }

  private drawBarn(layout: IsoLayout, barn: GridCoord): void {
    const ctx = this.ctx;
    const center = gridToScreen(layout, barn);
    const s = layout.scale;
    this.drawShadow(center.x, center.y + 28 * s, 94 * s, 28 * s, 0.2);

    ctx.save();
    ctx.translate(center.x, center.y - 38 * s);
    const wall = "#df4d3f";
    const wallSide = "#b73934";
    const roof = "#426f92";
    const roofLight = "#5f91b5";

    this.fillPolygon([
      { x: -46 * s, y: 10 * s },
      { x: 0, y: -14 * s },
      { x: 46 * s, y: 10 * s },
      { x: 0, y: 34 * s },
    ], "#8f2d2b");

    this.fillPolygon([
      { x: -42 * s, y: -18 * s },
      { x: 0, y: -42 * s },
      { x: 44 * s, y: -18 * s },
      { x: 0, y: 4 * s },
    ], roofLight, "#d7edf7");

    this.fillPolygon([
      { x: 0, y: 4 * s },
      { x: 44 * s, y: -18 * s },
      { x: 44 * s, y: 22 * s },
      { x: 0, y: 44 * s },
    ], roof, "rgba(255,255,255,0.28)");

    this.fillPolygon([
      { x: -36 * s, y: 0 },
      { x: 0, y: -18 * s },
      { x: 0, y: 44 * s },
      { x: -36 * s, y: 24 * s },
    ], wall, "rgba(255,255,255,0.26)");

    this.fillPolygon([
      { x: 0, y: -18 * s },
      { x: 36 * s, y: 0 },
      { x: 36 * s, y: 24 * s },
      { x: 0, y: 44 * s },
    ], wallSide, "rgba(255,255,255,0.16)");

    ctx.fillStyle = "#20150f";
    ctx.beginPath();
    ctx.ellipse(0, 28 * s, 16 * s, 20 * s, 0, Math.PI, 0);
    ctx.lineTo(16 * s, 28 * s);
    ctx.lineTo(16 * s, 44 * s);
    ctx.lineTo(-16 * s, 44 * s);
    ctx.lineTo(-16 * s, 28 * s);
    ctx.fill();

    ctx.fillStyle = "#ffe39d";
    this.roundRect(-17 * s, -18 * s, 34 * s, 14 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = "#5d3c25";
    ctx.beginPath();
    ctx.arc(0, -11 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.hitTargets.push({
      type: "barn",
      coord: barn,
      depth: barn.x + barn.y + 0.55,
      contains: (point) => this.pointInRect(point, center.x, center.y - 42 * s, 102 * s, 112 * s),
    });
  }

  private drawSheep(layout: IsoLayout, coord: GridCoord, facing: Direction, moving: boolean, now: number): void {
    const ctx = this.ctx;
    const center = gridToScreen(layout, coord);
    const s = layout.scale;
    const bounce = moving ? Math.sin(now * 0.024) * 5 * s : Math.sin(now * 0.003) * 2 * s;
    const phase = moving ? Math.sin(now * 0.026) : Math.sin(now * 0.004);
    const bodyY = center.y - 34 * s + bounce;
    const headOffset = this.headOffsetFor(facing, s);

    this.drawShadow(center.x, center.y + 22 * s, 72 * s, 22 * s, 0.22);

    ctx.save();
    ctx.translate(center.x, bodyY);
    if (moving) {
      ctx.scale(1 + Math.abs(phase) * 0.03, 1 - Math.abs(phase) * 0.025);
    }

    const wool = "#fff0c8";
    const woolShade = "#ead8b7";
    const face = "#c79063";
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

    const eyeShift = facing === "west" ? -4 : facing === "east" ? 4 : 0;
    ctx.fillStyle = "#2b211d";
    ctx.beginPath();
    ctx.arc(headOffset.x - 4 * s + eyeShift * s * 0.3, headOffset.y - 2 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.arc(headOffset.x + 6 * s + eyeShift * s * 0.3, headOffset.y - 2 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.hitTargets.push({
      type: "sheep",
      coord: { x: Math.round(coord.x), y: Math.round(coord.y) },
      depth: coord.x + coord.y + 0.75,
      contains: (point) => this.pointInRect(point, center.x, center.y - 38 * s, 88 * s, 86 * s),
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

    const center = view.feedback.coord ? gridToScreen(layout, view.feedback.coord) : { x: layout.width * 0.5, y: layout.height * 0.54 };
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff3f3f";
    ctx.lineWidth = 5 * layout.scale;
    ctx.beginPath();
    ctx.arc(center.x, center.y - 18 * layout.scale, (28 + age * 0.045) * layout.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawForegroundDecor(layout: IsoLayout, level: LevelDefinition): void {
    const last = gridToScreen(layout, { x: level.width - 1, y: level.height - 1 });
    this.drawFencePost(layout, last.x - 90 * layout.scale, last.y + 74 * layout.scale);
    this.drawFencePost(layout, last.x - 38 * layout.scale, last.y + 92 * layout.scale);
    this.drawFencePost(layout, last.x + 16 * layout.scale, last.y + 104 * layout.scale);
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
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(35, 58, 30, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
