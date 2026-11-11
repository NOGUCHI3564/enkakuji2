// Three.js カスタムGLSLシェーダーによる「幻想星雲ガラス宝珠 ＆ アンダーグロウ光彩」レンダラー
// スクリーンショット検証に基づく色彩・露出の精密チューニング版:
// 1. 加算合成による中心・底面の「白飛び」を完全に排除し、宇宙の深い闇とのコントラストで紫・蒼・紅（クリムゾン）・黄金が妖艶に浮かび上がる設計
// 2. 4,800粒子の渦状腕の凝集度を高め、美しい対数スパイラルの流れと4色の星雲グラデーションを鮮明化
// 3. ガラス球の下部には、白飛びせず「ぼわーっと幻想的に滲む紫・蒼・紅金のオーラ池」と、その中を「ピカピカと鮮明に瞬きながら昇る180個の光粒子」を配置
// 4. 「覚悟の星」が背景のガスで白く潰れず、エメラルド・サファイア・黄金・紅蓮の宝石色と鋭い十字光条をくっきりと放つよう最適化

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  LightMood,
  SavedResolutionStone,
  SoundType,
  StoneColorTheme,
} from "../types/zen";

interface ZenGardenCanvasProps {
  lightMood: LightMood;
  stones: SavedResolutionStone[];
  selectedStoneId?: string | null;
  onSelectStone: (stone: SavedResolutionStone) => void;
  ambientSound: SoundType;
  rippleTrigger: number;
  isMeditationMode: boolean;
}

// 各「覚悟の星」の色彩パレット（白飛びを防ぎ、星そのものの宝石色が鮮やかに匂い立つ配色）
const STONE_STAR_PALETTE: Record<
  StoneColorTheme,
  {
    coreRgb: string;
    midRgb: string;
    outerRgb: string;
    spikeRgb: string;
  }
> = {
  golden_resolve: {
    coreRgb: "255, 248, 210",
    midRgb: "255, 185, 25", // 濃密な黄金アンバー
    outerRgb: "180, 83, 9", // 深い琥珀ブルーム
    spikeRgb: "253, 224, 71",
  },
  sapphire_zen: {
    coreRgb: "224, 242, 254",
    midRgb: "56, 189, 248", // 鮮やかなシリウス・サファイアブルー
    outerRgb: "29, 78, 216", // 深いコバルトブルーム
    spikeRgb: "125, 211, 252",
  },
  emerald_glow: {
    coreRgb: "209, 250, 229",
    midRgb: "16, 185, 129", // 鮮やかなエメラルドグリーン
    outerRgb: "4, 120, 87", // 深い翠緑ブルーム
    spikeRgb: "110, 231, 183",
  },
  lotus_warm: {
    coreRgb: "252, 231, 243",
    midRgb: "244, 63, 140", // 鮮やかな紅蓮ロータスピンク
    outerRgb: "157, 23, 77", // 深いマゼンタ・クリムゾンブルーム
    spikeRgb: "249, 168, 212",
  },
};

// 星雲ヴェール・アンダーグロウ用の2色グラデーション・ソフトグロウテクスチャ
function createRichNebulaTexture(
  innerRgb: string,
  outerRgb: string,
  alphaPeak = 1.0
): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, `rgba(${innerRgb}, ${alphaPeak})`);
  g.addColorStop(0.32, `rgba(${innerRgb}, ${alphaPeak * 0.55})`);
  g.addColorStop(0.65, `rgba(${outerRgb}, ${alphaPeak * 0.22})`);
  g.addColorStop(1, `rgba(${outerRgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 「覚悟の星」専用：白い丸にならず、豊かな色のブルーム（光冠）と鋭い十字・八芒星の光条を持つ高精細スターテクスチャ
function createVividStarTexture(palette: {
  coreRgb: string;
  midRgb: string;
  outerRgb: string;
  spikeRgb: string;
}): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;

  // 1. 外側にふんわり滲む色彩ブルーム（中心を白くせず、宝石色で包む）
  const bloomGrad = ctx.createRadialGradient(
    half,
    half,
    2,
    half,
    half,
    half * 0.92
  );
  bloomGrad.addColorStop(0, `rgba(${palette.midRgb}, 0.85)`);
  bloomGrad.addColorStop(0.15, `rgba(${palette.midRgb}, 0.55)`);
  bloomGrad.addColorStop(0.38, `rgba(${palette.outerRgb}, 0.25)`);
  bloomGrad.addColorStop(0.7, `rgba(${palette.outerRgb}, 0.06)`);
  bloomGrad.addColorStop(1, `rgba(${palette.outerRgb}, 0)`);
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. 鋭く伸びる色付きの回折スパイク
  const drawRay = (
    angle: number,
    len: number,
    width: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(angle);

    const rg = ctx.createLinearGradient(-len, 0, len, 0);
    rg.addColorStop(0, `rgba(${palette.outerRgb}, 0)`);
    rg.addColorStop(0.18, `rgba(${palette.midRgb}, ${alpha * 0.45})`);
    rg.addColorStop(0.44, `rgba(${palette.spikeRgb}, ${alpha * 0.95})`);
    rg.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
    rg.addColorStop(0.56, `rgba(${palette.spikeRgb}, ${alpha * 0.95})`);
    rg.addColorStop(0.82, `rgba(${palette.midRgb}, ${alpha * 0.45})`);
    rg.addColorStop(1, `rgba(${palette.outerRgb}, 0)`);

    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -width, len, 0);
    ctx.quadraticCurveTo(0, width, -len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 主光条（縦・横の鋭いロングスパイク）
  drawRay(0, half * 0.98, 3.2, 1.0);
  drawRay(Math.PI / 2, half * 0.98, 3.2, 1.0);

  // 副光条（斜め45度の繊細なスパイク）
  drawRay(Math.PI / 4, half * 0.56, 2.0, 0.82);
  drawRay(-Math.PI / 4, half * 0.56, 2.0, 0.82);

  // 3. 中心の極小ピンポイント輝核（半径10px以下に絞り、白い塊に見せない）
  const pinGrad = ctx.createRadialGradient(half, half, 0, half, half, 10);
  pinGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  pinGrad.addColorStop(0.45, `rgba(${palette.coreRgb}, 0.92)`);
  pinGrad.addColorStop(1, `rgba(${palette.midRgb}, 0)`);
  ctx.fillStyle = pinGrad;
  ctx.beginPath();
  ctx.arc(half, half, 10, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 球体内部（半径 ORB_RADIUS = 1.0）の8分割/16分割セクター全体に立体配置
function computeStoneSectorPosition(
  _stone: SavedResolutionStone,
  index: number
): THREE.Vector3 {
  const octantSequence = [
    { sx: 1, sy: 1, sz: 1 },
    { sx: -1, sy: 1, sz: -1 },
    { sx: -1, sy: -1, sz: 1 },
    { sx: 1, sy: -1, sz: -1 },
    { sx: -1, sy: 1, sz: 1 },
    { sx: 1, sy: 1, sz: -1 },
    { sx: 1, sy: -1, sz: 1 },
    { sx: -1, sy: -1, sz: -1 },
  ];
  const oct = octantSequence[index % 8];
  const layer = Math.floor(index / 8) % 2;
  const seed = index * 1.6180339;

  const baseDist = layer === 0 ? 0.36 : 0.48;
  const x = oct.sx * (baseDist + Math.sin(seed) * 0.07);
  const y = oct.sy * (baseDist * 0.82 + Math.cos(seed * 1.3) * 0.06);
  const z = oct.sz * (baseDist + Math.sin(seed * 0.7) * 0.07);

  return new THREE.Vector3(x, y, z);
}

function calculateOptimalCameraDistance(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  const fovRad = (40 * Math.PI) / 180;
  const targetWidthWorld = 2.0 / 0.6;
  const distForWidth =
    targetWidthWorld / (2 * Math.tan(fovRad / 2) * Math.min(1, aspect));
  return Math.max(4.1, Math.min(7.8, distForWidth));
}

export const ZenGardenCanvas: React.FC<ZenGardenCanvasProps> = ({
  stones,
  selectedStoneId,
  onSelectStone,
  rippleTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stonesRef = useRef<SavedResolutionStone[]>(stones);
  const selectedIdRef = useRef<string | null | undefined>(selectedStoneId);
  const onSelectRef = useRef(onSelectStone);

  stonesRef.current = stones;
  selectedIdRef.current = selectedStoneId;
  onSelectRef.current = onSelectStone;

  const sceneCtxRef = useRef<{
    stonesGroup: THREE.Group;
    pulseWavesGroup: THREE.Group;
    stoneEntries: Map<
      string,
      {
        mainStarSprite: THREE.Sprite;
        subTwinkleSprite: THREE.Sprite;
        hitMesh: THREE.Mesh;
        phase: number;
      }
    >;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030209);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const initialDist = calculateOptimalCameraDistance(width, height);
    camera.position.set(0, initialDist * 0.28, initialDist * 0.96);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.minDistance = 1.65;
    controls.maxDistance = initialDist * 1.45;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.26;
    controls.target.set(0, -0.1, 0);

    // ============================================================================
    // 0. 背後の宇宙アンビエンス（ごく淡い深紫〜群青のベルベット空間）
    // ============================================================================
    const bgAmbienceTex = createRichNebulaTexture(
      "45, 18, 95",
      "8, 6, 24",
      0.24
    );
    const bgAmbienceSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: bgAmbienceTex,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    bgAmbienceSprite.position.set(0, -0.18, -1.5);
    bgAmbienceSprite.scale.set(4.5, 4.5, 1);
    scene.add(bgAmbienceSprite);

    const ORB_RADIUS = 1.0;
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // 銀河面を立体的に傾け、対数らせんの美しい渦と闇のコントラストを見せる
    const galaxyTiltGroup = new THREE.Group();
    galaxyTiltGroup.rotation.x = 0.5;
    galaxyTiltGroup.rotation.z = -0.23;
    orbGroup.add(galaxyTiltGroup);

    // ============================================================================
    // 1. 渦状銀河（4,800粒子）：白飛びを抑え、紫・蒼・紅（クリムゾン）・黄金の渦腕をくっきり描く
    // ============================================================================
    const galaxyCount = 4800;
    const gRadii = new Float32Array(galaxyCount);
    const gAngles = new Float32Array(galaxyCount);
    const gHeights = new Float32Array(galaxyCount);
    const gColors = new Float32Array(galaxyCount * 3);
    const gSizes = new Float32Array(galaxyCount);
    const gPhases = new Float32Array(galaxyCount);
    const dummyPositions = new Float32Array(galaxyCount * 3);

    for (let i = 0; i < galaxyCount; i++) {
      const u = Math.random();
      // 中心に過度な密集を作って白飛びさせないよう指数を 1.25 に調整し、外縁 r = 0.92 まで優雅に広げる
      const r = 0.025 + Math.pow(u, 1.25) * 0.9;
      const armIndex = i % 4;
      const isMainArm = armIndex < 2;
      const armOffset =
        armIndex === 0
          ? 0
          : armIndex === 1
          ? Math.PI
          : armIndex === 2
          ? Math.PI * 0.5
          : Math.PI * 1.5;

      const spiralStrength = Math.min(1.0, Math.max(0.0, (r - 0.07) / 0.2));
      const randomIsoAngle = Math.random() * Math.PI * 2;
      // 渦状腕の間の「暗い宇宙の隙間（ダストレーン）」が残るようスプレッドを引き締める
      const spreadFactor = isMainArm ? 0.72 + r * 0.42 : 1.05 + r * 0.55;
      const gaussSpread =
        ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) *
        spreadFactor;
      const spiralAngle = r * 6.5 + armOffset + gaussSpread;
      const baseAngle =
        randomIsoAngle * (1.0 - spiralStrength) + spiralAngle * spiralStrength;

      const gaussY =
        (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      const thickness = 0.24 * Math.exp(-r * 2.0) + 0.04;
      const y = gaussY * thickness;

      gRadii[i] = r;
      gAngles[i] = baseAngle;
      gHeights[i] = y;
      gPhases[i] = Math.random() * Math.PI * 2;

      const cRand = Math.random();
      let cr = 1,
        cg = 1,
        cb = 1;
      if (r < 0.18) {
        // 中心バルジ：温かく輝くシャンパンゴールド＆ローズアンバー
        if (cRand < 0.6) {
          cr = 1.0;
          cg = 0.88;
          cb = 0.55; // シャンパンゴールド
        } else {
          cr = 1.0;
          cg = 0.58;
          cb = 0.74; // ローズアンバー
        }
      } else if (r < 0.56) {
        // 中間スパイラル：鮮やかなサファイア蒼 × アメジスト紫 × クリムゾン紅 × 金砂子
        if (cRand < 0.34) {
          cr = 0.28;
          cg = 0.82;
          cb = 1.0; // ルミナス・サファイアシアン
        } else if (cRand < 0.66) {
          cr = 0.78;
          cg = 0.38;
          cb = 1.0; // 艶やかなアメジスト・バイオレット（紫）
        } else if (cRand < 0.9) {
          cr = 1.0;
          cg = 0.28;
          cb = 0.62; // 魅惑的なクリムゾン・ローズ（赤紫〜紅）
        } else {
          cr = 1.0;
          cg = 0.88;
          cb = 0.48; // 金砂子の輝星
        }
      } else {
        // 外縁スパイラル：深い群青（コバルト）× 紫 × 紅の星屑
        if (cRand < 0.42) {
          cr = 0.64;
          cg = 0.32;
          cb = 0.98; // ディープアメジスト
        } else if (cRand < 0.76) {
          cr = 0.25;
          cg = 0.65;
          cb = 1.0; // 群青・コバルトブルー
        } else {
          cr = 0.96;
          cg = 0.26;
          cb = 0.56; // 深紅・ルビーローズ
        }
      }

      gColors[i * 3] = cr;
      gColors[i * 3 + 1] = cg;
      gColors[i * 3 + 2] = cb;

      gSizes[i] =
        Math.random() < 0.9
          ? 2.0 + Math.random() * 2.6
          : 4.6 + Math.random() * 3.2;
    }

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(dummyPositions, 3)
    );
    galaxyGeo.setAttribute("aRadius", new THREE.BufferAttribute(gRadii, 1));
    galaxyGeo.setAttribute("aAngle", new THREE.BufferAttribute(gAngles, 1));
    galaxyGeo.setAttribute("aHeight", new THREE.BufferAttribute(gHeights, 1));
    galaxyGeo.setAttribute("aColor", new THREE.BufferAttribute(gColors, 3));
    galaxyGeo.setAttribute("aSize", new THREE.BufferAttribute(gSizes, 1));
    galaxyGeo.setAttribute("aPhase", new THREE.BufferAttribute(gPhases, 1));

    const galaxyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aRadius;
        attribute float aAngle;
        attribute float aHeight;
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          float keplerAngularVel = 0.22 / (aRadius + 0.18);
          float currentAngle = aAngle + keplerAngularVel * uTime * 0.40;

          vec3 pos = vec3(
            cos(currentAngle) * aRadius,
            aHeight + sin(uTime * 0.65 + aPhase) * 0.007,
            sin(currentAngle) * aRadius
          );

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float twinkle = 0.75 + 0.25 * sin(uTime * 2.2 + aPhase);
          // 中心は温かく輝き、渦状腕もくっきりと浮かび上がる輝度プロファイル
          float radialProfile = 0.88 - aRadius * 0.22;
          vAlpha = radialProfile * twinkle;

          gl_PointSize = aSize * uPixelRatio * (2.65 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float core = pow(max(0.0, 1.0 - d * 2.0), 1.65);
          // 中心核のみほんのり輝度を上げ、周囲は紫・青・紅・金の純粋な彩度を保つ
          vec3 col = mix(vColor, vec3(1.0, 0.96, 0.92), pow(core, 3.5) * 0.35);
          gl_FragColor = vec4(col, core * vAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMaterial);
    galaxyTiltGroup.add(galaxyPoints);

    // ============================================================================
    // 2. ボリューメトリック星雲ヴェール（白飛びしない絶妙な透過度で紫・蒼・紅の絹の艶を添える）
    // ============================================================================
    const nebulaGroup = new THREE.Group();
    galaxyTiltGroup.add(nebulaGroup);

    // 中心核の温かい琥珀×ローズのコア光（白飛びせず、銀河の心臓部が艶やかに輝くバランス）
    const coreGlowTex = createRichNebulaTexture(
      "255, 210, 125",
      "225, 29, 95",
      0.52
    );
    const coreSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreGlowTex,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreSprite.scale.set(0.56, 0.42, 1);
    nebulaGroup.add(coreSprite);

    // 渦状腕に沿って深みと色気を与える星雲ガス（紫・青・紅のヴェール）
    const cloudConfigs = [
      // ディープバイオレット（紫）
      {
        innerRgb: "168, 85, 247",
        outerRgb: "88, 28, 135",
        count: 6,
        scale: 0.72,
        op: 0.17,
        armShift: 0.0,
      },
      // ディープサファイア（青）
      {
        innerRgb: "56, 189, 248",
        outerRgb: "29, 78, 216",
        count: 6,
        scale: 0.7,
        op: 0.16,
        armShift: 0.65,
      },
      // クリムゾン・ローズ（赤紫〜紅）
      {
        innerRgb: "244, 63, 94",
        outerRgb: "157, 23, 77",
        count: 5,
        scale: 0.62,
        op: 0.15,
        armShift: 1.3,
      },
    ];

    cloudConfigs.forEach((cfg) => {
      const tex = createRichNebulaTexture(cfg.innerRgb, cfg.outerRgb, 1.0);
      for (let i = 0; i < cfg.count; i++) {
        const frac = i / cfg.count;
        const r = 0.24 + frac * 0.58;
        const armOffset = (i % 2) * Math.PI;
        const spiralAngle = r * 5.8 + armOffset + cfg.armShift;
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: cfg.op,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        sp.position.set(
          Math.cos(spiralAngle) * r,
          (Math.sin(i * 2.7) * 0.5) * 0.1,
          Math.sin(spiralAngle) * r
        );
        sp.scale.set(cfg.scale, cfg.scale, 1);
        nebulaGroup.add(sp);
      }
    });

    // ============================================================================
    // 3. ガラス球の「下部アンダーグロウ（ぼわーっと光る光の溜まり）」＆「ピカピカと立ち昇る煌めき粒子」
    // ============================================================================
    const underglowGroup = new THREE.Group();
    orbGroup.add(underglowGroup);

    // 3-A. 球体のすぐ下に広がる幻想的なオーラの池（白飛びせず、紫・蒼・紅金がしっとり滲む露出）
    const pedestalVioletTex = createRichNebulaTexture(
      "139, 92, 246",
      "30, 58, 138",
      0.55
    );
    const pedestalRoseGoldTex = createRichNebulaTexture(
      "244, 63, 94",
      "180, 83, 9",
      0.5
    );

    // 外側の紫〜群青のぼわーっと広がる光彩
    const underSoftGlow1 = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pedestalVioletTex,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    underSoftGlow1.position.set(0, -1.14, 0);
    underSoftGlow1.scale.set(2.4, 0.68, 1);
    underglowGroup.add(underSoftGlow1);

    // 中心寄りの紅〜琥珀の艶やかな照り返し
    const underSoftGlow2 = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pedestalRoseGoldTex,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    underSoftGlow2.position.set(0, -1.06, 0.05);
    underSoftGlow2.scale.set(1.35, 0.42, 1);
    underglowGroup.add(underSoftGlow2);

    // 水平面に広がる繊細なコースティクス（集光リング波紋）シェーダー
    const causticPlaneGeo = new THREE.PlaneGeometry(2.6, 2.6, 1, 1);
    const causticShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float r = length(vUv);
          if (r > 1.0) discard;

          float angle = atan(vUv.y, vUv.x);
          float wave1 = sin(r * 15.0 - uTime * 1.3 + sin(angle * 3.0 + uTime * 0.5) * 0.5) * 0.5 + 0.5;
          float wave2 = cos(r * 10.0 - uTime * 0.8 - cos(angle * 4.0 - uTime * 0.4) * 0.5) * 0.5 + 0.5;
          float caustic = pow(wave1 * wave2, 1.6);

          float radialMask = pow(1.0 - r, 2.4);
          vec3 colInner = vec3(0.98, 0.65, 0.35); // 琥珀ゴールド
          vec3 colMid = vec3(0.90, 0.22, 0.55);   // クリムゾン・ローズ
          vec3 colOuter = vec3(0.35, 0.42, 0.98); // サファイア・バイオレット

          vec3 col = mix(colInner, colMid, smoothstep(0.0, 0.42, r));
          col = mix(col, colOuter, smoothstep(0.38, 0.85, r));

          // 白飛びさせず、波紋の筋が美しく見えるアルファ値
          float alpha = radialMask * (0.16 + caustic * 0.28);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const causticDisk = new THREE.Mesh(causticPlaneGeo, causticShaderMat);
    causticDisk.rotation.x = -Math.PI / 2;
    causticDisk.position.set(0, -1.07, 0);
    underglowGroup.add(causticDisk);

    // 3-B. ガラス球の下部で「ピカピカ」と煌めきながら立ち昇る光の粒子（180個）
    const underSparkleCount = 180;
    const uRadii = new Float32Array(underSparkleCount);
    const uAngles = new Float32Array(underSparkleCount);
    const uBaseY = new Float32Array(underSparkleCount);
    const uSpeeds = new Float32Array(underSparkleCount);
    const uPhases = new Float32Array(underSparkleCount);
    const uColors = new Float32Array(underSparkleCount * 3);
    const uSizes = new Float32Array(underSparkleCount);
    const uDummyPos = new Float32Array(underSparkleCount * 3);

    for (let i = 0; i < underSparkleCount; i++) {
      const r = 0.08 + Math.pow(Math.random(), 0.85) * 1.12;
      uRadii[i] = r;
      uAngles[i] = Math.random() * Math.PI * 2;
      uBaseY[i] = -1.2 + Math.min(0.45, r * r * 0.28);
      uSpeeds[i] = 0.35 + Math.random() * 0.55;
      uPhases[i] = Math.random() * Math.PI * 2;

      const cRand = Math.random();
      if (cRand < 0.38) {
        // シャンパンゴールド
        uColors[i * 3] = 1.0;
        uColors[i * 3 + 1] = 0.88;
        uColors[i * 3 + 2] = 0.45;
      } else if (cRand < 0.68) {
        // ルビー・ローズピンク
        uColors[i * 3] = 1.0;
        uColors[i * 3 + 1] = 0.38;
        uColors[i * 3 + 2] = 0.75;
      } else if (cRand < 0.88) {
        // サファイア・シアン
        uColors[i * 3] = 0.38;
        uColors[i * 3 + 1] = 0.82;
        uColors[i * 3 + 2] = 1.0;
      } else {
        // アメジスト・バイオレット
        uColors[i * 3] = 0.78;
        uColors[i * 3 + 1] = 0.45;
        uColors[i * 3 + 2] = 1.0;
      }

      uSizes[i] = 5.5 + Math.random() * 9.5;
    }

    const underSparkleGeo = new THREE.BufferGeometry();
    underSparkleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(uDummyPos, 3)
    );
    underSparkleGeo.setAttribute(
      "aRadius",
      new THREE.BufferAttribute(uRadii, 1)
    );
    underSparkleGeo.setAttribute(
      "aAngle",
      new THREE.BufferAttribute(uAngles, 1)
    );
    underSparkleGeo.setAttribute("aBaseY", new THREE.BufferAttribute(uBaseY, 1));
    underSparkleGeo.setAttribute(
      "aSpeed",
      new THREE.BufferAttribute(uSpeeds, 1)
    );
    underSparkleGeo.setAttribute(
      "aPhase",
      new THREE.BufferAttribute(uPhases, 1)
    );
    underSparkleGeo.setAttribute(
      "aColor",
      new THREE.BufferAttribute(uColors, 3)
    );
    underSparkleGeo.setAttribute("aSize", new THREE.BufferAttribute(uSizes, 1));

    const underSparkleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aRadius;
        attribute float aAngle;
        attribute float aBaseY;
        attribute float aSpeed;
        attribute float aPhase;
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          float life = fract(uTime * aSpeed * 0.20 + aPhase / 6.28318);
          float angle = aAngle + uTime * 0.16 * aSpeed;
          float currentR = aRadius * (0.92 + life * 0.16);
          float yOffset = life * 0.30;

          vec3 pos = vec3(
            cos(angle) * currentR,
            aBaseY + yOffset,
            sin(angle) * currentR
          );

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float flash = pow(sin(uTime * 4.0 + aPhase * 3.0) * 0.5 + 0.5, 2.0);
          float envelope = sin(life * 3.14159);
          vAlpha = envelope * (0.40 + 0.60 * flash);

          gl_PointSize = aSize * (0.80 + 0.45 * flash) * uPixelRatio * (2.6 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          // 十字の煌めきスパイクとソフトな光冠
          float crossRay = max(
            exp(-abs(uv.x) * 28.0) * exp(-abs(uv.y) * 4.5),
            exp(-abs(uv.y) * 28.0) * exp(-abs(uv.x) * 4.5)
          );
          float softGlow = pow(max(0.0, 1.0 - d * 2.0), 2.2);
          float intensity = clamp(softGlow * 0.75 + crossRay * 0.95, 0.0, 1.0);

          vec3 col = mix(vColor, vec3(1.0, 0.99, 0.95), crossRay * 0.72);
          gl_FragColor = vec4(col, intensity * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const underSparkles = new THREE.Points(underSparkleGeo, underSparkleMat);
    underglowGroup.add(underSparkles);

    // ============================================================================
    // 4. クリスタルガラス球シェーダー（内部の透明感を保ちつつ、輪郭のプリズム艶と底面反射を描く）
    // ============================================================================
    const glassGeo = new THREE.SphereGeometry(ORB_RADIUS, 72, 72);
    const glassShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          vWorldPos = position;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPos;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = abs(dot(normal, viewDir));

          // 内部の銀河・覚悟の星を曇らせないよう、輪郭（3.4乗）にシャープに光を集める
          float outerRim = pow(1.0 - ndotv, 3.4);
          float innerSheen = pow(1.0 - ndotv, 2.0) * 0.07;

          float yNorm = clamp(vWorldPos.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 topColor = vec3(0.42, 0.80, 1.0);     // 上部：澄んだサファイア・シアン
          vec3 midColor = vec3(0.75, 0.34, 0.98);    // 中部：アメジスト・バイオレット
          vec3 bottomColor = vec3(0.98, 0.45, 0.65); // 下部：ローズ・アンバー

          vec3 rimColor = mix(bottomColor, midColor, smoothstep(0.0, 0.52, yNorm));
          rimColor = mix(rimColor, topColor, smoothstep(0.50, 1.0, yNorm));

          // 底面エッジの照り返し（白飛びしないよう底の極近くに繊細に入れる）
          float bottomBounce = pow(max(0.0, -vWorldPos.y), 4.2) * (0.24 + 0.05 * sin(uTime * 1.8));
          vec3 bounceColor = vec3(1.0, 0.62, 0.45) * bottomBounce;

          // ガラス玉のハイライト：中央付近の白い曇りにならず、左上リム（輪郭）に沿ってシャープな三日月状の艶が入るよう光源角度を調整
          vec3 lightDir1 = normalize(vec3(-0.78, 0.76, 0.22));
          vec3 halfVec1 = normalize(lightDir1 + viewDir);
          float specMain = pow(max(dot(normal, halfVec1), 0.0), 96.0);

          vec3 lightDir2 = normalize(vec3(0.68, -0.72, 0.28));
          vec3 halfVec2 = normalize(lightDir2 + viewDir);
          float specSub = pow(max(dot(normal, halfVec2), 0.0), 56.0) * 0.35;

          vec3 finalColor =
            rimColor * (outerRim * 0.92 + innerSheen) +
            bounceColor +
            vec3(1.0, 0.98, 0.96) * (specMain * 0.62) +
            vec3(0.95, 0.48, 0.82) * specSub;

          float alpha = clamp(
            outerRim * 0.62 + innerSheen + bottomBounce * 0.42 + specMain * 0.50 + specSub * 0.28,
            0.0,
            0.84
          );
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const glassSphere = new THREE.Mesh(glassGeo, glassShaderMat);
    orbGroup.add(glassSphere);

    // ============================================================================
    // 5. 「覚悟の石（一等星）」グループ & 波紋パルスグループ
    // ============================================================================
    const stonesGroup = new THREE.Group();
    const pulseWavesGroup = new THREE.Group();
    orbGroup.add(stonesGroup);
    orbGroup.add(pulseWavesGroup);

    const stoneEntries = new Map<
      string,
      {
        mainStarSprite: THREE.Sprite;
        subTwinkleSprite: THREE.Sprite;
        hitMesh: THREE.Mesh;
        phase: number;
      }
    >();

    sceneCtxRef.current = {
      stonesGroup,
      pulseWavesGroup,
      stoneEntries,
    };

    // ============================================================================
    // 6. タップ（Raycaster）による「覚悟の星」選択判定
    // ============================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const handlePointerDown = (ev: PointerEvent) => {
      downPos = { x: ev.clientX, y: ev.clientY };
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) > 10)
        return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const targets: THREE.Object3D[] = [];
      stoneEntries.forEach((item) => {
        targets.push(item.hitMesh);
        targets.push(item.mainStarSprite);
      });

      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        const stoneId = hits[0].object.userData?.stoneId;
        if (stoneId) {
          const found = stonesRef.current.find((s) => s.id === stoneId);
          if (found) onSelectRef.current(found);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", handlePointerDown);
    domElem.addEventListener("pointerup", handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      const optDist = calculateOptimalCameraDistance(w, h);
      controls.maxDistance = optDist * 1.45;
      camera.position.setLength(optDist);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // ============================================================================
    // 7. アニメーションループ
    // ============================================================================
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      const deepBreath = Math.sin(elapsed * 0.85) * 0.5 + 0.5;
      underSoftGlow1.scale.set(
        2.4 + deepBreath * 0.16,
        0.68 + deepBreath * 0.06,
        1
      );
      underSoftGlow2.scale.set(
        1.35 + (1.0 - deepBreath) * 0.12,
        0.42 + (1.0 - deepBreath) * 0.05,
        1
      );

      galaxyMaterial.uniforms.uTime.value = elapsed;
      glassShaderMat.uniforms.uTime.value = elapsed;
      causticShaderMat.uniforms.uTime.value = elapsed;
      underSparkleMat.uniforms.uTime.value = elapsed;

      nebulaGroup.rotation.y = elapsed * 0.038;

      stoneEntries.forEach((item, id) => {
        const isSelected = id === selectedIdRef.current;
        const breath = Math.sin(elapsed * 1.9 + item.phase) * 0.5 + 0.5;
        const sparkleFlash = Math.pow(
          Math.sin(elapsed * 3.8 + item.phase * 1.9) * 0.5 + 0.5,
          3
        );

        const baseScale = isSelected ? 0.56 : 0.42;
        const mainScale = baseScale + breath * 0.07 + sparkleFlash * 0.1;
        item.mainStarSprite.scale.set(mainScale, mainScale, 1);

        const subScale =
          (isSelected ? 0.34 : 0.24) + (1 - breath) * 0.05 + sparkleFlash * 0.08;
        item.subTwinkleSprite.scale.set(subScale, subScale, 1);
        (item.subTwinkleSprite.material as THREE.SpriteMaterial).rotation =
          elapsed * 0.35 + item.phase;
      });

      for (let i = pulseWavesGroup.children.length - 1; i >= 0; i--) {
        const wave = pulseWavesGroup.children[i] as THREE.Mesh;
        wave.scale.addScalar(0.018);
        const mat = wave.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.95;
        if (mat.opacity < 0.01) {
          pulseWavesGroup.remove(wave);
          wave.geometry.dispose();
          mat.dispose();
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("pointerdown", handlePointerDown);
      domElem.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // 「覚悟の石（星）」データの同期
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx) return;

    const { stonesGroup, stoneEntries } = ctx;
    while (stonesGroup.children.length > 0) {
      stonesGroup.remove(stonesGroup.children[0]);
    }
    stoneEntries.clear();

    stones.forEach((stone, idx) => {
      const pos = computeStoneSectorPosition(stone, idx);
      const palette =
        STONE_STAR_PALETTE[stone.visual?.color_theme || "golden_resolve"] ||
        STONE_STAR_PALETTE.golden_resolve;

      const hitGeo = new THREE.SphereGeometry(0.11, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(pos);
      hitMesh.userData = { stoneId: stone.id };
      stonesGroup.add(hitMesh);

      const starTex = createVividStarTexture(palette);
      const mainStarSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: starTex,
          transparent: true,
          opacity: 0.98,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      mainStarSprite.position.copy(pos);
      mainStarSprite.scale.set(0.42, 0.42, 1);
      mainStarSprite.userData = { stoneId: stone.id };
      stonesGroup.add(mainStarSprite);

      const subTwinkleSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: starTex,
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      subTwinkleSprite.position.copy(pos);
      subTwinkleSprite.scale.set(0.24, 0.24, 1);
      subTwinkleSprite.userData = { stoneId: stone.id };
      stonesGroup.add(subTwinkleSprite);

      stoneEntries.set(stone.id, {
        mainStarSprite,
        subTwinkleSprite,
        hitMesh,
        phase: idx * 1.9,
      });
    });
  }, [stones]);

  // 対話時の微細な波紋パルス
  useEffect(() => {
    if (rippleTrigger === 0) return;
    const ctx = sceneCtxRef.current;
    if (!ctx) return;

    const ringGeo = new THREE.RingGeometry(0.08, 0.095, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    wave.rotation.x = Math.PI / 2;
    ctx.pulseWavesGroup.add(wave);
  }, [rippleTrigger]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-0"
    />
  );
};
