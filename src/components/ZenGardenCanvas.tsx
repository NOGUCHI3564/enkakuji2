// Three.js 3D「心の宇宙球（8分割/16分割ガラス天球儀 & 覚悟の石）」レンダラー
// - 深い宇宙空間と地球の大気圏を感じさせる透明なガラスの球体（心の宇宙）
// - 直交する3本の天球リング（赤道・子午線2本）による8分割（オクタント）＋内外2層の計16分割セクター構造
// - 各セクターの3次元座標に、小さく精巧な輝星・結晶粒としてピカピカ点滅する「覚悟の石」を配置
// - スマホの1本指ドラッグで360度回転、2本指ピンチ（またはホイール）で球体内部へズームイン・拡大、石のタップで詳細表示

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  LightMood,
  SavedResolutionStone,
  SoundType,
  StoneColorTheme,
  StoneShapeType,
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

const MOOD_COLORS: Record<
  LightMood,
  {
    bgHex: number;
    fogHex: number;
    atmosphereHex: number;
    ringHex: number;
    coreHex: number;
  }
> = {
  amber_calm: {
    bgHex: 0x030712,
    fogHex: 0x071022,
    atmosphereHex: 0x38bdf8,
    ringHex: 0xfbbf24,
    coreHex: 0xf59e0b,
  },
  moon_accept: {
    bgHex: 0x020611,
    fogHex: 0x061529,
    atmosphereHex: 0x60a5fa,
    ringHex: 0x7dd3fc,
    coreHex: 0x38bdf8,
  },
  ocean_deep: {
    bgHex: 0x02050e,
    fogHex: 0x051226,
    atmosphereHex: 0x3b82f6,
    ringHex: 0x93c5fd,
    coreHex: 0x60a5fa,
  },
  gold_resolute: {
    bgHex: 0x040711,
    fogHex: 0x0a1324,
    atmosphereHex: 0x38bdf8,
    ringHex: 0xfde047,
    coreHex: 0xfbbf24,
  },
  sakura_compassion: {
    bgHex: 0x050511,
    fogHex: 0x110e24,
    atmosphereHex: 0x818cf8,
    ringHex: 0xf9a8d4,
    coreHex: 0xf472b6,
  },
};

const STONE_THEME_HEX: Record<
  StoneColorTheme,
  { main: number; emissive: number; halo: string }
> = {
  golden_resolve: {
    main: 0xfef08a,
    emissive: 0xf59e0b,
    halo: "251, 191, 36",
  },
  emerald_glow: {
    main: 0xa7f3d0,
    emissive: 0x10b981,
    halo: "52, 211, 153",
  },
  sapphire_zen: {
    main: 0xbfdbfe,
    emissive: 0x3b82f6,
    halo: "96, 165, 250",
  },
  lotus_warm: {
    main: 0xfbcfe8,
    emissive: 0xec4899,
    halo: "244, 114, 182",
  },
};

// ピカピカ光る十字スパークル・後光スプライト用テクスチャをCanvasで動的生成
function createSparkleTexture(rgbString: string): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const half = size / 2;

  // 中心のソフトな丸い後光
  const radGrad = ctx.createRadialGradient(half, half, 1, half, half, half);
  radGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  radGrad.addColorStop(0.22, `rgba(${rgbString}, 0.92)`);
  radGrad.addColorStop(0.55, `rgba(${rgbString}, 0.28)`);
  radGrad.addColorStop(1, `rgba(${rgbString}, 0)`);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, size, size);

  // 十字のきらめき光条（スターバースト）
  ctx.save();
  ctx.translate(half, half);
  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    const rayGrad = ctx.createLinearGradient(-half, 0, half, 0);
    rayGrad.addColorStop(0, "rgba(255,255,255,0)");
    rayGrad.addColorStop(0.42, `rgba(${rgbString}, 0.5)`);
    rayGrad.addColorStop(0.5, "rgba(255,255,255,0.98)");
    rayGrad.addColorStop(0.58, `rgba(${rgbString}, 0.5)`);
    rayGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rayGrad;
    ctx.fillRect(-half, -1.8, size, 3.6);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 球体内部の16分割セクター（8オクタント × 内外2層）の3次元座標を計算する
// 球の半径は R = 1.48。石がガラス球から飛び出さないよう r = 0.52 〜 1.08 の範囲に配置。
function computeStone3DPosition(
  stone: SavedResolutionStone,
  index: number
): THREE.Vector3 {
  // 8つのオクタント（経度4分割 × 南北2半球）の基準角
  const themeSectorMap: Record<StoneColorTheme, number> = {
    golden_resolve: 0, // 第1象限（黄金・不生の覚悟）
    sapphire_zen: 1, // 第2象限（蒼・受容と静寂）
    emerald_glow: 2, // 第3象限（翠・突破と実践）
    lotus_warm: 3, // 第4象限（蓮華・慈悲と感謝）
  };

  const baseQuad =
    themeSectorMap[stone.visual?.color_theme || "golden_resolve"] ?? index % 4;
  // インデックスと組み合わせることで16分割セクター（8オクタント×内外2層）に美しく分散
  const octantIndex = (baseQuad + index) % 8;
  const layerIndex = Math.floor(index / 8) % 2; // 0: 内層, 1: 外層（計16分割）

  const lonQuadrant = octantIndex % 4; // 0, 1, 2, 3
  const isUpperHemisphere = octantIndex < 4 ? 1 : -1; // +1: 北半球, -1: 南半球

  // 同じセクターに複数の石が入った場合の微少オフセット（黄金角）
  const jitterSeed = index * 2.3999632 + (stone.id.charCodeAt(6) || 0) * 0.17;
  const phiCenter = lonQuadrant * (Math.PI / 2) + Math.PI / 4;
  const phi = phiCenter + Math.sin(jitterSeed) * 0.36; // 経度

  const elevCenter = isUpperHemisphere * 0.46; // 緯度（赤道リングや極軸と重ならない中緯度）
  const elevation = elevCenter + Math.cos(jitterSeed * 1.3) * 0.22;

  // 内層（r ≈ 0.62）と外層（r ≈ 0.96）の2層で16分割領域を形成
  const radius =
    (layerIndex === 0 ? 0.64 : 0.98) + Math.sin(jitterSeed * 0.7) * 0.08;

  const x = radius * Math.cos(elevation) * Math.cos(phi);
  const y = radius * Math.sin(elevation);
  const z = radius * Math.cos(elevation) * Math.sin(phi);

  return new THREE.Vector3(x, y, z);
}

function createStoneGeometry(shape: StoneShapeType): THREE.BufferGeometry {
  switch (shape) {
    case "crystal_zen":
      return new THREE.OctahedronGeometry(0.068, 0);
    case "standing_monolith":
      return new THREE.DodecahedronGeometry(0.065, 0);
    case "moss_jewel":
      return new THREE.IcosahedronGeometry(0.066, 0);
    default:
      return new THREE.OctahedronGeometry(0.065, 1);
  }
}

export const ZenGardenCanvas: React.FC<ZenGardenCanvasProps> = ({
  lightMood,
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

  // シーン内オブジェクトの参照保持
  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    orbGroup: THREE.Group;
    stonesGroup: THREE.Group;
    constellationGroup: THREE.Group;
    pulseWavesGroup: THREE.Group;
    stoneMeshes: Map<
      string,
      {
        group: THREE.Group;
        mesh: THREE.Mesh;
        haloSprite: THREE.Sprite;
        ringMesh: THREE.Mesh;
        phase: number;
      }
    >;
    ringMaterials: THREE.LineBasicMaterial[];
    atmosphereMat: THREE.MeshBasicMaterial;
    coreSprite: THREE.Sprite;
  } | null>(null);

  // 1. Three.js シーンの初期化
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x050b1a, 0.065);

    // カメラ配置：スマホ縦画面でもガラス球全体が中央に美しく収まり、ピンチで球体内部までズームイン可能
    const isPortrait = width < height;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.35, isPortrait ? 5.1 : 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // OrbitControls（1本指で360度回転、2本指ピンチまたはホイールで拡大縮小）
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.85; // ピンチアウトで球体内部の石のすぐ近くまで拡大可能
    controls.maxDistance = 7.2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    // 球体の中心を画面のわずかに上（下部ボタンと重ならない黄金位置）に合わせる
    controls.target.set(0, -0.08, 0);

    // 照明
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    mainLight.position.set(4, 6, 5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-5, -4, -3);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0xfbbf24, 1.8, 5);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // --- A. 背景の宇宙空間（3D星空パーティクル 900個） ---
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 6 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // 青白い星・金色の星・白い星をブレンド
      const colorPick = Math.random();
      if (colorPick < 0.35) {
        starColors[i * 3] = 0.75;
        starColors[i * 3 + 1] = 0.88;
        starColors[i * 3 + 2] = 1.0;
      } else if (colorPick < 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 2] = 0.98;
        starColors[i * 3 + 1] = 0.95;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- B. 心の宇宙球（透明なガラス球体 & 8分割/16分割の天球儀グリッド） ---
    const orbGroup = new THREE.Group();
    const ORB_RADIUS = 1.48;

    // 1. 外側の透明ガラス球体（地球・心の水滴のような透明感と反射）
    const glassGeo = new THREE.SphereGeometry(ORB_RADIUS, 64, 64);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.16,
      roughness: 0.06,
      metalness: 0.08,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const glassSphere = new THREE.Mesh(glassGeo, glassMat);
    orbGroup.add(glassSphere);

    // 2. 地球の大気圏のような背面リムグロー球
    const atmosGeo = new THREE.SphereGeometry(ORB_RADIUS * 1.035, 48, 48);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.09,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosSphere = new THREE.Mesh(atmosGeo, atmosphereMat);
    orbGroup.add(atmosSphere);

    // 3. 球体を8分割（オクタント）＋内外2層（16分割）に切り分ける直交3リングと内層球
    const ringMaterials: THREE.LineBasicMaterial[] = [];
    const createCircleLine = (
      radius: number,
      rotX: number,
      rotY: number,
      opacity: number,
      hexColor: number
    ) => {
      const segs = 96;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
        );
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      ringMaterials.push(m);
      const line = new THREE.Line(g, m);
      line.rotation.set(rotX, rotY, 0);
      return line;
    };

    // 外層（ガラス球面）の直交3大円（球を8分割＝8オクタントに分ける境界線）
    // ① 赤道リング（天と地・上下半球を分ける）
    orbGroup.add(
      createCircleLine(ORB_RADIUS * 0.998, Math.PI / 2, 0, 0.36, 0xfbbf24)
    );
    // ② 子午線リングA（東西を分ける）
    orbGroup.add(createCircleLine(ORB_RADIUS * 0.998, 0, 0, 0.25, 0x7dd3fc));
    // ③ 子午線リングB（南北を分ける）
    orbGroup.add(
      createCircleLine(ORB_RADIUS * 0.998, 0, Math.PI / 2, 0.25, 0x7dd3fc)
    );

    // 内層（半径0.78）の分割リング（外層8分割 × 内層8分割 ＝ 16分割の立体グリッド）
    const INNER_RADIUS = 0.78;
    orbGroup.add(
      createCircleLine(INNER_RADIUS, Math.PI / 2, 0, 0.18, 0xfde047)
    );
    orbGroup.add(createCircleLine(INNER_RADIUS, 0, 0, 0.12, 0x93c5fd));
    orbGroup.add(
      createCircleLine(INNER_RADIUS, 0, Math.PI / 2, 0.12, 0x93c5fd)
    );

    // 中心の極軸（天と地を貫く微細な光の軸）
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -ORB_RADIUS, 0),
      new THREE.Vector3(0, ORB_RADIUS, 0),
    ]);
    const axisMat = new THREE.LineBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    orbGroup.add(new THREE.Line(axisGeo, axisMat));

    // 球体の中心核（不生の仏心を表す微細な光核）
    const coreTex = createSparkleTexture("251, 191, 36");
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreSprite = new THREE.Sprite(coreMat);
    coreSprite.scale.set(0.32, 0.32, 1);
    orbGroup.add(coreSprite);

    // 覚悟の石グループ & 石同士を結ぶ星座ライングループ & 波紋パルスグループ
    const stonesGroup = new THREE.Group();
    const constellationGroup = new THREE.Group();
    const pulseWavesGroup = new THREE.Group();
    orbGroup.add(stonesGroup);
    orbGroup.add(constellationGroup);
    orbGroup.add(pulseWavesGroup);

    scene.add(orbGroup);

    const stoneMeshes = new Map<
      string,
      {
        group: THREE.Group;
        mesh: THREE.Mesh;
        haloSprite: THREE.Sprite;
        ringMesh: THREE.Mesh;
        phase: number;
      }
    >();

    sceneObjectsRef.current = {
      scene,
      camera,
      controls,
      orbGroup,
      stonesGroup,
      constellationGroup,
      pulseWavesGroup,
      stoneMeshes,
      ringMaterials,
      atmosphereMat,
      coreSprite,
    };

    // --- C. タップ（Raycaster）による3D空間内の「覚悟の石」選択判定 ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const handlePointerUp = (ev: PointerEvent) => {
      const moveDist = Math.hypot(
        ev.clientX - pointerDownPos.x,
        ev.clientY - pointerDownPos.y
      );
      // ドラッグ回転ではなくタップ（移動距離10px以内）の場合のみ判定
      if (moveDist > 10) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const hitTargets: THREE.Object3D[] = [];
      stoneMeshes.forEach((item) => {
        hitTargets.push(item.mesh);
        hitTargets.push(item.haloSprite);
      });

      const intersects = raycaster.intersectObjects(hitTargets, false);
      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const stoneId = hitObj.userData?.stoneId;
        if (stoneId) {
          const found = stonesRef.current.find((s) => s.id === stoneId);
          if (found) {
            onSelectRef.current(found);
          }
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", handlePointerDown);
    domElem.addEventListener("pointerup", handlePointerUp);

    // リサイズ対応
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      // 縦長画面と横長画面で球体の収まりを自動調整
      if (camera.position.length() > 3.5) {
        camera.position.setLength(w < h ? 5.1 : 4.2);
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- D. アニメーションループ ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      // 宇宙の星々をゆっくり回転
      starField.rotation.y = elapsed * 0.015;
      starField.rotation.x = Math.sin(elapsed * 0.05) * 0.04;

      // 中心核の呼吸
      const coreBreath = 0.28 + (Math.sin(elapsed * 1.6) * 0.5 + 0.5) * 0.14;
      coreSprite.scale.set(coreBreath, coreBreath, 1);

      // 各「覚悟の石」のピカピカ点滅（きらめき）と自転アニメーション
      stoneMeshes.forEach((item, id) => {
        const isSelected = id === selectedIdRef.current;
        const pulse = Math.sin(elapsed * 3.4 + item.phase) * 0.5 + 0.5;
        const fastTwinkle = Math.pow(
          Math.sin(elapsed * 5.2 + item.phase * 1.7) * 0.5 + 0.5,
          3
        );

        // 結晶の自転
        item.mesh.rotation.y += 0.018;
        item.mesh.rotation.x += 0.01;

        // ピカピカと光るスプライトのサイズと輝度変化（大きすぎず、鋭く美しく輝く）
        const baseHaloScale = isSelected ? 0.42 : 0.28;
        const haloScale =
          baseHaloScale + pulse * 0.12 + fastTwinkle * 0.14;
        item.haloSprite.scale.set(haloScale, haloScale, 1);

        const spriteMat = item.haloSprite.material as THREE.SpriteMaterial;
        spriteMat.opacity = isSelected
          ? 0.98
          : 0.65 + pulse * 0.25 + fastTwinkle * 0.1;

        // 選択中の石またはパルスリングの回転
        item.ringMesh.rotation.z = elapsed * 0.9 + item.phase;
        item.ringMesh.rotation.x = Math.PI / 3 + Math.sin(elapsed + item.phase) * 0.2;
        const ringScale = isSelected ? 1.45 + pulse * 0.25 : 0.9 + pulse * 0.15;
        item.ringMesh.scale.set(ringScale, ringScale, ringScale);
      });

      // 波紋パルス（対話進行時などに中心から広がる3D球面リング）の更新
      for (let i = pulseWavesGroup.children.length - 1; i >= 0; i--) {
        const wave = pulseWavesGroup.children[i] as THREE.Mesh;
        wave.scale.addScalar(0.025);
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

  // 2. 「覚悟の石」リストが変わったときに、16分割セクター内の3D結晶と星座ラインを更新
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const { stonesGroup, constellationGroup, stoneMeshes } = ctx;

    // 既存の石メッシュをクリア
    while (stonesGroup.children.length > 0) {
      const child = stonesGroup.children[0];
      stonesGroup.remove(child);
    }
    while (constellationGroup.children.length > 0) {
      const child = constellationGroup.children[0];
      constellationGroup.remove(child);
    }
    stoneMeshes.clear();

    const positions: THREE.Vector3[] = [];

    stones.forEach((stone, idx) => {
      const pos = computeStone3DPosition(stone, idx);
      positions.push(pos);

      const theme =
        STONE_THEME_HEX[stone.visual?.color_theme || "golden_resolve"] ||
        STONE_THEME_HEX.golden_resolve;

      const group = new THREE.Group();
      group.position.copy(pos);

      // 1. 小さく精巧な3D多面体クリスタル（スマホ画面で邪魔にならず、拡大すると結晶面が美しく見えるサイズ）
      const geo = createStoneGeometry(
        stone.visual?.shape_type || "crystal_zen"
      );
      const mat = new THREE.MeshPhysicalMaterial({
        color: theme.main,
        emissive: theme.emissive,
        emissiveIntensity: 1.35,
        roughness: 0.12,
        metalness: 0.2,
        clearcoat: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { stoneId: stone.id };
      group.add(mesh);

      // 2. ピカピカと点滅する十字スターバースト光条スプライト（タップ判定も兼ねる）
      const sparkleTex = createSparkleTexture(theme.halo);
      const haloMat = new THREE.SpriteMaterial({
        map: sparkleTex,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloSprite = new THREE.Sprite(haloMat);
      haloSprite.scale.set(0.32, 0.32, 1);
      haloSprite.userData = { stoneId: stone.id };
      group.add(haloSprite);

      // 3. 石の周囲を回る極細の軌道リング（拡大した時に惑星の輪のように見える）
      const ringGeo = new THREE.RingGeometry(0.095, 0.105, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: theme.main,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      group.add(ringMesh);

      stonesGroup.add(group);
      stoneMeshes.set(stone.id, {
        group,
        mesh,
        haloSprite,
        ringMesh,
        phase: idx * 1.7,
      });
    });

    // 石が2個以上ある場合は、石と石を極細の光の糸（星座ライン）で結ぶ
    if (positions.length >= 2) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(positions);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      });
      const constellationLine = new THREE.Line(lineGeo, lineMat);
      constellationGroup.add(constellationLine);
    }

    // 中心核から各覚悟の石へ伸びる微細な光の放射線（どのセクターに属しているかが立体的に分かる）
    positions.forEach((pos) => {
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        pos,
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
      });
      constellationGroup.add(new THREE.Line(rayGeo, rayMat));
    });
  }, [stones]);

  // 3. 対話ムード（lightMood）の切り替え連動
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;
    const palette = MOOD_COLORS[lightMood] || MOOD_COLORS.amber_calm;
    ctx.scene.background = new THREE.Color(palette.bgHex);
    ctx.scene.fog = new THREE.FogExp2(palette.fogHex, 0.065);
    ctx.atmosphereMat.color.setHex(palette.atmosphereHex);
  }, [lightMood]);

  // 4. 対話アクション時の3D光の波紋パルス演出
  useEffect(() => {
    if (rippleTrigger === 0) return;
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const ringGeo = new THREE.RingGeometry(0.15, 0.18, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    wave.rotation.x = Math.random() * Math.PI;
    wave.rotation.y = Math.random() * Math.PI;
    ctx.pulseWavesGroup.add(wave);
  }, [rippleTrigger]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-0"
    />
  );
};
