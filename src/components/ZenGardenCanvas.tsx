// Three.js カスタムGLSLシェーダーによる「A. 渦状銀河・星雲コア（ガラス球の中の天の川）」レンダラー
// Playwright 実機スクリーンショット評価に基づき以下を徹底改善:
// 1. 銀河中心の不自然な縦筋を解消し、斜め28度に傾いた流麗な対数らせん銀河（4,200恒星）に改良
// 2. 「覚悟の石（覚悟の星）」が加算合成で白飛びしないよう、色彩豊かなブルーム（光冠）と色付きの鋭い十字光条（回折スパイク）を精緻に描画
// 3. ガラス球の8分割/16分割セクター全体に立体的に星を配置し、一目でそれぞれの星の美しい色とキラメキが分かるように設計

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

// 各「覚悟の星」の色彩パレット（白飛びを防ぎ、星そのものの色が鮮やかに匂い立つ配色）
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
    midRgb: "255, 190, 30", // 濃密な黄金アンバー
    outerRgb: "217, 119, 6", // 深い琥珀ブルーム
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
    midRgb: "244, 114, 182", // 鮮やかな紅蓮ロータスピンク
    outerRgb: "157, 23, 77", // 深いマゼンタ・バイオレットブルーム
    spikeRgb: "249, 168, 212",
  },
};

// 星雲のソフトガステクスチャ生成
function createSoftGlowTexture(
  rgb: string,
  alphaPeak = 1.0
): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, `rgba(${rgb}, ${alphaPeak})`);
  g.addColorStop(0.35, `rgba(${rgb}, ${alphaPeak * 0.45})`);
  g.addColorStop(0.7, `rgba(${rgb}, ${alphaPeak * 0.12})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
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

  // 1. 外側にふんわり滲む色彩ブルーム（光冠：半径 240px）
  // 中心を白く塗りつぶさず、鮮やかな色（midRgb〜outerRgb）で包む
  const bloomGrad = ctx.createRadialGradient(half, half, 2, half, half, half * 0.92);
  bloomGrad.addColorStop(0, `rgba(${palette.midRgb}, 0.88)`);
  bloomGrad.addColorStop(0.14, `rgba(${palette.midRgb}, 0.58)`);
  bloomGrad.addColorStop(0.36, `rgba(${palette.outerRgb}, 0.26)`);
  bloomGrad.addColorStop(0.68, `rgba(${palette.outerRgb}, 0.06)`);
  bloomGrad.addColorStop(1, `rgba(${palette.outerRgb}, 0)`);
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. 鋭く伸びる色付きの回折スパイク（先端に向かって細くなる針状の光芒）
  const drawRay = (angle: number, len: number, width: number, alpha: number) => {
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

  // 3. 中心の極小ピンポイント輝核（白い丸に見えないよう半径10px以下に絞る）
  const pinGrad = ctx.createRadialGradient(half, half, 0, half, half, 11);
  pinGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  pinGrad.addColorStop(0.45, `rgba(${palette.coreRgb}, 0.92)`);
  pinGrad.addColorStop(1, `rgba(${palette.midRgb}, 0)`);
  ctx.fillStyle = pinGrad;
  ctx.beginPath();
  ctx.arc(half, half, 11, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 球体内部（半径 ORB_RADIUS = 1.0）の8分割/16分割セクター全体に左右・上下・前後バランスよく立体配置
function computeStoneSectorPosition(
  _stone: SavedResolutionStone,
  index: number
): THREE.Vector3 {
  // 8つのオクタント（右上前、左上奥、左下前、右下奥、左上前、右上奥、右下前、左下奥）に順番に割り振る
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
  const layer = Math.floor(index / 8) % 2; // 0: 内層, 1: 外層（計16分割）
  const seed = index * 1.6180339;

  const baseDist = layer === 0 ? 0.34 : 0.45;
  const x = oct.sx * (baseDist + Math.sin(seed) * 0.07);
  const y = oct.sy * (baseDist * 0.82 + Math.cos(seed * 1.3) * 0.06);
  const z = oct.sz * (baseDist + Math.sin(seed * 0.7) * 0.07);

  return new THREE.Vector3(x, y, z);
}

function calculateOptimalCameraDistance(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  const fovRad = (42 * Math.PI) / 180;
  const targetWidthWorld = 2.0 / 0.54;
  const distForWidth =
    targetWidthWorld / (2 * Math.tan(fovRad / 2) * Math.min(1, aspect));
  return Math.max(4.4, Math.min(8.5, distForWidth));
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
    scene.background = new THREE.Color(0x020308);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const initialDist = calculateOptimalCameraDistance(width, height);
    camera.position.set(0, initialDist * 0.34, initialDist * 0.94);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.minDistance = 1.65;
    controls.maxDistance = initialDist * 1.45;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.target.set(0, -0.05, 0);

    const ORB_RADIUS = 1.0;
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // 銀河面を斜め（X軸26度・Z軸-14度）に傾けたグループに入れ、正面から見たときに渦状腕が立体的に美しく広がるようにする
    const galaxyTiltGroup = new THREE.Group();
    galaxyTiltGroup.rotation.x = 0.46;
    galaxyTiltGroup.rotation.z = -0.22;
    orbGroup.add(galaxyTiltGroup);

    // ============================================================================
    // 1. 渦状銀河（天の川）コア & ケプラー差動回転カスタムシェーダー（4,200粒子）
    // ============================================================================
    const galaxyCount = 4200;
    const gRadii = new Float32Array(galaxyCount);
    const gAngles = new Float32Array(galaxyCount);
    const gHeights = new Float32Array(galaxyCount);
    const gColors = new Float32Array(galaxyCount * 3);
    const gSizes = new Float32Array(galaxyCount);
    const gPhases = new Float32Array(galaxyCount);
    const dummyPositions = new Float32Array(galaxyCount * 3);

    for (let i = 0; i < galaxyCount; i++) {
      // 中心に縦線が入らないよう、極小半径時は360度等方的な楕円バルジにし、r > 0.15 から2本の対数渦状腕へ滑らかに遷移させる
      const u = Math.random();
      const r = 0.015 + Math.pow(u, 1.65) * 0.86;
      const arm = i % 2; // 2本の主渦状腕＋サブ腕で天の川らしい優雅なスパイラルを形成
      const armOffset = arm * Math.PI;

      // 中心付近（r < 0.18）は全方向に丸く広がり、外側ほど渦状腕に収束する
      const spiralStrength = Math.min(1.0, Math.max(0.0, (r - 0.08) / 0.25));
      const randomIsoAngle = Math.random() * Math.PI * 2;
      const gaussSpread =
        ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) *
        (1.35 + r * 0.8);
      const spiralAngle = r * 6.2 + armOffset + gaussSpread;
      const baseAngle =
        randomIsoAngle * (1.0 - spiralStrength) + spiralAngle * spiralStrength;

      // 厚みもガウス分布で滑らかにし、不自然な切れ目を防ぐ
      const gaussY =
        (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      const thickness = 0.28 * Math.exp(-r * 2.2) + 0.045;
      const y = gaussY * thickness;

      gRadii[i] = r;
      gAngles[i] = baseAngle;
      gHeights[i] = y;
      gPhases[i] = Math.random() * Math.PI * 2;

      const cRand = Math.random();
      let cr = 1,
        cg = 1,
        cb = 1;
      if (r < 0.22) {
        // 中心バルジ：温かみのあるシャンパンゴールド〜プラチナ
        if (cRand > 0.35) {
          cr = 1.0;
          cg = 0.94;
          cb = 0.8;
        } else {
          cr = 0.98;
          cg = 0.8;
          cb = 0.45;
        }
      } else if (r < 0.58) {
        // 中間腕：サファイアブルー〜青白星〜淡い琥珀
        if (cRand < 0.58) {
          cr = 0.68;
          cg = 0.85;
          cb = 1.0;
        } else if (cRand < 0.82) {
          cr = 0.98;
          cg = 0.9;
          cb = 0.75;
        } else {
          cr = 0.52;
          cg = 0.68;
          cb = 0.98;
        }
      } else {
        // 外縁腕：ディープコバルト・ラベンダー星間塵
        if (cRand < 0.55) {
          cr = 0.42;
          cg = 0.64;
          cb = 0.96;
        } else if (cRand < 0.85) {
          cr = 0.72;
          cg = 0.58;
          cb = 0.92;
        } else {
          cr = 0.92;
          cg = 0.78;
          cb = 0.65;
        }
      }

      gColors[i * 3] = cr;
      gColors[i * 3 + 1] = cg;
      gColors[i * 3 + 2] = cb;

      // 銀河の微細星：中心から渦状腕の流れが美しく浮かび上がるサイズと輝度
      gSizes[i] =
        Math.random() < 0.92
          ? 2.1 + Math.random() * 2.8
          : 4.8 + Math.random() * 3.4;
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
          // ケプラー差動回転
          float keplerAngularVel = 0.20 / (aRadius + 0.18);
          float currentAngle = aAngle + keplerAngularVel * uTime * 0.42;

          vec3 pos = vec3(
            cos(currentAngle) * aRadius,
            aHeight + sin(uTime * 0.7 + aPhase) * 0.006,
            sin(currentAngle) * aRadius
          );

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float twinkle = 0.75 + 0.25 * sin(uTime * 2.4 + aPhase);
          vAlpha = (0.85 - aRadius * 0.35) * twinkle;

          gl_PointSize = aSize * uPixelRatio * (2.5 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float intensity = pow(1.0 - d * 2.0, 1.8);
          gl_FragColor = vec4(vColor, intensity * vAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMaterial);
    galaxyTiltGroup.add(galaxyPoints);

    // ============================================================================
    // 2. ボリューメトリック星雲ガス雲 & 銀河中心核（バルジ）の柔光スプライト
    // ============================================================================
    const nebulaGroup = new THREE.Group();
    galaxyTiltGroup.add(nebulaGroup);

    const coreTex = createSoftGlowTexture("255, 225, 165", 0.42);
    const coreSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreTex,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreSprite.scale.set(0.68, 0.52, 1);
    nebulaGroup.add(coreSprite);

    const cloudConfigs = [
      { rgb: "30, 64, 175", count: 7, scale: 0.68, op: 0.12 },
      { rgb: "88, 28, 135", count: 5, scale: 0.6, op: 0.09 },
      { rgb: "180, 83, 9", count: 4, scale: 0.48, op: 0.09 },
    ];
    cloudConfigs.forEach((cfg, cIdx) => {
      const tex = createSoftGlowTexture(cfg.rgb, 1.0);
      for (let i = 0; i < cfg.count; i++) {
        const r = 0.2 + (i / cfg.count) * 0.52;
        const a = i * 2.1 + cIdx * 1.4;
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
          Math.cos(a) * r,
          (Math.random() - 0.5) * 0.14,
          Math.sin(a) * r
        );
        sp.scale.set(cfg.scale, cfg.scale, 1);
        nebulaGroup.add(sp);
      }
    });

    // ============================================================================
    // 3. 光学フレネル反射ガラス球（カスタムシェーダー）
    // ============================================================================
    const glassGeo = new THREE.SphereGeometry(ORB_RADIUS, 64, 64);
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
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPos;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.4);

          vec3 lightDir = normalize(vec3(-0.55, 0.72, 0.65));
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);

          vec3 rimColor = mix(
            vec3(0.45, 0.75, 0.98),
            vec3(0.99, 0.90, 0.68),
             clamp(vWorldPos.y * 0.6 + 0.5, 0.0, 1.0)
          );

          vec3 finalColor = rimColor * fresnel * 0.85 + vec3(1.0, 0.99, 0.95) * spec * 0.38;
          float alpha = clamp(fresnel * 0.52 + spec * 0.32, 0.0, 0.75);
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
    // 4. 「覚悟の石（一等星）」グループ & 波紋パルスグループ
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
    // 5. タップ（Raycaster）による「覚悟の星」選択判定
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
    // 6. アニメーションループ
    // ============================================================================
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      galaxyMaterial.uniforms.uTime.value = elapsed;
      nebulaGroup.rotation.y = elapsed * 0.035;

      // 各「覚悟の星」のピカピカ瞬くシンチレーションとブルーム呼吸
      stoneEntries.forEach((item, id) => {
        const isSelected = id === selectedIdRef.current;
        const breath = Math.sin(elapsed * 2.4 + item.phase) * 0.5 + 0.5;
        const sparkleFlash = Math.pow(
          Math.sin(elapsed * 5.2 + item.phase * 1.9) * 0.5 + 0.5,
          3
        );

        const baseScale = isSelected ? 0.56 : 0.42;
        const mainScale = baseScale + breath * 0.08 + sparkleFlash * 0.12;
        item.mainStarSprite.scale.set(mainScale, mainScale, 1);

        const subScale =
          (isSelected ? 0.36 : 0.25) + (1 - breath) * 0.06 + sparkleFlash * 0.1;
        item.subTwinkleSprite.scale.set(subScale, subScale, 1);
        (item.subTwinkleSprite.material as THREE.SpriteMaterial).rotation =
          elapsed * 0.45 + item.phase;
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

      // タップ判定用メッシュ（完全不可視にして白い丸が一切出ないようにする）
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

      // メインの一等星スプライト（色彩ブルーム＋鋭い回折スパイクを1枚に統合し、中心の白飛びを防止）
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
      mainStarSprite.scale.set(0.44, 0.44, 1);
      mainStarSprite.userData = { stoneId: stone.id };
      stonesGroup.add(mainStarSprite);

      // 回転してピカピカ感を出すセカンダリ光条（中心が白飛びしないよう控えめなopacityで重ねる）
      const subTwinkleSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: starTex,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      subTwinkleSprite.position.copy(pos);
      subTwinkleSprite.scale.set(0.26, 0.26, 1);
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
