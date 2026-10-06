"use client";

import { useEffect, useRef } from "react";
import { gameSocket } from "@/lib/game/socket";
import { kuisTempurAudio } from "@/lib/game/kuis-tempur-audio";
import {
  KUIS_TEMPUR_CHARACTERS,
  getKuisTempurCharacter,
} from "@/lib/game/kuis-tempur-characters";

export type PhaserArenaEntity = {
  id: string;
  name: string;
  kind: "human" | "bot";
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  ammo: number;
  score: number;
  kills: number;
  deaths: number;
  correct: number;
  wrong: number;
  combo: number;
  alive: boolean;
  avatarUrl?: string | null;
  characterId?: string;
  color?: string;
  respawnIn?: number;
  connected?: boolean;
};

export type PhaserArenaState = {
  seq: number;
  timeLeft: number;
  entities: PhaserArenaEntity[];
};

type Feedback = { correct: boolean; text: string } | null;

type Props = {
  code: string;
  userId: string;
  arena: PhaserArenaState;
  feedback: Feedback;
};

const WORLD_W = 1400;
const WORLD_H = 840;

const ARGA_SHEETS = {
  down: "/game/rpg/characters/sheet-char-arga-walk-down.png",
  side: "/game/rpg/characters/sheet-char-arga-walk-side.png",
  up: "/game/rpg/characters/sheet-char-arga-walk-up.png",
} as const;
const ARGA_FRAME = 224;
const ARGA_FRAME_COUNT = 8;

const ASSETS = {
  base: [
    "/game/kuis-tempur/assets/world/base/arena_base_01.png",
  ],
  heroIdle: [
    "/junior/karakter/alby_idle.webp",
    "/junior/karakter/hazel_idle.webp",
    "/junior/karakter/zelby_idle.webp",
  ],
  heroRun: [
    "/junior/karakter/alby_running.webp",
    "/junior/karakter/hazel_happy.webp",
    "/junior/karakter/zelby_happy.webp",
  ],
  heroAttack: [
    "/junior/karakter/alby_celebrate.webp",
    "/junior/karakter/hazel_encouraging.webp",
    "/junior/karakter/zelby_wave.webp",
  ],
  heroHit: [
    "/junior/karakter/alby_surprised.webp",
    "/junior/karakter/hazel_thinking.webp",
    "/junior/karakter/zelby_thinking.webp",
  ],
  heroVictory: [
    "/junior/karakter/alby_celebrate.webp",
    "/junior/karakter/hazel_celebrate.webp",
    "/junior/karakter/zelby_celebrate.webp",
  ],
  terrain: [
    "/game/kuis-tempur/assets/world/terrain/grass_01.png",
    "/game/kuis-tempur/assets/world/terrain/grass_02.png",
    "/game/kuis-tempur/assets/world/terrain/mixed_01.png",
    "/game/kuis-tempur/assets/world/terrain/path_01.png",
  ],
  trees: [
    "/game/kuis-tempur/assets/world/trees/tree_01.png",
    "/game/kuis-tempur/assets/world/trees/tree_02.png",
    "/game/kuis-tempur/assets/world/trees/tree_03.png",
    "/game/kuis-tempur/assets/world/trees/tree_04.png",
    "/game/kuis-tempur/assets/world/trees/tree_tall.png",
    "/game/kuis-tempur/assets/world/trees/tree_wide.png",
  ],
  houses: [
    "/game/kuis-tempur/assets/world/houses/house_01.png",
    "/game/kuis-tempur/assets/world/houses/house_02.png",
    "/game/kuis-tempur/assets/world/houses/house_03.png",
    "/game/kuis-tempur/assets/world/houses/house_04.png",
  ],
  bushes: [
    "/game/kuis-tempur/assets/world/bushes/bush_01.png",
    "/game/kuis-tempur/assets/world/bushes/bush_02.png",
    "/game/kuis-tempur/assets/world/bushes/bush_04.png",
    "/game/kuis-tempur/assets/world/bushes/bush_flower.png",
  ],
  rocks: [
    "/game/kuis-tempur/assets/world/rocks/rock_01.png",
    "/game/kuis-tempur/assets/world/rocks/rock_03.png",
    "/game/kuis-tempur/assets/world/rocks/rock_cluster.png",
    "/game/kuis-tempur/assets/world/rocks/rock_moss.png",
  ],
  props: [
    "/game/kuis-tempur/assets/world/props/well.png",
    "/game/kuis-tempur/assets/world/props/cart.png",
    "/game/kuis-tempur/assets/world/props/crate.png",
    "/game/kuis-tempur/assets/world/props/lamp_post.png",
    "/game/kuis-tempur/assets/world/props/sign_direction.png",
    "/game/kuis-tempur/assets/world/props/log.png",
  ],
  fences: [
    "/game/kuis-tempur/assets/world/fences/fence_01.png",
    "/game/kuis-tempur/assets/world/fences/fence_02.png",
    "/game/kuis-tempur/assets/world/fences/fence_gate.png",
  ],
  decals: [
    "/game/kuis-tempur/assets/world/decals/grass_patch_01.png",
    "/game/kuis-tempur/assets/world/decals/dirt_patch.png",
    "/game/kuis-tempur/assets/world/decals/stone_patch.png",
    "/game/kuis-tempur/assets/world/decals/leaves.png",
    "/game/kuis-tempur/assets/world/decals/flowers_scatter.png",
  ],
} as const;

function key(prefix: string, index: number) {
  return `kt-${prefix}-${index}`;
}

export default function KuisTempurPhaserWorld({ code, userId, arena, feedback }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const arenaRef = useRef(arena);
  const userIdRef = useRef(userId);
  const feedbackSeqRef = useRef(0);

  useEffect(() => {
    arenaRef.current = arena;
  }, [arena]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      if (!mountRef.current || gameRef.current) return;
      const Phaser = await import("phaser");
      if (disposed || !mountRef.current) return;

      type HeroVisual = {
        root: any;
        body: any;
        weapon: any;
        weaponCore: any;
        weaponTip: any;
        targetRing: any;
        hpFill: any;
        ammoGlow: any;
        name: any;
        rankBadge: any;
        ko: any;
        targetX: number;
        targetY: number;
        state: PhaserArenaEntity;
        family: number;
        mode: "idle" | "run" | "attack" | "hit" | "ko";
        wasAlive: boolean;
        attackUntil: number;
        hitUntil: number;
        lastFacing: 1 | -1;
        heroKind: "arga" | "npc" | "mascot";
        characterId: string;
        direction: "down" | "side" | "up";
      };

      class KuisTempurScene extends Phaser.Scene {
        private heroes = new Map<string, HeroVisual>();
        private coreGlow: any;
        private rushOverlay: any;
        private rushLabel: any;
        private localFollowId = "";
        private hoverTargetId = "";
        private hitUnsubscribe: (() => void) | null = null;

        constructor() {
          super({ key: "KuisTempurWorld" });
        }

        preload() {
          Object.entries(ASSETS).forEach(([group, paths]) => {
            paths.forEach((path, index) => this.load.image(key(group, index), path));
          });
          this.load.spritesheet("kt-arga-down", ARGA_SHEETS.down, {
            frameWidth: ARGA_FRAME,
            frameHeight: ARGA_FRAME,
          });
          this.load.spritesheet("kt-arga-side", ARGA_SHEETS.side, {
            frameWidth: ARGA_FRAME,
            frameHeight: ARGA_FRAME,
          });
          this.load.spritesheet("kt-arga-up", ARGA_SHEETS.up, {
            frameWidth: ARGA_FRAME,
            frameHeight: ARGA_FRAME,
          });
          this.load.svg("kt-rpg-runtime-atlas", "/game/rpg/visual/rpg_runtime_atlas.svg", {
            width: 960,
            height: 800,
          });
          this.load.svg("kt-rpg-npc-atlas", "/game/rpg/visual/rpg_npc_atlas.svg", {
            width: 960,
            height: 240,
          });
        }

        private ensureNpcFrames() {
          KUIS_TEMPUR_CHARACTERS
            .filter((character) => character.source !== "arga" && character.frame)
            .forEach((character) => {
              const textureKey =
                character.source === "runtime-atlas"
                  ? "kt-rpg-runtime-atlas"
                  : "kt-rpg-npc-atlas";
              const texture = this.textures.get(textureKey);
              const frameKey = `kt-char-${character.id}`;
              if (texture.has(frameKey)) return;
              const frame = character.frame!;
              texture.add(frameKey, 0, frame.x, frame.y, frame.width, frame.height);
            });
        }

        private ensureHeroAnimations() {
          const definitions = [
            ["kt-arga-walk-down", "kt-arga-down"],
            ["kt-arga-walk-side", "kt-arga-side"],
            ["kt-arga-walk-up", "kt-arga-up"],
          ] as const;

          definitions.forEach(([animationKey, textureKey]) => {
            if (this.anims.exists(animationKey)) return;
            this.anims.create({
              key: animationKey,
              frames: this.anims.generateFrameNumbers(textureKey, {
                start: 0,
                end: ARGA_FRAME_COUNT - 1,
              }),
              frameRate: 12.5,
              repeat: -1,
            });
          });
        }

        create() {
          sceneRef.current = this;
          this.ensureNpcFrames();
          this.ensureHeroAnimations();
          this.cameras.main.setBackgroundColor("#173f32");
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.buildTerrain();
          this.buildVillage();
          this.buildArenaCore();
          this.buildAtmosphere();

          this.rushOverlay = this.add.rectangle(0, 0, 10, 10, 0x120516, 0)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(9000);
          this.rushLabel = this.add.text(0, 0, "FINAL RUSH", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "28px",
            fontStyle: "900",
            color: "#fde68a",
            stroke: "#4c0519",
            strokeThickness: 8,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(9001).setAlpha(0);

          this.scale.on("resize", this.onResize, this);
          this.onResize({ width: this.scale.width, height: this.scale.height });

          this.input.on("pointermove", (pointer: any) => {
            const current = arenaRef.current;
            const me = current.entities.find((entity) => entity.id === userIdRef.current);
            if (!me?.alive || me.ammo <= 0) {
              this.hoverTargetId = "";
              return;
            }
            this.hoverTargetId = this.pickTarget(pointer)?.id || "";
          });

          this.input.on("pointerout", () => {
            this.hoverTargetId = "";
          });

          this.input.on("pointerdown", (pointer: any) => {
            const current = arenaRef.current;
            const me = current.entities.find((entity) => entity.id === userIdRef.current);
            if (!me?.alive) return;

            const target = me.ammo > 0 ? this.pickTarget(pointer) : null;
            if (target) {
              gameSocket.arenaShoot({ code, userId: me.id, targetId: target.id });
              this.hoverTargetId = target.id;
              return;
            }

            const worldPoint = pointer.positionToCamera(this.cameras.main) as { x: number; y: number };
            gameSocket.arenaMove({
              code,
              userId: me.id,
              x: Phaser.Math.Clamp(worldPoint.x, 46, WORLD_W - 46),
              y: Phaser.Math.Clamp(worldPoint.y, 70, WORLD_H - 46),
            });
          });

          this.hitUnsubscribe = gameSocket.onArenaHit((hit: { fromId: string; targetId: string; damage: number }) => {
            this.playHit(hit.fromId, hit.targetId, hit.damage);
          });
        }

        private pickTarget(pointer: any) {
          const current = arenaRef.current;
          const me = current.entities.find((entity) => entity.id === userIdRef.current);
          if (!me?.alive) return null;

          const worldPoint = pointer.positionToCamera(this.cameras.main) as { x: number; y: number };
          const nearest = current.entities
            .filter((entity) => entity.id !== me.id && entity.alive && entity.connected !== false)
            .map((entity) => ({
              entity,
              distance: Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, entity.x, entity.y),
            }))
            .sort((a, b) => a.distance - b.distance)[0];

          return nearest && nearest.distance < 68 ? nearest.entity : null;
        }

        private buildTerrain() {
          this.add.image(WORLD_W / 2, WORLD_H / 2, key("base", 0))
            .setDisplaySize(WORLD_W, WORLD_H)
            .setDepth(-1100)
            .setTint(0xf6ffe9);

          const detailPoints = [
            [250, 330, 0], [1160, 330, 1], [330, 615, 2], [1040, 610, 3],
            [530, 185, 4], [880, 190, 0], [165, 500, 3], [1230, 510, 4],
          ];
          detailPoints.forEach(([x, y, variant], index) => {
            this.add.image(x, y, key("decals", variant))
              .setScale(0.18 + (index % 3) * 0.025)
              .setAlpha(0.52)
              .setDepth(-780 + y * 0.001);
          });
        }

        private addWorldSprite(texture: string, x: number, y: number, scale: number, sway = false) {
          const sprite = this.add.image(x, y, texture)
            .setOrigin(0.5, 1)
            .setScale(scale)
            .setDepth(y);
          if (sway) {
            this.tweens.add({
              targets: sprite,
              angle: { from: -1.2, to: 1.2 },
              duration: 1500 + ((x + y) % 900),
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          }
          return sprite;
        }

        private buildVillage() {
          const houses = [
            [190, 155, 0], [435, 145, 1], [980, 150, 2], [1210, 175, 3],
          ];
          houses.forEach(([x, y, variant]) => {
            this.addWorldSprite(key("houses", variant), x, y, 0.62);
          });

          const trees = [
            [85, 270, 0], [280, 245, 2], [555, 170, 4], [845, 170, 1],
            [1125, 250, 5], [1310, 300, 3], [1215, 740, 0], [940, 770, 4],
            [465, 765, 5], [180, 710, 1], [75, 590, 3], [1320, 620, 2],
          ];
          trees.forEach(([x, y, variant]) => {
            this.addWorldSprite(key("trees", variant), x, y, 0.68 + (variant % 3) * 0.035, true);
          });

          const bushes = [
            [340, 225, 0], [690, 175, 2], [1060, 220, 1], [170, 580, 3],
            [390, 700, 2], [1010, 690, 0], [1240, 560, 3],
          ];
          bushes.forEach(([x, y, variant]) => {
            this.addWorldSprite(key("bushes", variant), x, y, 0.48, true);
          });

          const rocks = [
            [365, 315, 2], [1040, 305, 3], [360, 600, 0], [1050, 590, 1],
          ];
          rocks.forEach(([x, y, variant]) => this.addWorldSprite(key("rocks", variant), x, y, 0.52));

          const props = [
            [620, 205, 0], [1140, 470, 1], [275, 460, 2], [505, 300, 3],
            [895, 300, 3], [785, 650, 4], [595, 635, 5],
          ];
          props.forEach(([x, y, variant]) => {
            const sprite = this.addWorldSprite(key("props", variant), x, y, variant == 3 ? 0.6 : 0.52);
            if (variant === 3) {
              const glow = this.add.circle(x, y - 44, 28, 0xfbbf24, 0.13).setDepth(y - 1);
              glow.setBlendMode(Phaser.BlendModes.ADD);
              this.tweens.add({
                targets: glow,
                alpha: { from: 0.07, to: 0.22 },
                scale: { from: 0.82, to: 1.14 },
                duration: 1200,
                yoyo: true,
                repeat: -1,
              });
              sprite.setDepth(y);
            }
          });

          const fencePoints = [
            [150, 355, 0], [225, 355, 1], [1170, 355, 0], [1245, 355, 1], [700, 745, 2],
          ];
          fencePoints.forEach(([x, y, variant]) => this.addWorldSprite(key("fences", variant), x, y, 0.62));
        }

        private buildArenaCore() {
          const x = WORLD_W / 2;
          const y = WORLD_H / 2;
          const g = this.add.graphics().setDepth(y - 15);
          g.fillStyle(0x0b1220, 0.86);
          g.fillCircle(x, y, 92);
          g.lineStyle(7, 0x22d3ee, 0.38);
          g.strokeCircle(x, y, 92);
          g.lineStyle(3, 0xfde68a, 0.72);
          g.strokeCircle(x, y, 64);
          g.lineStyle(2, 0x67e8f9, 0.5);
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            const x1 = x + Math.cos(a) * 65;
            const y1 = y + Math.sin(a) * 65;
            const x2 = x + Math.cos(a) * 84;
            const y2 = y + Math.sin(a) * 84;
            g.lineBetween(x1, y1, x2, y2);
          }

          this.coreGlow = this.add.circle(x, y, 48, 0x38bdf8, 0.22).setDepth(y - 10);
          this.coreGlow.setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: this.coreGlow,
            scale: { from: 0.72, to: 1.35 },
            alpha: { from: 0.10, to: 0.34 },
            duration: 1350,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          const book = this.add.text(x, y - 5, "📖", { fontSize: "54px" }).setOrigin(0.5).setDepth(y + 2);
          this.tweens.add({
            targets: book,
            y: y - 13,
            duration: 1350,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        private buildAtmosphere() {
          for (let i = 0; i < 36; i++) {
            const mote = this.add.circle(
              40 + ((i * 211) % 1320),
              60 + ((i * 127) % 700),
              1.4 + (i % 3) * 0.55,
              i % 2 ? 0xbef264 : 0x67e8f9,
              0.18 + (i % 5) * 0.035,
            ).setDepth(8200);
            mote.setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: mote,
              x: mote.x + 35 + (i % 4) * 12,
              y: mote.y - 25 - (i % 5) * 8,
              alpha: { from: mote.alpha, to: 0.04 },
              duration: 2600 + (i % 7) * 330,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          }
        }

        private createHero(entity: PhaserArenaEntity): HeroVisual {
          const accent = Phaser.Display.Color.HexStringToColor(entity.color || "#22d3ee").color;
          const heroHash = Math.abs(Array.from(entity.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
          const character = getKuisTempurCharacter(entity.characterId);
          const heroKind: HeroVisual["heroKind"] =
            entity.kind !== "human"
              ? "mascot"
              : character.source === "arga"
                ? "arga"
                : "npc";
          const family = heroHash % ASSETS.heroIdle.length;

          const shadow = this.add.ellipse(0, 31, heroKind === "arga" ? 48 : 54, 14, 0x020617, 0.34);
          const aura = this.add.circle(0, 3, entity.id === userIdRef.current ? 40 : 34, accent, entity.id === userIdRef.current ? 0.16 : 0.055);
          aura.setBlendMode(Phaser.BlendModes.ADD);

          const body =
            heroKind === "arga"
              ? this.add.sprite(0, 31, "kt-arga-down", 0)
                  .setOrigin(0.5, 1)
                  .setDisplaySize(96, 96)
              : heroKind === "npc"
                ? this.add.image(
                    0,
                    27,
                    character.source === "runtime-atlas"
                      ? "kt-rpg-runtime-atlas"
                      : "kt-rpg-npc-atlas",
                    `kt-char-${character.id}`
                  )
                    .setOrigin(0.5, 1)
                    .setDisplaySize(92, 92)
                : this.add.image(0, 27, key("heroIdle", family))
                    .setOrigin(0.5, 1)
                    .setDisplaySize(84, 84);

          const weaponGrip = this.add.rectangle(14, 3, 10, 9, 0x172554, 1)
            .setStrokeStyle(1.5, 0xf8fafc, 0.5);
          const weaponCore = this.add.rectangle(29, 0, 32, 7, entity.ammo > 0 ? 0xf59e0b : 0x64748b, 1)
            .setStrokeStyle(2, 0xffffff, 0.72);
          const weaponTip = this.add.circle(47, 0, 5.5, entity.ammo > 0 ? 0xfef08a : 0x64748b, 1)
            .setStrokeStyle(2, 0xffffff, 0.6);
          const ammoGlow = this.add.circle(47, 0, 12, entity.ammo > 0 ? 0xfde047 : 0x64748b, entity.ammo > 0 ? 0.23 : 0.06);
          ammoGlow.setBlendMode(Phaser.BlendModes.ADD);
          const weapon = this.add.container(0, 5, [ammoGlow, weaponGrip, weaponCore, weaponTip])
            .setAngle(-11);

          const targetRing = this.add.circle(0, 6, heroKind === "arga" ? 37 : 40, 0xfb7185, 0)
            .setStrokeStyle(2.5, 0xfb7185, 0.9)
            .setAlpha(0);

          const hpBg = this.add.rectangle(0, -55, 62, 7, 0x020617, 0.86).setOrigin(0.5);
          const hpFill = this.add.rectangle(-31, -55, 62, 7, 0x34d399, 1).setOrigin(0, 0.5);
          const name = this.add.text(0, 42, entity.id === userIdRef.current ? `${entity.name} · KAMU` : entity.name, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            fontStyle: "800",
            color: entity.id === userIdRef.current ? "#a5f3fc" : "#ffffff",
            stroke: "#020617",
            strokeThickness: 5,
          }).setOrigin(0.5);

          const rankBadge = this.add.text(-39, -40, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "10px",
            fontStyle: "900",
            color: "#0f172a",
            backgroundColor: "#fde68a",
            padding: { x: 5, y: 3 },
          }).setOrigin(0.5).setAlpha(0);

          const ko = this.add.text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            fontStyle: "900",
            color: "#fde68a",
            stroke: "#450a0a",
            strokeThickness: 5,
          }).setOrigin(0.5);

          const root = this.add.container(entity.x, entity.y, [shadow, targetRing, aura, body, weapon, hpBg, hpFill, name, rankBadge, ko]);
          root.setDepth(entity.y + 20);
          root.setSize(82, 106);

          this.tweens.add({
            targets: heroKind === "arga" ? [weapon] : [body, weapon],
            y: "-=2",
            duration: 500 + (entity.id.charCodeAt(0) % 140),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          if (entity.id === userIdRef.current) {
            this.tweens.add({
              targets: aura,
              scale: { from: 0.84, to: 1.18 },
              alpha: { from: 0.09, to: 0.24 },
              duration: 920,
              yoyo: true,
              repeat: -1,
            });
          }

          return {
            root,
            body,
            weapon,
            weaponCore,
            weaponTip,
            targetRing,
            hpFill,
            ammoGlow,
            name,
            rankBadge,
            ko,
            targetX: entity.x,
            targetY: entity.y,
            state: entity,
            family,
            mode: entity.alive ? "idle" : "ko",
            wasAlive: entity.alive,
            attackUntil: 0,
            hitUntil: 0,
            lastFacing: 1,
            heroKind,
            characterId: character.id,
            direction: "down",
          };
        }

        private heroTexture(mode: HeroVisual["mode"], family: number) {
          if (mode === "run") return key("heroRun", family);
          if (mode === "attack") return key("heroAttack", family);
          if (mode === "hit" || mode === "ko") return key("heroHit", family);
          return key("heroIdle", family);
        }

        private setHeroMode(visual: HeroVisual, mode: HeroVisual["mode"]) {
          if (visual.mode === mode) return;
          visual.mode = mode;

          if (visual.heroKind === "arga") {
            if (mode !== "run") {
              visual.body.anims?.stop();
              const texture =
                visual.direction === "up"
                  ? "kt-arga-up"
                  : visual.direction === "side"
                    ? "kt-arga-side"
                    : "kt-arga-down";
              visual.body.setTexture(texture, 0).setDisplaySize(96, 96);
            }
          } else if (visual.heroKind === "mascot") {
            visual.body.setTexture(this.heroTexture(mode, visual.family)).setDisplaySize(84, 84);
          }

          if (mode === "run") {
            visual.body.setAngle(0);
          } else if (mode === "attack") {
            visual.body.setAngle(visual.lastFacing > 0 ? 6 : -6);
          } else if (mode === "hit") {
            visual.body.setAngle(visual.lastFacing > 0 ? -8 : 8);
          } else {
            visual.body.setAngle(0);
          }
        }

        private syncArgaMovement(visual: HeroVisual, dx: number, dy: number, moving: boolean) {
          if (visual.heroKind !== "arga") return;

          if (!moving || visual.mode !== "run") {
            visual.body.anims?.stop();
            return;
          }

          let direction: HeroVisual["direction"];
          let animationKey: string;
          if (Math.abs(dx) > Math.abs(dy)) {
            direction = "side";
            animationKey = "kt-arga-walk-side";
            visual.lastFacing = dx >= 0 ? 1 : -1;
            visual.body.setFlipX(visual.lastFacing < 0);
          } else if (dy < 0) {
            direction = "up";
            animationKey = "kt-arga-walk-up";
            visual.body.setFlipX(false);
          } else {
            direction = "down";
            animationKey = "kt-arga-walk-down";
            visual.body.setFlipX(false);
          }

          visual.direction = direction;
          if (visual.body.anims?.currentAnim?.key !== animationKey || !visual.body.anims?.isPlaying) {
            visual.body.play(animationKey, true);
          }
        }

        private playKo(visual: HeroVisual) {
          if (visual.state.id === userIdRef.current) kuisTempurAudio.play("ko");
          visual.attackUntil = 0;
          visual.hitUntil = 0;
          this.setHeroMode(visual, "ko");

          const ring = this.add.circle(visual.root.x, visual.root.y, 30, 0xfb7185, 0.2).setDepth(8600);
          ring.setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: ring,
            scale: 2.4,
            alpha: 0,
            duration: 420,
            ease: "Quad.easeOut",
            onComplete: () => ring.destroy(),
          });

          this.tweens.add({
            targets: visual.body,
            angle: visual.lastFacing > 0 ? 18 : -18,
            y: "+=12",
            alpha: 0.42,
            duration: 220,
            ease: "Quad.easeOut",
          });
        }

        private playRespawn(visual: HeroVisual) {
          if (visual.state.id === userIdRef.current) kuisTempurAudio.play("respawn");
          if (visual.heroKind === "arga") {
            visual.body
              .setTexture("kt-arga-down", 0)
              .setDisplaySize(96, 96)
              .setAngle(0)
              .setAlpha(1)
              .setY(31);
            visual.direction = "down";
            visual.body.anims?.stop();
          } else if (visual.heroKind === "npc") {
            visual.body
              .setAngle(0)
              .setAlpha(1)
              .setY(27)
              .setDisplaySize(92, 92);
          } else {
            visual.body
              .setTexture(this.heroTexture("idle", visual.family))
              .setDisplaySize(84, 84)
              .setAngle(0)
              .setAlpha(1)
              .setY(27);
          }
          this.setHeroMode(visual, "idle");

          const ringA = this.add.circle(visual.root.x, visual.root.y, 18, 0x67e8f9, 0.34).setDepth(8600);
          const ringB = this.add.circle(visual.root.x, visual.root.y, 30, 0xfde68a, 0.22).setDepth(8599);
          ringA.setBlendMode(Phaser.BlendModes.ADD);
          ringB.setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: [ringA, ringB],
            scale: 3,
            alpha: 0,
            duration: 520,
            ease: "Quad.easeOut",
            onComplete: () => { ringA.destroy(); ringB.destroy(); },
          });
          this.tweens.add({
            targets: visual.root,
            scaleX: { from: 0.72, to: 1 },
            scaleY: { from: 0.72, to: 1 },
            duration: 300,
            ease: "Back.easeOut",
          });
        }

        private syncHeroes() {
          const current = arenaRef.current;
          const ids = new Set(current.entities.map((entity) => entity.id));

          for (const [id, visual] of this.heroes) {
            if (!ids.has(id)) {
              visual.root.destroy(true);
              this.heroes.delete(id);
            }
          }

          const ranking = current.entities
            .filter((entity) => entity.kind === "human")
            .slice()
            .sort((a, b) => b.score - a.score || b.kills - a.kills || b.correct - a.correct);
          const rankById = new Map(ranking.map((entity, index) => [entity.id, index + 1]));

          current.entities.forEach((entity) => {
            let visual = this.heroes.get(entity.id);
            if (!visual) {
              visual = this.createHero(entity);
              this.heroes.set(entity.id, visual);
            }

            const wasAlive = visual.wasAlive;
            visual.state = entity;
            visual.targetX = entity.x;
            visual.targetY = entity.y;
            visual.root.setDepth(entity.y + 20);
            visual.root.setAlpha(entity.connected === false ? 0.22 : entity.alive ? 1 : 0.38);

            if (wasAlive && !entity.alive) this.playKo(visual);
            if (!wasAlive && entity.alive) this.playRespawn(visual);
            visual.wasAlive = entity.alive;

            const hpRatio = Phaser.Math.Clamp(entity.hp / Math.max(1, entity.hpMax), 0, 1);
            visual.hpFill.setDisplaySize(Math.max(0.1, 58 * hpRatio), 7);
            visual.hpFill.setFillStyle(hpRatio > 0.45 ? 0x34d399 : hpRatio > 0.2 ? 0xfbbf24 : 0xfb7185);

            const hasAmmo = entity.ammo > 0;
            visual.weaponCore.setFillStyle(hasAmmo ? 0xf59e0b : 0x64748b, 1);
            visual.weaponTip.setFillStyle(hasAmmo ? 0xfef08a : 0x64748b, 1);
            visual.ammoGlow.setFillStyle(hasAmmo ? 0xfde047 : 0x64748b, hasAmmo ? 0.23 : 0.06);
            const targeted = entity.id === this.hoverTargetId && entity.connected !== false && entity.alive;
            visual.targetRing
              .setAlpha(targeted ? 0.85 : 0)
              .setScale(targeted ? 1 + Math.sin(this.time.now / 120) * 0.08 : 1);
            visual.ko.setText(
              entity.connected === false
                ? "KONEKSI TERPUTUS"
                : entity.alive
                  ? ""
                  : `RESPAWN ${Math.max(1, Math.ceil(entity.respawnIn || 1))}s`
            );

            const rank = rankById.get(entity.id) || 99;
            visual.rankBadge
              .setText(rank <= 3 ? `#${rank}` : "")
              .setAlpha(rank <= 3 && entity.connected !== false ? 1 : 0)
              .setBackgroundColor(rank === 1 ? "#fde047" : rank === 2 ? "#cbd5e1" : "#fdba74");

            if (entity.id === userIdRef.current && this.localFollowId !== entity.id) {
              this.localFollowId = entity.id;
              this.cameras.main.startFollow(visual.root, true, 0.09, 0.09);
            }
          });
        }

        private playHit(fromId: string, targetId: string, damage: number) {
          const from = this.heroes.get(fromId);
          const target = this.heroes.get(targetId);
          if (!from || !target) return;

          const now = this.time.now;
          if (fromId === userIdRef.current) kuisTempurAudio.play("shot");
          from.attackUntil = Math.max(from.attackUntil, now + 230);
          target.hitUntil = Math.max(target.hitUntil, now + 280);
          this.setHeroMode(from, "attack");
          this.setHeroMode(target, "hit");

          this.tweens.killTweensOf(from.weapon);
          this.tweens.add({
            targets: from.weapon,
            angle: { from: -24 * from.lastFacing, to: 13 * from.lastFacing },
            x: { from: 22 * from.lastFacing, to: 34 * from.lastFacing },
            duration: 105,
            yoyo: true,
            ease: "Quad.easeOut",
          });

          this.tweens.killTweensOf(target.body);
          target.body.setTint(0xffffff);
          this.tweens.add({
            targets: target.body,
            x: { from: 0, to: 6 * from.lastFacing },
            alpha: { from: 1, to: 0.72 },
            duration: 90,
            yoyo: true,
            onComplete: () => {
              target.body.setX(0).setAlpha(1).clearTint();
            },
          });

          const projectile = this.add.circle(from.root.x, from.root.y - 4, 7, 0xfef08a, 1).setDepth(8500);
          projectile.setBlendMode(Phaser.BlendModes.ADD);
          const trail = this.add.circle(from.root.x, from.root.y - 4, 14, 0x38bdf8, 0.24).setDepth(8499);
          trail.setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: [projectile, trail],
            x: target.root.x,
            y: target.root.y - 6,
            duration: 150,
            ease: "Quad.easeIn",
            onComplete: () => {
              projectile.destroy();
              trail.destroy();
              if (fromId === userIdRef.current || targetId === userIdRef.current) {
                kuisTempurAudio.play("hit");
              }

              const flash = this.add.circle(target.root.x, target.root.y - 4, 32, 0xffffff, 0.88).setDepth(8600);
              flash.setBlendMode(Phaser.BlendModes.ADD);
              this.tweens.add({
                targets: flash,
                scale: 1.9,
                alpha: 0,
                duration: 220,
                onComplete: () => flash.destroy(),
              });

              for (let i = 0; i < 7; i++) {
                const spark = this.add.circle(target.root.x, target.root.y - 4, 3 + (i % 2), i % 2 ? 0xfde047 : 0xfb7185, 0.9).setDepth(8601);
                const angle = (Math.PI * 2 * i) / 7;
                this.tweens.add({
                  targets: spark,
                  x: target.root.x + Math.cos(angle) * (34 + i * 3),
                  y: target.root.y - 4 + Math.sin(angle) * (34 + i * 3),
                  alpha: 0,
                  scale: 0.2,
                  duration: 260,
                  onComplete: () => spark.destroy(),
                });
              }

              const number = this.add.text(target.root.x, target.root.y - 54, `-${damage}`, {
                fontFamily: "system-ui, sans-serif",
                fontSize: "18px",
                fontStyle: "900",
                color: "#fecaca",
                stroke: "#450a0a",
                strokeThickness: 6,
              }).setOrigin(0.5).setDepth(8700);
              this.tweens.add({
                targets: number,
                y: number.y - 34,
                alpha: 0,
                duration: 650,
                onComplete: () => number.destroy(),
              });

              if (targetId === userIdRef.current) this.cameras.main.shake(110, 0.0035);
            },
          });
        }

        pulseLocalHero(message = "") {
          const hero = this.heroes.get(userIdRef.current);
          if (!hero) return;
          const pulse = this.add.circle(hero.root.x, hero.root.y, 24, 0x67e8f9, 0.24).setDepth(8550);
          pulse.setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: pulse,
            scale: 2.7,
            alpha: 0,
            duration: 430,
            ease: "Quad.easeOut",
            onComplete: () => pulse.destroy(),
          });
          this.tweens.add({
            targets: hero.root,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 120,
            yoyo: true,
          });

          for (let i = 0; i < 5; i++) {
            const shard = this.add.circle(
              hero.root.x + (i - 2) * 7,
              hero.root.y - 18,
              2.5 + (i % 2),
              i % 2 ? 0xfde047 : 0x67e8f9,
              0.95,
            ).setDepth(8560);
            shard.setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: shard,
              x: shard.x + (i - 2) * 9,
              y: shard.y - 32 - i * 3,
              alpha: 0,
              scale: 0.2,
              duration: 420 + i * 35,
              ease: "Quad.easeOut",
              onComplete: () => shard.destroy(),
            });
          }

          const comboMatch = message.match(/(\d+)×\s*kombo/i);
          const label = comboMatch ? `ENERGI +1 · COMBO ×${comboMatch[1]}` : "ENERGI +1";
          const energyText = this.add.text(hero.root.x, hero.root.y - 72, label, {
            fontFamily: "system-ui, sans-serif",
            fontSize: comboMatch ? "16px" : "14px",
            fontStyle: "900",
            color: comboMatch ? "#fde68a" : "#a5f3fc",
            stroke: "#020617",
            strokeThickness: 6,
          }).setOrigin(0.5).setDepth(8750);
          this.tweens.add({
            targets: energyText,
            y: energyText.y - 32,
            alpha: 0,
            scale: { from: 0.88, to: 1.08 },
            duration: 720,
            ease: "Quad.easeOut",
            onComplete: () => energyText.destroy(),
          });
        }

        private onResize(gameSize: { width: number; height: number }) {
          const width = gameSize.width;
          const height = gameSize.height;
          this.rushOverlay.setSize(width, height);
          this.rushLabel.setPosition(width / 2, 112);
          const compact = width < 760;
          this.cameras.main.setZoom(compact ? 0.72 : width < 1100 ? 0.9 : 1.03);
        }

        update(_: number, delta: number) {
          this.syncHeroes();
          const lerp = 1 - Math.pow(0.001, Math.min(delta, 60) / 1000);

          for (const visual of this.heroes.values()) {
            const dx = visual.targetX - visual.root.x;
            const dy = visual.targetY - visual.root.y;
            const moving = visual.state.alive && visual.state.connected !== false && Math.hypot(dx, dy) > 8;

            if (visual.heroKind !== "arga" && Math.abs(dx) > 2) {
              visual.lastFacing = dx >= 0 ? 1 : -1;
              visual.body.setFlipX(visual.lastFacing < 0);
            }

            visual.root.x = Phaser.Math.Linear(visual.root.x, visual.targetX, Math.min(0.34, lerp * 0.46));
            visual.root.y = Phaser.Math.Linear(visual.root.y, visual.targetY, Math.min(0.34, lerp * 0.46));
            visual.root.setDepth(visual.root.y + 20);

            if (!visual.state.alive) {
              this.setHeroMode(visual, "ko");
            } else if (this.time.now < visual.hitUntil) {
              this.setHeroMode(visual, "hit");
            } else if (this.time.now < visual.attackUntil) {
              this.setHeroMode(visual, "attack");
            } else if (moving) {
              this.setHeroMode(visual, "run");
            } else {
              this.setHeroMode(visual, "idle");
            }

            this.syncArgaMovement(visual, dx, dy, moving);

            if (moving && visual.mode === "run" && visual.heroKind !== "arga") {
              const stride = Math.sin(this.time.now / 85 + visual.root.x * 0.02);
              visual.body.setY(27 + stride * 1.8);
              visual.weapon.setY(5 + stride * 0.8);
            } else if (visual.mode !== "ko") {
              visual.body.setY(visual.heroKind === "arga" ? 31 : 27);
              visual.weapon.setY(5);
            }
          }

          const rush = arenaRef.current.timeLeft <= 30 && arenaRef.current.timeLeft > 0;
          if (rush) {
            this.rushOverlay.setAlpha(0.055 + Math.sin(this.time.now / 230) * 0.025);
            this.rushLabel.setAlpha(0.72 + Math.sin(this.time.now / 170) * 0.22);
            this.coreGlow.setScale(1.0 + Math.sin(this.time.now / 140) * 0.18);
          } else {
            this.rushOverlay.setAlpha(0);
            this.rushLabel.setAlpha(0);
          }
        }

        shutdown() {
          this.hitUnsubscribe?.();
          this.hitUnsubscribe = null;
          this.scale.off("resize", this.onResize, this);
          if (sceneRef.current === this) sceneRef.current = null;
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mountRef.current,
        transparent: false,
        backgroundColor: "#173f32",
        width: mountRef.current.clientWidth || window.innerWidth,
        height: mountRef.current.clientHeight || window.innerHeight,
        render: {
          antialias: true,
          roundPixels: false,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [KuisTempurScene],
      });

      gameRef.current = game;
    }

    void boot();

    return () => {
      disposed = true;
      const game = gameRef.current;
      gameRef.current = null;
      sceneRef.current = null;
      if (game) game.destroy(true);
    };
  }, [code]);

  useEffect(() => {
    if (!feedback?.correct || !sceneRef.current) return;
    feedbackSeqRef.current += 1;
    sceneRef.current.pulseLocalHero?.(feedback.text);
  }, [feedback]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 h-full w-full touch-none overflow-hidden bg-[#173f32]"
      aria-label="Dunia Kuis Tempur"
    />
  );
}
