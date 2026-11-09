// Three.js カスタムGLSLシェーダーによる「A. 渦状銀河・星雲コア（ガラス球の中の天の川）」レンダラー
// - スマホ縦画面でも球体が横幅の約55%に美しく収まり、周囲に深い漆黒の余白（ネガティブスペース）を確保
// - 3,600個の微細恒星ダストが「中心核の白熱プラチナ〜シャンパンゴールド」から「サファイア〜淡い紫紅の渦状腕」へと濃淡を作る
// - ケプラー差動回転（中心ほど速く、外縁ほどゆったり回る）をGLSL頂点シェーダーで計算し、いつまで見ていても飽きない有機的な銀河のゆらぎを実現
// - ガラス球の輪郭はカスタムフレネル反射シェーダーで極薄のプリズム光をまとい、16分割セクター内に「覚悟の石」が一等星（回折スパイク）として輝く

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

const STONE_GLOW_RGB: Record<StoneColorTheme, string> = {
  golden_resolve: "253, 224, 115",
  sapphire_zen: "147, 197, 253",
  emerald_glow: "167, 243, 208",
  lotus_warm: "249, 168, 212",
};

// 星雲のソフトガステクスチャ生成
function createSoftGlowTexture(rgb: string, alphaPeak = 1.0): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 1, half, half, half);
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

// ジェイムズ・ウェッブ宇宙望遠鏡風の繊細な回折スパイク（一等星＝覚悟の石）テクスチャ
function createDiffractionStarTexture(rgb: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;

  // 1. 中心の白熱コアと色彩ハロ
  const hg = ctx.createRadialGradient(half, half, 1, half, half, half * 0.85);
  hg.addColorStop(0, "rgba(255, 255, 255, 1)");
  hg.addColorStop(0.12, "rgba(255, 253, 245, 0.95)");
  hg.addColorStop(0.28, `rgba(${rgb}, 0.78)`);
  hg.addColorStop(0.6, `rgba(${rgb}, 0.18)`);
  hg.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, size, size);

  // 2. 鋭く繊細な十字の回折スパイク（縦横メイン光条＋斜めサブ光条）
  ctx.save();
  ctx.translate(half, half);
  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    const rg = ctx.createLinearGradient(-half, 0, half, 0);
    rg.addColorStop(0, "rgba(255, 255, 255, 0)");
    rg.addColorStop(0.35, `rgba(${rgb}, 0.35)`);
    rg.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
    rg.addColorStop(0.65, `rgba(${rgb}, 0.35)`);
    rg.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rg;
    ctx.fillRect(-half, -1.6, size, 3.2);
  }
  ctx.rotate(Math.PI / 4);
  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    const rg2 = ctx.createLinearGradient(-half * 0.55, 0, half * 0.55, 0);
    rg2.addColorStop(0, "rgba(255, 255, 255, 0)");
    rg2.addColorStop(0.5, `rgba(${rgb}, 0.45)`);
    rg2.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rg2;
    ctx.fillRect(-half * 0.55, -1.0, size * 0.55, 2.0);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 球体内部（半径 ORB_RADIUS = 1.0）の16分割セクター（8オクタント × 内外2層）の3D座標を計算
function computeStoneSectorPosition(
  stone: SavedResolutionStone,
  index: number
): THREE.Vector3 {
  const themeSectorMap: Record<StoneColorTheme, number> = {
    golden_resolve: 0,
    sapphire_zen: 1,
    emerald_glow: 2,
    lotus_warm: 3,
  };
  const baseQuad =
    themeSectorMap[stone.visual?.color_theme || "golden_resolve"] ?? index % 4;
  const octantIndex = (baseQuad + index) % 8;
  const layerIndex = Math.floor(index / 8) % 2;

  const lonQuadrant = octantIndex % 4;
  const isUpper = octantIndex < 4 ? 1 : -1;

  const seed = index * 2.3999632 + (stone.id.charCodeAt(6) || 0) * 0.19;
  const phi = lonQuadrant * (Math.PI / 2) + Math.PI / 4 + Math.sin(seed) * 0.34;
  const elevation = isUpper * 0.34 + Math.cos(seed * 1.3) * 0.18;
  const r = (layerIndex === 0 ? 0.44 : 0.68) + Math.sin(seed * 0.7) * 0.06;

  return new THREE.Vector3(
    r * Math.cos(elevation) * Math.cos(phi),
    r * Math.sin(elevation),
    r * Math.cos(elevation) * Math.sin(phi)
  );
}

// スマホの縦長画面でもガラス球（半径1.0）が画面横幅の約55%に余裕をもって収まるカメラ距離を算出
function calculateOptimalCameraDistance(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  const fovRad = (42 * Math.PI) / 180;
  // 横幅に対して直径2.0の球体が約54%を占めるように距離を計算
  const targetWidthWorld = 2.0 / 0.54; // ≈ 3.70
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
    stoneSprites: Map<
      string,
      {
        sprite: THREE.Sprite;
        coreMesh: THREE.Mesh;
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
    // 渦状銀河の美しい立体感が見えるよう、斜め上（俯瞰角 約24度）からガラス球を見つめる初期アングル
    camera.position.set(0, initialDist * 0.38, initialDist * 0.92);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
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
    controls.minDistance = 1.65; // ピンチアウトで銀河の内部・覚悟の石の間近までズームイン可能
    controls.maxDistance = initialDist * 1.45;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    // 画面のわずかに上（中心より少し上）にガラス球を据え、下部ボタンとの間に美しい余白を作る
    controls.target.set(0, -0.06, 0);

    const ORB_RADIUS = 1.0;
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // ============================================================================
    // 1. 渦状銀河（天の川）コア & ケプラー差動回転カスタムシェーダー（3,800粒子）
    // ============================================================================
    const galaxyCount = 3800;
    const gRadii = new Float32Array(galaxyCount);
    const gAngles = new Float32Array(galaxyCount);
    const gHeights = new Float32Array(galaxyCount);
    const gColors = new Float32Array(galaxyCount * 3);
    const gSizes = new Float32Array(galaxyCount);
    const gPhases = new Float32Array(galaxyCount);
    const dummyPositions = new Float32Array(galaxyCount * 3);

    for (let i = 0; i < galaxyCount; i++) {
      // 中心核（バルジ）ほど高密度になるべき乗分布
      const t = Math.pow(Math.random(), 1.75);
      const r = 0.02 + t * 0.88; // ガラス球（R=1.0）の内部 0.02〜0.90 に完全に収める
      const arm = i % 3;
      const armOffset = (arm * Math.PI * 2) / 3;
      // 渦状腕の広がり（中心は凝縮、外側は緩やかに散開）
      const spread = (Math.random() - 0.5) * (0.42 + r * 0.68);
      const baseAngle = r * 5.4 + armOffset + spread;

      // 銀河の厚み（中心バルジは球状、外側は扁平ディスク＋星団のうねり）
      const clusterWave = Math.sin(baseAngle * 3.0) * 0.08;
      const y =
        (Math.random() - 0.5) * (0.36 * (1.0 - r * 0.62)) +
        clusterWave * (Math.random() - 0.5);

      gRadii[i] = r;
      gAngles[i] = baseAngle;
      gHeights[i] = y;
      gPhases[i] = Math.random() * Math.PI * 2;

      // 天体物理学の黒体放射に基づく恒星カラー階層
      const cRand = Math.random();
      let cr = 1,
        cg = 1,
        cb = 1;
      if (r < 0.24) {
        // 中心核（バルジ）：白熱するプラチナホワイト〜シャンパンゴールド
        if (cRand > 0.32) {
          cr = 1.0;
          cg = 0.97;
          cb = 0.88;
        } else {
          cr = 0.99;
          cg = 0.84;
          cb = 0.51;
        }
      } else if (r < 0.6) {
        // 中間渦状腕：O/B型青白星・サファイア星雲光・黄白星
        if (cRand < 0.55) {
          cr = 0.76;
          cg = 0.88;
          cb = 1.0;
        } else if (cRand < 0.8) {
          cr = 1.0;
          cg = 0.92;
          cb = 0.76;
        } else {
          cr = 0.65;
          cg = 0.72;
          cb = 0.99;
        }
      } else {
        // 外縁腕：ディープサファイア・淡いラベンダー紫紅（星間塵）・淡琥珀
        if (cRand < 0.5) {
          cr = 0.49;
          cg = 0.69;
          cb = 0.96;
        } else if (cRand < 0.82) {
          cr = 0.77;
          cg = 0.63;
          cb = 0.92;
        } else {
          cr = 0.96;
          cg = 0.82;
          cb = 0.69;
        }
      }

      gColors[i * 3] = cr;
      gColors[i * 3 + 1] = cg;
      gColors[i * 3 + 2] = cb;

      // 92%は繊細な星塵、8%がきらめく恒星
      gSizes[i] =
        Math.random() < 0.92
          ? 2.2 + Math.random() * 3.2
          : 5.8 + Math.random() * 4.5;
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
          // ケプラー差動回転（中心ほど速く、外縁ほどゆったり回転）
          float keplerAngularVel = 0.22 / (aRadius + 0.16);
          float currentAngle = aAngle + keplerAngularVel * uTime * 0.45;

          vec3 pos = vec3(
            cos(currentAngle) * aRadius,
            aHeight + sin(uTime * 0.8 + aPhase) * 0.008,
            sin(currentAngle) * aRadius
          );

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float twinkle = 0.72 + 0.28 * sin(uTime * 2.6 + aPhase);
          vAlpha = (1.0 - aRadius * 0.42) * twinkle;

          gl_PointSize = aSize * uPixelRatio * (2.6 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          // 中心が白熱し、周囲が滑らかに減衰する恒星プロファイル
          float intensity = pow(1.0 - d * 2.0, 1.8);
          vec3 col = mix(vColor, vec3(1.0), pow(1.0 - d * 2.0, 4.0) * 0.5);
          gl_FragColor = vec4(col, intensity * vAlpha * 0.88);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMaterial);
    orbGroup.add(galaxyPoints);

    // ============================================================================
    // 2. ボリューメトリック星雲ガス雲 & 銀河中心核（バルジ）の柔光スプライト
    // ============================================================================
    const nebulaGroup = new THREE.Group();
    orbGroup.add(nebulaGroup);

    // 中心バルジの荘厳なシャンパンゴールド光核
    const coreTex = createSoftGlowTexture("255, 245, 215", 0.75);
    const coreSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreSprite.scale.set(0.85, 0.65, 1);
    nebulaGroup.add(coreSprite);

    // 渦状腕に沿って漂う星雲ガス雲（コバルト・バイオレット・琥珀・深翠）
    const cloudConfigs = [
      { rgb: "30, 64, 175", count: 8, scale: 0.72, op: 0.14 },
      { rgb: "88, 28, 135", count: 6, scale: 0.65, op: 0.11 },
      { rgb: "180, 83, 9", count: 5, scale: 0.52, op: 0.12 },
      { rgb: "15, 118, 110", count: 5, scale: 0.58, op: 0.1 },
    ];
    cloudConfigs.forEach((cfg, cIdx) => {
      const tex = createSoftGlowTexture(cfg.rgb, 1.0);
      for (let i = 0; i < cfg.count; i++) {
        const r = 0.18 + (i / cfg.count) * 0.55;
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
          (Math.random() - 0.5) * 0.18,
          Math.sin(a) * r
        );
        sp.scale.set(cfg.scale, cfg.scale, 1);
        nebulaGroup.add(sp);
      }
    });

    // ============================================================================
    // 3. 光学フレネル反射ガラス球（カスタムシェーダー：中心は透明、輪郭に極薄のプリズム光）
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

          // 左上からの繊細なスペキュラハイライト（水晶・ガラスの艶）
          vec3 lightDir = normalize(vec3(-0.55, 0.72, 0.65));
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);

          // 輪郭のプリズムカラー（サファイアブルー〜シャンパンゴールドの極薄の縁取り）
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

    const stoneSprites = new Map<
      string,
      {
        sprite: THREE.Sprite;
        coreMesh: THREE.Mesh;
        phase: number;
      }
    >();

    sceneCtxRef.current = {
      stonesGroup,
      pulseWavesGroup,
      stoneSprites,
    };

    // ============================================================================
    // 5. タップ（Raycaster）による「覚悟の石」選択判定
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
      stoneSprites.forEach((item) => {
        targets.push(item.sprite);
        targets.push(item.coreMesh);
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

      // 銀河シェーダーの時間更新（ケプラー差動回転）
      galaxyMaterial.uniforms.uTime.value = elapsed;
      nebulaGroup.rotation.y = elapsed * 0.04;

      // 覚悟の石（一等星）の繊細な呼吸・きらめき
      stoneSprites.forEach((item, id) => {
        const isSelected = id === selectedIdRef.current;
        const pulse = Math.sin(elapsed * 2.6 + item.phase) * 0.5 + 0.5;
        const baseScale = isSelected ? 0.34 : 0.24;
        const s = baseScale + pulse * 0.08;
        item.sprite.scale.set(s, s, 1);
        const mat = item.sprite.material as THREE.SpriteMaterial;
        mat.opacity = isSelected ? 1.0 : 0.82 + pulse * 0.18;
      });

      // 波紋パルスの更新
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

  // 「覚悟の石」データの同期（銀河内の16分割セクターに一等星として配置）
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx) return;

    const { stonesGroup, stoneSprites } = ctx;
    while (stonesGroup.children.length > 0) {
      stonesGroup.remove(stonesGroup.children[0]);
    }
    stoneSprites.clear();

    stones.forEach((stone, idx) => {
      const pos = computeStoneSectorPosition(stone, idx);
      const rgb =
        STONE_GLOW_RGB[stone.visual?.color_theme || "golden_resolve"] ||
        STONE_GLOW_RGB.golden_resolve;

      // タップ判定用の透明コア球
      const hitGeo = new THREE.SphereGeometry(0.075, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const coreMesh = new THREE.Mesh(hitGeo, hitMat);
      coreMesh.position.copy(pos);
      coreMesh.userData = { stoneId: stone.id };
      stonesGroup.add(coreMesh);

      // 一等星の回折スパイクスプライト
      const tex = createDiffractionStarTexture(rgb);
      const spMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spMat);
      sprite.position.copy(pos);
      sprite.scale.set(0.26, 0.26, 1);
      sprite.userData = { stoneId: stone.id };
      stonesGroup.add(sprite);

      stoneSprites.set(stone.id, {
        sprite,
        coreMesh,
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
