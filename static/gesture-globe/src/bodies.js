/**
 * 星空里的小天体与投影：太阳、月球、卫星轨道。
 * ------------------------------------------------------------------
 * 三个部分刻意分开：
 *
 * 1. `createSun()` —— 太阳本体。它是**方向光**，位置必须与地球着色器里的
 *    uSunDirection 一致，否则"亮面"和"太阳所在方向"会各说各话。
 *
 * 2. `createMoon()` —— 月球。挂在地球坐标系外面独立公转：
 *    倾角 5.1°（真实白道倾角）、轨道半径 6.4 个地球半径。
 *    真实月地距离是 60 个地球半径——照搬会跑出画面，
 *    所以这里只保留"地球的伴星"这一视觉事实，不追求尺度真实。
 *
 * 3. `createSatellites()` —— 三条低轨卫星轨迹（用户要求"不要太多"）。
 *    轨迹用虚线画成闭合圆环，卫星本体沿环以不同速度、不同倾角运行。
 *
 * 另外提供 `createEphemerisOverlay()`：在 2D 画布上画"缩小版星图"，
 * 把月球、太阳、卫星的**真实屏幕方向**投出来当方向指引——
 * 它们大多在 3D 视野之外，只有这个指示器能让用户知道它们在哪。
 */
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

/** 画一个径向渐变的发光点，作为贴图（避免再下载图片资源） */
function glowTexture(size = 256, stops = [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,236,190,0.55)'], [1, 'rgba(255,214,140,0)']]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 程序生成的月球表面贴图：底色 + 陨石坑 + 月海，比纯灰球像样 */
function moonTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8f8b86';
  ctx.fillRect(0, 0, size, size);

  // 月海：几块不规则的暗区
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = size * (0.05 + Math.random() * 0.12);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(96, 94, 96, 0.55)');
    g.addColorStop(1, 'rgba(96, 94, 96, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();
  }
  // 陨石坑：亮环 + 暗心
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = size * (0.004 + Math.random() * 0.018);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fillStyle = `rgba(${70 + Math.random() * 30 | 0}, ${68 + Math.random() * 30 | 0}, ${66 + Math.random() * 30 | 0}, 0.5)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.8, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(214, 210, 202, 0.35)';
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 太阳：一个发光 Sprite + 一盏方向光。
 * @param {number} radius 地球半径
 * @param {{x:number,y:number,z:number}} direction 与地球着色器一致的太阳方向（已归一化）
 * @param {(dir: THREE.Vector3) => THREE.Vector3} [place] 把方向映射成世界坐标的策略
 */
export function createSun(radius, direction, place) {
  const group = new THREE.Group();
  group.name = 'sun';

  const dist = radius * 26; // 远，但不至于被相机远平面裁掉
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(256),
      color: 0xfff3d8,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  sprite.scale.setScalar(radius * 5.2);
  group.add(sprite);

  // 太阳本体（中心一个亮核，让 Sprite 有个"实体"感）
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.55, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff8e6, fog: false }),
  );
  group.add(core);

  // 方向光：照亮月球与卫星本体，方向与地球着色器保持一致
  const light = new THREE.DirectionalLight(0xfff2dd, 2.4);
  light.name = 'sunLight';
  group.add(light);

  const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();

  const placeAt = (camera) => {
    const v = dirVec.clone();
    if (place) place(v, camera);
    // 相对**相机**放置：视觉上太阳永远在光来的方向，且不会被远平面裁掉
    if (camera) {
      sprite.position.copy(camera.position).addScaledVector(v, dist);
      light.position.copy(sprite.position);
      light.target.position.set(0, 0, 0);
      light.target.updateMatrixWorld();
    } else {
      sprite.position.copy(v).multiplyScalar(dist);
      light.position.copy(sprite.position);
    }
  };
  placeAt(null);

  return {
    group,
    light,
    sprite,
    /** 每帧调用：让太阳始终待在"光照方向"上 */
    follow(camera) {
      placeAt(camera);
    },
    setVisible(on) {
      group.visible = on;
    },
    dispose() {
      sprite.material.map?.dispose();
      sprite.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
    },
  };
}

/**
 * 月球：独立于地球自转绕地球公转。
 * @param {number} radius 地球半径
 */
export function createMoon(radius) {
  const group = new THREE.Group();
  group.name = 'moonSystem';

  const orbitRadius = radius * 6.4;
  const moonRadius = radius * 0.2725; // 真实比例：月球半径 ≈ 地球的 27%
  const inclination = THREE.MathUtils.degToRad(5.1);

  const tex = moonTexture(512);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(moonRadius, 48, 32),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.96,
      metalness: 0,
      // 一点点自发光，避免夜面全黑（真实月球夜面也靠地照微亮）
      emissive: 0x1b1f28,
      emissiveIntensity: 0.5,
    }),
  );
  group.add(mesh);

  // 轨道环：极细的虚线圆圈，提示"这里有条轨道"
  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 181 }, (_, i) => {
        const a = (i / 180) * TWO_PI;
        return new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius);
      }),
    ),
    new THREE.LineBasicMaterial({ color: 0x5f7093, transparent: true, opacity: 0.32, fog: false }),
  );
  orbit.rotation.x = inclination;
  group.add(orbit);

  const phase = { lon: 0.9 };
  const period = 46; // 秒/圈（真实是 27.3 天，取一个看得见的速度）

  const place = () => {
    const x = Math.cos(phase.lon) * orbitRadius;
    const z = Math.sin(phase.lon) * orbitRadius;
    mesh.position.set(x, -z * Math.sin(inclination), z * Math.cos(inclination));
  };
  place();

  return {
    group,
    mesh,
    orbitRadius,
    moonRadius,
    get worldPosition() {
      return mesh.position;
    },
    update(dt) {
      phase.lon += (TWO_PI / period) * dt;
      place();
      mesh.rotation.y += dt * 0.06; // 慢速自转，方便看出是个球
    },
    setVisible(on) {
      group.visible = on;
    },
    dispose() {
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
      orbit.geometry.dispose();
      orbit.material.dispose();
    },
  };
}

/**
 * 低轨卫星轨迹：三条不同倾角的虚线圆环 + 沿环运行的卫星。
 * @param {number} radius 地球半径
 */
export function createSatellites(radius) {
  const group = new THREE.Group();
  group.name = 'satellites';

  const orbits = [
    { r: 1.34, inc: 28, speed: 0.62, phase: 0.0, color: 0x6fe3ff },
    { r: 1.52, inc: 74, speed: 0.44, phase: 2.1, color: 0x9db9ff },
    { r: 1.24, inc: -12, speed: 0.86, phase: 4.0, color: 0x7ff0d0 },
  ];

  const items = orbits.map((o, index) => {
    const orbitRadius = radius * o.r;
    const inclination = THREE.MathUtils.degToRad(o.inc);

    const holder = new THREE.Group();
    holder.rotation.x = inclination;
    holder.rotation.z = THREE.MathUtils.degToRad(o.inc * 0.35);
    group.add(holder);

    // 轨迹：虚线（真实几何线，不依赖 linewidth，各平台表现一致）
    const curve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, TWO_PI, false, 0);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(180)),
      new THREE.LineDashedMaterial({
        color: o.color,
        transparent: true,
        opacity: 0.5,
        dashSize: radius * 0.05,
        gapSize: radius * 0.045,
        fog: false,
      }),
    );
    line.computeLineDistances();
    line.rotation.x = -Math.PI / 2; // EllipseCurve 在 XY 平面，转到 XZ 平面
    holder.add(line);

    // 卫星本体：小八面体 + 一对太阳能板
    const sat = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius * 0.028, 0),
      new THREE.MeshStandardMaterial({
        color: 0xe8eefb,
        roughness: 0.35,
        metalness: 0.7,
        emissive: 0x18324a,
        emissiveIntensity: 0.6,
      }),
    );
    sat.add(body);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2f6fbf,
      roughness: 0.3,
      metalness: 0.85,
      emissive: 0x0d2a44,
      emissiveIntensity: 0.4,
    });
    const panelGeo = new THREE.BoxGeometry(radius * 0.062, radius * 0.004, radius * 0.026);
    for (const s of [-1, 1]) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.x = s * radius * 0.048;
      sat.add(panel);
    }
    holder.add(sat);

    // 光晕，远看也能发现
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(128, [
          [0, 'rgba(255,255,255,0.95)'],
          [0.3, 'rgba(140,230,255,0.5)'],
          [1, 'rgba(90,180,255,0)'],
        ]),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.scale.setScalar(radius * 0.2);
    sat.add(halo);

    return { ...o, index, holder, sat, orbitRadius, angle: o.phase };
  });

  return {
    group,
    orbits: items,
    update(dt) {
      for (const it of items) {
        it.angle += it.speed * dt;
        const x = Math.cos(it.angle) * it.orbitRadius;
        const z = Math.sin(it.angle) * it.orbitRadius;
        it.sat.position.set(x, 0, z);
        it.sat.rotation.y += dt * 0.8;
      }
    },
    setVisible(on) {
      group.visible = on;
    },
    dispose() {
      for (const it of items) {
        it.sat.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
        it.holder.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      }
    },
  };
}

/**
 * 星图指示器：2D 画布上的"缩略星空"。
 * 由于月球/太阳/卫星大多在 3D 视野之外（太阳甚至在相机背后），
 * 把它们相对地球的**真实屏幕方向**投影到一个小圆盘上，用户就知道该转向哪边找。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3} target 中心天体（地球）的世界坐标
 */
export function createEphemerisOverlay(canvas, camera, target = new THREE.Vector3()) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 200;
  canvas.width = canvas.height = Math.round(size * dpr);

  const project = (world) => {
    const v = world.clone().project(camera);
    // 相机背后的点 project() 会给出镜像坐标，这里显式标注"在背后"
    const behind = v.z > 1;
    return { x: v.x, y: -v.y, behind };
  };

  const draw = (bodies) => {
    const R = (size / 2) * 0.86;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // 外圈 + 十字
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, R, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(120, 152, 200, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2 - R, size / 2);
    ctx.lineTo(size / 2 + R, size / 2);
    ctx.moveTo(size / 2, size / 2 - R);
    ctx.lineTo(size / 2, size / 2 + R);
    ctx.strokeStyle = 'rgba(120, 152, 200, 0.16)';
    ctx.stroke();

    // 地球（中心）
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, Math.max(2.5, R * 0.1), 0, TWO_PI);
    ctx.fillStyle = 'rgba(90, 170, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 220, 255, 0.7)';
    ctx.stroke();

    for (const b of bodies) {
      if (!b.world) continue;
      const p = project(b.world);
      const mag = Math.min(1, Math.hypot(p.x, p.y) || 1);
      const nx = (p.x / mag) * R;
      const ny = (p.y / mag) * R;
      const x = size / 2 + nx;
      const y = size / 2 + ny;
      const edge = mag > 0.92 || p.behind; // 已出画/在背后：贴到边缘并标箭头

      ctx.beginPath();
      ctx.arc(x, y, edge ? (b.big ? 5 : 3.4) : b.big ? 4.2 : 3, 0, TWO_PI);
      ctx.fillStyle = b.color;
      ctx.globalAlpha = edge ? 0.95 : 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (b.big) {
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.stroke();
      }
    }
  };

  return { draw, size, dispose() {} };
}
