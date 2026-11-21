import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type HumanSoldierRole =
  | 'swordsman'
  | 'spearman'
  | 'archer'
  | 'cavalry_rider'
  | 'elephant_rider'
  | 'guard'
  | 'farmer'
  | 'smith';

export interface SkinnedSoldierRig {
  hips: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  head: THREE.Bone;
  leftUpperArm: THREE.Bone;
  leftForearm: THREE.Bone;
  rightUpperArm: THREE.Bone;
  rightForearm: THREE.Bone;
  leftThigh: THREE.Bone;
  leftShin: THREE.Bone;
  rightThigh: THREE.Bone;
  rightShin: THREE.Bone;
}

let cachedRiggedBodyGeo: THREE.BufferGeometry | null = null;
let loadPromise: Promise<boolean> | null = null;
const loadListeners = new Set<() => void>();

export function onSoldierBaseLoaded(cb: () => void): () => void {
  loadListeners.add(cb);
  return () => loadListeners.delete(cb);
}

export function isSoldierBaseReady(): boolean {
  return cachedRiggedBodyGeo !== null;
}

/**
 * Tải model người từ /models/soldier_base.glb (chỉ lấy mesh Body_body_0, bỏ toàn bộ quần áo cũ)
 * và gắn trọng số xương (skinIndex, skinWeight) cho 12 khớp xương giải phẫu.
 */
export function preloadSoldierBaseModel(): Promise<boolean> {
  if (cachedRiggedBodyGeo) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      '/models/soldier_base.glb',
      (gltf) => {
        let foundGeo: THREE.BufferGeometry | null = null;
        gltf.scene.traverse((obj) => {
          if (foundGeo) return;
          if (obj instanceof THREE.Mesh && obj.name === 'Body_body_0') {
            foundGeo = obj.geometry.clone();
          }
        });

        if (!foundGeo) {
          resolve(false);
          return;
        }

        const geo = foundGeo as THREE.BufferGeometry;
        // Chuyển Z-up -> Y-up và đưa tâm về (0, 0, 0)
        geo.rotateX(-Math.PI / 2);
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const centerX = (bb.min.x + bb.max.x) / 2;
        const centerZ = (bb.min.z + bb.max.z) / 2;
        geo.translate(-centerX, -bb.min.y, -centerZ);
        geo.computeVertexNormals();

        // Gắn skinIndex & skinWeight cho 12 xương:
        // 0:hips, 1:spine, 2:chest, 3:head, 4:L_upperArm, 5:L_forearm,
        // 6:R_upperArm, 7:R_forearm, 8:L_thigh, 9:L_shin, 10:R_thigh, 11:R_shin
        const pos = geo.getAttribute('position');
        const count = pos.count;
        const skinIndices = new Uint16Array(count * 4);
        const skinWeights = new Float32Array(count * 4);

        const setW = (idx: number, b0: number, w0: number, b1 = 0, w1 = 0) => {
          const sum = w0 + w1 || 1;
          skinIndices[idx * 4] = b0;
          skinIndices[idx * 4 + 1] = b1;
          skinWeights[idx * 4] = w0 / sum;
          skinWeights[idx * 4 + 1] = w1 / sum;
        };

        for (let i = 0; i < count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);

          // Tay trái (x < -0.18, y > 0.92)
          if (x < -0.18 && y > 0.92 && y < 1.34) {
            if (x < -0.44) {
              const t = Math.min(1, (-0.44 - x) / 0.12);
              setW(i, 5, 0.5 + t * 0.5, 4, 0.5 - t * 0.5);
            } else {
              const t = Math.min(1, (-0.18 - x) / 0.14);
              setW(i, 4, 0.4 + t * 0.6, 2, 0.6 - t * 0.6);
            }
            continue;
          }

          // Tay phải (x > 0.18, y > 0.92)
          if (x > 0.18 && y > 0.92 && y < 1.34) {
            if (x > 0.44) {
              const t = Math.min(1, (x - 0.44) / 0.12);
              setW(i, 7, 0.5 + t * 0.5, 6, 0.5 - t * 0.5);
            } else {
              const t = Math.min(1, (x - 0.18) / 0.14);
              setW(i, 6, 0.4 + t * 0.6, 2, 0.6 - t * 0.6);
            }
            continue;
          }

          // Chân trái & phải (y < 0.78)
          if (y < 0.78) {
            const isLeft = x < 0;
            const thigh = isLeft ? 8 : 10;
            const shin = isLeft ? 9 : 11;
            if (y < 0.36) {
              setW(i, shin, 1);
            } else if (y < 0.46) {
              const t = (0.46 - y) / 0.1;
              setW(i, shin, t, thigh, 1 - t);
            } else if (y < 0.7) {
              setW(i, thigh, 1);
            } else {
              const t = (0.78 - y) / 0.08;
              setW(i, thigh, t, 0, 1 - t);
            }
            continue;
          }

          // Đầu & Cổ (y >= 1.27)
          if (y >= 1.27) {
            const t = Math.min(1, (y - 1.27) / 0.08);
            setW(i, 3, t, 2, 1 - t);
            continue;
          }

          // Thân (hips -> spine -> chest)
          if (y < 0.94) {
            const t = Math.max(0, (y - 0.78) / 0.16);
            setW(i, 1, t, 0, 1 - t);
          } else {
            const t = Math.min(1, (y - 0.94) / 0.2);
            setW(i, 2, t, 1, 1 - t);
          }
        }

        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        cachedRiggedBodyGeo = geo;
        loadListeners.forEach((cb) => cb());
        resolve(true);
      },
      undefined,
      () => resolve(false)
    );
  });

  return loadPromise;
}

const gearMatCache = new Map<string, THREE.MeshStandardMaterial>();
function getGearMat(key: string, color: number, roughness = 0.75, metalness = 0.05): THREE.MeshStandardMaterial {
  const hit = gearMatCache.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  gearMatCache.set(key, mat);
  return mat;
}

function createSkinnedSkeleton(): { rootBone: THREE.Bone; bones: THREE.Bone[]; rig: SkinnedSoldierRig } {
  const hips = new THREE.Bone(); hips.position.set(0, 0.78, 0);
  const spine = new THREE.Bone(); spine.position.set(0, 0.16, 0);
  const chest = new THREE.Bone(); chest.position.set(0, 0.2, 0);
  const head = new THREE.Bone(); head.position.set(0, 0.18, 0);

  const leftUpperArm = new THREE.Bone(); leftUpperArm.position.set(-0.18, 0.03, 0);
  const leftForearm = new THREE.Bone(); leftForearm.position.set(-0.26, 0, 0);
  const rightUpperArm = new THREE.Bone(); rightUpperArm.position.set(0.18, 0.03, 0);
  const rightForearm = new THREE.Bone(); rightForearm.position.set(0.26, 0, 0);

  const leftThigh = new THREE.Bone(); leftThigh.position.set(-0.11, -0.02, 0);
  const leftShin = new THREE.Bone(); leftShin.position.set(0, -0.36, 0);
  const rightThigh = new THREE.Bone(); rightThigh.position.set(0.11, -0.02, 0);
  const rightShin = new THREE.Bone(); rightShin.position.set(0, -0.36, 0);

  hips.add(spine, leftThigh, rightThigh);
  spine.add(chest);
  chest.add(head, leftUpperArm, rightUpperArm);
  leftUpperArm.add(leftForearm);
  rightUpperArm.add(rightForearm);
  leftThigh.add(leftShin);
  rightThigh.add(rightShin);

  const bones = [
    hips,
    spine,
    chest,
    head,
    leftUpperArm,
    leftForearm,
    rightUpperArm,
    rightForearm,
    leftThigh,
    leftShin,
    rightThigh,
    rightShin,
  ];

  const rig: SkinnedSoldierRig = {
    hips,
    spine,
    chest,
    head,
    leftUpperArm,
    leftForearm,
    rightUpperArm,
    rightForearm,
    leftThigh,
    leftShin,
    rightThigh,
    rightShin,
  };

  return { rootBone: hips, bones, rig };
}

/**
 * Tạo model nhân vật từ .glb gốc + xương khớp + trang phục binh lính thời nhà Lê
 */
export function createRiggedLeSoldier(
  role: HumanSoldierRole,
  faction: 'lam_son' | 'ming' = 'lam_son',
  scale = 0.52
): THREE.Group | null {
  if (!cachedRiggedBodyGeo) return null;

  const container = new THREE.Group();
  const { rootBone, bones, rig } = createSkinnedSkeleton();

  const skinBodyMat = getGearMat('stickman_skin', 0xe5be9a, 0.72, 0.02);
  const skinnedMesh = new THREE.SkinnedMesh(cachedRiggedBodyGeo, skinBodyMat);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.add(rootBone);

  const skeleton = new THREE.Skeleton(bones);
  skinnedMesh.bind(skeleton);
  container.add(skinnedMesh);

  // Hạ tay từ chữ T xuống tư thế tự nhiên
  rig.leftUpperArm.rotation.z = 1.24;
  rig.rightUpperArm.rotation.z = -1.24;

  const isMing = faction === 'ming';
  const tunicMat = getGearMat(
    role === 'farmer' ? 'tunic_farmer' : role === 'smith' ? 'tunic_smith' : isMing ? 'tunic_ming' : 'tunic_le',
    role === 'farmer' ? 0x8a6d4b : role === 'smith' ? 0x52341d : isMing ? 0x26538d : 0xb91c1c,
    0.78
  );
  const armorMat = getGearMat(isMing ? 'armor_ming' : 'armor_le', isMing ? 0x3b4048 : 0x564433, 0.55, 0.35);
  const goldMat = getGearMat('brass_gold', 0xe6b83a, 0.32, 0.65);
  const steelMat = getGearMat('blade_steel', 0xd1d8e0, 0.25, 0.78);
  const woodMat = getGearMat('gear_wood', 0x6b4226, 0.85);
  const strawMat = getGearMat('nonla_straw', 0xd6b365, 0.9);
  const bambooMat = getGearMat('nonla_rim', 0xb8a363, 0.85);

  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };

  // === TRANG PHỤC THỜI NHÀ LÊ GẮN TRỰC TIẾP VÀO XƯƠNG ===
  // 1. Áo chiến bào & Quần/Xà cạp
  const skirt = mk(new THREE.CylinderGeometry(0.19, 0.25, 0.34, 12), tunicMat);
  skirt.position.set(0, -0.02, 0);
  rig.hips.add(skirt);

  const chestTunic = mk(new RoundedBoxGeometry(0.38, 0.36, 0.28, 2, 0.06), tunicMat);
  chestTunic.position.set(0, 0.04, 0);
  rig.spine.add(chestTunic);

  // Xà cạp bọc ống chân
  for (const shinBone of [rig.leftShin, rig.rightShin]) {
    const wrap = mk(new THREE.CylinderGeometry(0.085, 0.075, 0.28, 8), woodMat);
    wrap.position.set(0, -0.18, 0);
    shinBone.add(wrap);
  }

  // 2. Giáp trụ xếp lớp thời Lê (nếu là binh lính/lính gác)
  if (role !== 'farmer' && role !== 'smith') {
    const breastplate = mk(new RoundedBoxGeometry(0.4, 0.34, 0.31, 2, 0.04), armorMat);
    breastplate.position.set(0, -0.02, 0);
    rig.chest.add(breastplate);

    const collarTrim = mk(new RoundedBoxGeometry(0.42, 0.06, 0.33, 2, 0.02), goldMat);
    collarTrim.position.set(0, 0.12, 0);
    rig.chest.add(collarTrim);

    // Giáp vai gắn vào xương cánh tay trên
    const pL = mk(new THREE.SphereGeometry(0.12, 8, 6), armorMat);
    pL.position.set(-0.04, 0.04, 0);
    rig.leftUpperArm.add(pL);

    const pR = mk(new THREE.SphereGeometry(0.12, 8, 6), armorMat);
    pR.position.set(0.04, 0.04, 0);
    rig.rightUpperArm.add(pR);

    // Thắt lưng da khóa đồng & Bao đao đeo bên hông trái
    const belt = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.075, 12), woodMat);
    belt.position.set(0, 0.05, 0);
    rig.hips.add(belt);

    const buckle = mk(new RoundedBoxGeometry(0.09, 0.08, 0.05, 1, 0.01), goldMat);
    buckle.position.set(0, 0.05, 0.22);
    rig.hips.add(buckle);

    const hipSword = new THREE.Group();
    hipSword.position.set(-0.23, 0.03, 0.02);
    hipSword.rotation.x = -0.65;
    hipSword.add(mk(new RoundedBoxGeometry(0.045, 0.06, 0.56, 1, 0.01), woodMat).translateZ(-0.14));
    hipSword.add(mk(new RoundedBoxGeometry(0.055, 0.07, 0.05, 1, 0.01), goldMat).translateZ(0.04));
    hipSword.add(mk(new THREE.CylinderGeometry(0.022, 0.024, 0.18, 6), woodMat).rotateX(Math.PI / 2).translateZ(0.2));
    hipSword.add(mk(new THREE.SphereGeometry(0.035, 6, 6), goldMat).translateZ(0.3));
    rig.hips.add(hipSword);
  }

  // 3. Đầu đội Nón Lá (hoặc Mũ sắt Minh)
  if (!isMing && role !== 'smith') {
    const nonLa = mk(new THREE.ConeGeometry(0.34, 0.2, 16), strawMat);
    nonLa.position.set(0, 0.28, 0);
    const rim = mk(new THREE.TorusGeometry(0.335, 0.014, 5, 18), bambooMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.18, 0);
    rig.head.add(nonLa, rim);
  } else if (isMing) {
    const helm = mk(new THREE.ConeGeometry(0.24, 0.22, 12), armorMat);
    helm.position.set(0, 0.27, 0);
    const tip = mk(new THREE.SphereGeometry(0.04, 8, 6), goldMat);
    tip.position.set(0, 0.39, 0);
    rig.head.add(helm, tip);
  }

  // 4. Vũ khí gắn vào cẳng tay phải / trái
  if (role === 'swordsman') {
    const blade = mk(new RoundedBoxGeometry(0.03, 0.52, 0.09, 1, 0.008), steelMat);
    blade.position.set(-0.22, -0.18, 0.12);
    blade.rotation.x = 0.6;
    rig.rightForearm.add(blade);

    const shield = mk(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 14), woodMat);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0.22, -0.08, 0.08);
    rig.leftForearm.add(shield);
  } else if (role === 'spearman' || role === 'guard' || role === 'cavalry_rider') {
    const spear = new THREE.Group();
    spear.position.set(-0.24, 0, 0.04);
    spear.rotation.z = -1.24; // Bù góc hạ tay để giáo hướng thẳng đứng/chéo lên
    spear.add(mk(new THREE.CylinderGeometry(0.022, 0.026, 1.55, 6), woodMat).translateY(0.25));
    spear.add(mk(new THREE.CylinderGeometry(0.032, 0.032, 0.06, 7), goldMat).translateY(1.0));
    spear.add(mk(new THREE.ConeGeometry(0.055, 0.24, 6), steelMat).translateY(1.14));
    rig.rightForearm.add(spear);
  } else if (role === 'archer') {
    const bow = mk(new THREE.TorusGeometry(0.32, 0.022, 6, 12, Math.PI), woodMat);
    bow.rotation.y = Math.PI / 2;
    bow.position.set(0.22, 0, 0.14);
    rig.leftForearm.add(bow);
  } else if (role === 'farmer') {
    const hoe = mk(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), woodMat);
    hoe.position.set(-0.22, 0.1, 0.04);
    hoe.rotation.z = -1.24;
    rig.rightForearm.add(hoe);
  } else if (role === 'smith') {
    const hammer = mk(new RoundedBoxGeometry(0.18, 0.12, 0.12, 1, 0.02), armorMat);
    hammer.position.set(-0.22, 0, 0.12);
    rig.rightForearm.add(hammer);
  }

  container.scale.set(scale, scale, scale);
  container.userData.skinnedRig = rig;
  return container;
}

export function animateRiggedSoldierWalk(
  group: THREE.Group,
  phase: number,
  isMoving: boolean,
  isMounted = false
): void {
  const rig = group.userData.skinnedRig as SkinnedSoldierRig | undefined;
  if (!rig) return;

  if (isMounted) {
    rig.leftThigh.rotation.x = -0.85;
    rig.rightThigh.rotation.x = -0.85;
    rig.leftThigh.rotation.z = -0.35;
    rig.rightThigh.rotation.z = 0.35;
    rig.leftShin.rotation.x = 0.95;
    rig.rightShin.rotation.x = 0.95;
    return;
  }

  if (!isMoving) {
    rig.leftThigh.rotation.x = 0;
    rig.rightThigh.rotation.x = 0;
    rig.leftShin.rotation.x = 0;
    rig.rightShin.rotation.x = 0;
    rig.leftUpperArm.rotation.x = 0;
    rig.rightUpperArm.rotation.x = -0.15;
    rig.leftForearm.rotation.z = 0.15;
    rig.rightForearm.rotation.z = -0.15;
    rig.hips.position.y = 0.78;
    rig.spine.rotation.y = 0;
    return;
  }

  const s = Math.sin(phase);
  const c = Math.cos(phase);
  rig.leftThigh.rotation.x = s * 0.62;
  rig.rightThigh.rotation.x = -s * 0.62;
  rig.leftShin.rotation.x = Math.max(0, -s) * 0.65;
  rig.rightShin.rotation.x = Math.max(0, s) * 0.65;

  rig.leftUpperArm.rotation.x = -s * 0.45;
  rig.rightUpperArm.rotation.x = s * 0.25 - 0.18;
  rig.leftForearm.rotation.y = Math.max(0, s) * 0.35;
  rig.rightForearm.rotation.y = -Math.max(0, -s) * 0.25;

  rig.hips.position.y = 0.78 + Math.abs(c) * 0.04;
  rig.spine.rotation.y = s * 0.08;
  rig.head.rotation.y = -s * 0.05;
}
