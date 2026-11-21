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

interface CachedArmorPart {
  name: string;
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}

let cachedRiggedBodyGeo: THREE.BufferGeometry | null = null;
let cachedShirtShellGeo: THREE.BufferGeometry | null = null;
let cachedPantsShellGeo: THREE.BufferGeometry | null = null;
let cachedArmorParts: CachedArmorPart[] = [];
let loadPromise: Promise<boolean> | null = null;
const loadListeners = new Set<() => void>();

/**
 * Tạo lớp áo/giáp ôm sát thân từ chính lưới Body_body_0 (đẩy đỉnh ra ngoài theo pháp tuyến)
 */
function buildBodyShellGeo(
  srcGeo: THREE.BufferGeometry,
  inflate: number,
  predicate: (x: number, y: number, z: number) => boolean
): THREE.BufferGeometry {
  const nonIdx = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo;
  const pos = nonIdx.getAttribute('position');
  const norm = nonIdx.getAttribute('normal');
  const si = nonIdx.getAttribute('skinIndex');
  const sw = nonIdx.getAttribute('skinWeight');

  const outPos: number[] = [];
  const outNorm: number[] = [];
  const outSi: number[] = [];
  const outSw: number[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    if (!predicate(cx, cy, cz)) continue;

    for (let k = 0; k < 3; k++) {
      const idx = i + k;
      const nx = norm.getX(idx);
      const ny = norm.getY(idx);
      const nz = norm.getZ(idx);
      outPos.push(pos.getX(idx) + nx * inflate, pos.getY(idx) + ny * inflate, pos.getZ(idx) + nz * inflate);
      outNorm.push(nx, ny, nz);
      outSi.push(si.getX(idx), si.getY(idx), si.getZ(idx), si.getW(idx));
      outSw.push(sw.getX(idx), sw.getY(idx), sw.getZ(idx), sw.getW(idx));
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(outNorm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSi, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSw, 4));
  return g;
}

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
        cachedShirtShellGeo = buildBodyShellGeo(
          geo,
          0.014,
          (x, y) =>
            (y >= 0.76 && y <= 1.26 && Math.abs(x) < 0.22) ||
            (Math.abs(x) >= 0.16 && Math.abs(x) <= 0.56 && y >= 0.92 && y <= 1.34)
        );
        cachedPantsShellGeo = buildBodyShellGeo(
          geo,
          0.015,
          (_x, y) => y >= 0.1 && y <= 0.78
        );

        // Tải thêm model giáp trụ /models/soldier_armor.glb và skin lên cùng 12 xương
        loader.load(
          '/models/soldier_armor.glb',
          (armorGltf) => {
            armorGltf.scene.updateMatrixWorld(true);
            const parts: CachedArmorPart[] = [];
            const scaleArmor = 0.88;

            armorGltf.scene.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const partName = obj.parent?.name || obj.name;
              const g = obj.geometry.clone();
              g.applyMatrix4(obj.matrixWorld);
              g.scale(scaleArmor, scaleArmor, scaleArmor);

              const pPos = g.getAttribute('position');
              const vCount = pPos.count;
              const sIdx = new Uint16Array(vCount * 4);
              const sWgt = new Float32Array(vCount * 4);

              const assignW = (idx: number, b0: number, w0: number, b1 = 0, w1 = 0) => {
                const sum = w0 + w1 || 1;
                sIdx[idx * 4] = b0;
                sIdx[idx * 4 + 1] = b1;
                sWgt[idx * 4] = w0 / sum;
                sWgt[idx * 4 + 1] = w1 / sum;
              };

              const isArmPart = partName === 'Arm_low' || partName === 'hand1_low';
              if (isArmPart) {
                // Xoay tay giáp từ A-pose lên T-pose để trùng khớp xương cánh tay
                const rotAngle = 0.72;
                const cosA = Math.cos(rotAngle);
                const sinA = Math.sin(rotAngle);
                for (let i = 0; i < vCount; i++) {
                  const vx = pPos.getX(i);
                  const vy = pPos.getY(i);
                  const isLeft = vx < 0;
                  const pivX = isLeft ? -0.18 : 0.18;
                  const pivY = 1.03;
                  const dx = vx - pivX;
                  const dy = vy - pivY;
                  // Trái: xoay theo -rotAngle; Phải: xoay theo +rotAngle
                  const rx = isLeft ? dx * cosA + dy * sinA : dx * cosA - dy * sinA;
                  const ry = isLeft ? -dx * sinA + dy * cosA : dx * sinA + dy * cosA;
                  pPos.setXY(i, pivX + rx + (isLeft ? -0.05 : 0.05), 1.19 + ry);
                }
                pPos.needsUpdate = true;
                g.computeVertexNormals();
              }

              for (let i = 0; i < vCount; i++) {
                const vx = pPos.getX(i);
                const vy = pPos.getY(i);

                if (
                  partName === 'boridge_low' ||
                  partName === 'top_low' ||
                  partName === 'main_low' ||
                  partName === 'tridge_low'
                ) {
                  assignW(i, 3, 1); // head
                } else if (partName === 'Neck_low' || partName === 'shoulder_strap_low' || partName === 'chest_low') {
                  assignW(i, 2, 1); // chest
                } else if (partName === 'Body_piece_low') {
                  const t = Math.max(0, Math.min(1, (vy - 0.94) / 0.2));
                  assignW(i, 2, t, 1, 1 - t); // chest <-> spine
                } else if (partName === 'belt_low' || partName === 'Waist_cushion1_low' || partName === 'foohead_low') {
                  const t = Math.max(0, Math.min(1, (vy - 0.86) / 0.14));
                  assignW(i, 1, t, 0, 1 - t); // spine <-> hips
                } else if (
                  partName === 'Side_skirt1_low' ||
                  partName === 'Side_skirt2_low' ||
                  partName === 'Side_skirt3_low'
                ) {
                  if (vy >= 0.8) {
                    assignW(i, 0, 1); // hips
                  } else {
                    const thigh = vx < 0 ? 8 : 10;
                    const t = Math.max(0, Math.min(1, (0.8 - vy) / 0.18)) * 0.72;
                    assignW(i, thigh, t, 0, 1 - t);
                  }
                } else if (partName === 'Shoulder3_low') {
                  const upperArm = vx < 0 ? 4 : 6;
                  const t = Math.max(0, Math.min(1, (Math.abs(vx) - 0.16) / 0.12));
                  assignW(i, upperArm, t, 2, 1 - t);
                } else if (isArmPart) {
                  assignW(i, vx < 0 ? 5 : 7, 1); // leftForearm / rightForearm
                } else if (
                  partName === 'leg_low' ||
                  partName === 'shoes_main1_low' ||
                  partName === 'sole_low' ||
                  partName === 'shoes_top_low'
                ) {
                  assignW(i, vx < 0 ? 9 : 11, 1); // leftShin / rightShin
                } else {
                  assignW(i, 0, 1);
                }
              }

              g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
              g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sWgt, 4));

              const origMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
              parts.push({ name: partName, geo: g, mat: origMat });
            });

            cachedArmorParts = parts;
            loadListeners.forEach((cb) => cb());
            resolve(true);
          },
          undefined,
          () => {
            loadListeners.forEach((cb) => cb());
            resolve(true);
          }
        );
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

  const pantsMat = getGearMat(
    role === 'farmer' ? 'pants_farmer' : role === 'smith' ? 'pants_smith' : isMing ? 'pants_ming' : 'pants_le',
    role === 'farmer' ? 0x4b3b2b : role === 'smith' ? 0x332924 : isMing ? 0x1e293b : 0x2c221e,
    0.85
  );

  // === QUẦN ÁO VẢI ÔM SÁT THÂN NGƯỜI (CHỖ KHÔNG CÓ GIÁP MẶC QUẦN/ÁO VẢI) ===
  if (cachedShirtShellGeo) {
    const shirtMesh = new THREE.SkinnedMesh(cachedShirtShellGeo, tunicMat);
    shirtMesh.castShadow = true;
    shirtMesh.bind(skeleton);
    container.add(shirtMesh);
  }
  if (cachedPantsShellGeo) {
    const pantsMesh = new THREE.SkinnedMesh(cachedPantsShellGeo, pantsMat);
    pantsMesh.castShadow = true;
    pantsMesh.bind(skeleton);
    container.add(pantsMesh);
  }

  // 2. Giáp trụ từ model /models/soldier_armor.glb (hoặc giáp nhẹ dự phòng)
  const isSoldier = role !== 'farmer' && role !== 'smith';
  if (isSoldier && cachedArmorParts.length > 0) {
    for (const part of cachedArmorParts) {
      const armorMesh = new THREE.SkinnedMesh(part.geo, part.mat);
      armorMesh.castShadow = true;
      armorMesh.receiveShadow = true;
      armorMesh.bind(skeleton);
      container.add(armorMesh);
    }

    // Bao đao đeo bên hông trái
    const hipSword = new THREE.Group();
    hipSword.position.set(-0.2, 0.02, 0.01);
    hipSword.rotation.x = -0.65;
    hipSword.add(mk(new RoundedBoxGeometry(0.04, 0.052, 0.52, 1, 0.01), woodMat).translateZ(-0.14));
    hipSword.add(mk(new RoundedBoxGeometry(0.048, 0.06, 0.045, 1, 0.01), goldMat).translateZ(0.04));
    hipSword.add(mk(new THREE.CylinderGeometry(0.02, 0.022, 0.16, 6), woodMat).rotateX(Math.PI / 2).translateZ(0.18));
    hipSword.add(mk(new THREE.SphereGeometry(0.032, 6, 6), goldMat).translateZ(0.27));
    rig.hips.add(hipSword);
  } else if (!isSoldier) {
    // Nông dân / Thợ rèn đội nón lá (hoặc để đầu trần)
    if (role === 'farmer') {
      const nonLa = mk(new THREE.ConeGeometry(0.32, 0.19, 16), strawMat);
      nonLa.position.set(0, 0.27, 0);
      const rim = mk(new THREE.TorusGeometry(0.315, 0.014, 5, 18), bambooMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.175, 0);
      rig.head.add(nonLa, rim);
    }
  }

  // 4. Vũ khí gắn chuẩn vào bàn tay phải (+0.24) hoặc trái (-0.24)
  const hasSpear = role === 'spearman' || role === 'guard' || role === 'cavalry_rider';
  if (role === 'swordsman') {
    const blade = mk(new RoundedBoxGeometry(0.03, 0.52, 0.09, 1, 0.008), steelMat);
    blade.position.set(0.24, 0.12, 0.16);
    blade.rotation.z = 1.24;
    blade.rotation.x = 0.55;
    rig.rightForearm.add(blade);

    const shield = mk(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 14), woodMat);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(-0.24, 0.0, 0.1);
    rig.leftForearm.add(shield);
  } else if (hasSpear) {
    // Tư thế tay phải gập khuỷu cầm chắc thân thương phía trước
    rig.rightUpperArm.rotation.set(-0.25, 0, -1.05);
    rig.rightForearm.rotation.set(0, -1.15, 0);

    const spear = new THREE.Group();
    spear.position.set(0.24, 0, 0);

    // Tính quaternion chính xác để cây thương hướng lên trời & hơi chếch về trước bất kể góc gập tay
    const armWorldQ = new THREE.Quaternion()
      .setFromEuler(rig.rightUpperArm.rotation)
      .multiply(new THREE.Quaternion().setFromEuler(rig.rightForearm.rotation));
    const desiredSpearWorldQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.24, 0, -0.05));
    spear.quaternion.copy(armWorldQ).invert().multiply(desiredSpearWorldQ);

    // Bàn tay nắm chặt bao quanh thân cây thương
    const fistGrip = mk(new RoundedBoxGeometry(0.075, 0.095, 0.075, 2, 0.025), skinBodyMat);
    spear.add(fistGrip);
    spear.add(mk(new THREE.CylinderGeometry(0.021, 0.024, 1.55, 6), woodMat).translateY(0.28));
    spear.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 7), goldMat).translateY(1.04));
    spear.add(mk(new THREE.ConeGeometry(0.052, 0.22, 6), steelMat).translateY(1.18));
    rig.rightForearm.add(spear);
  } else if (role === 'archer') {
    const bow = mk(new THREE.TorusGeometry(0.3, 0.02, 6, 12, Math.PI), woodMat);
    bow.rotation.y = Math.PI / 2;
    bow.position.set(-0.24, 0, 0.12);
    rig.leftForearm.add(bow);
  } else if (role === 'farmer') {
    const hoe = mk(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 6), woodMat);
    hoe.position.set(0.24, 0, 0.04);
    hoe.rotation.z = 1.24;
    rig.rightForearm.add(hoe);
  } else if (role === 'smith') {
    const hammer = mk(new RoundedBoxGeometry(0.16, 0.11, 0.11, 1, 0.02), armorMat);
    hammer.position.set(0.24, 0, 0.1);
    rig.rightForearm.add(hammer);
  }

  container.scale.set(scale, scale, scale);
  container.userData.skinnedRig = rig;
  container.userData.hasSpear = hasSpear;
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

  const hasSpear = group.userData.hasSpear === true;

  if (!isMoving) {
    rig.leftThigh.rotation.x = 0;
    rig.rightThigh.rotation.x = 0;
    rig.leftShin.rotation.x = 0;
    rig.rightShin.rotation.x = 0;
    rig.leftUpperArm.rotation.x = 0;
    rig.leftForearm.rotation.z = 0.15;
    if (hasSpear) {
      rig.rightUpperArm.rotation.set(-0.25, 0, -1.05);
      rig.rightForearm.rotation.set(0, -1.15, 0);
    } else {
      rig.rightUpperArm.rotation.x = -0.15;
      rig.rightForearm.rotation.z = -0.15;
    }
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

  rig.leftUpperArm.rotation.x = -s * 0.42;
  rig.leftForearm.rotation.y = Math.max(0, s) * 0.35;
  if (hasSpear) {
    rig.rightUpperArm.rotation.set(-0.25 + s * 0.08, 0, -1.05);
    rig.rightForearm.rotation.set(0, -1.15 + s * 0.06, 0);
  } else {
    rig.rightUpperArm.rotation.x = s * 0.25 - 0.18;
    rig.rightForearm.rotation.y = -Math.max(0, -s) * 0.25;
  }

  rig.hips.position.y = 0.78 + Math.abs(c) * 0.04;
  rig.spine.rotation.y = s * 0.08;
  rig.head.rotation.y = -s * 0.05;
}
