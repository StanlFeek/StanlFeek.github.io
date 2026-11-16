/**
 * 地球仪渲染（three.js）
 * ------------------------------------------------------------------
 * 全部依赖本地化：three.js r169、NASA Blue Marble / Black Marble 贴图。
 * 对外只暴露极简 API，手势与鼠标输入都在 main.js 里转成这里的几个量：
 *   setDistance / nudgeRotation / applyHandRotation / resetView / setAutoRotate ...
 */
import * as THREE from 'three';

/** 贴图清单：路径相对 globe/ 目录 */
const TEX = {
  day: './vendor/textures/earth-blue-marble.jpg',
  night: './vendor/textures/earth-night.jpg',
  topology: './vendor/textures/earth-topology.png',
  water: './vendor/textures/earth-water.png',
  clouds: './vendor/textures/earth-clouds.png',
};

const DEFAULTS = {
  radius: 1,
  latDeg: 15,
  lonDeg: 95,
  distance: 3.9,
  minDistance: 1.55,
  maxDistance: 8,
  autoRotateSpeed: 0.035, // 弧度/秒
  sunDirection: new THREE.Vector3(0.7684, 0.3476, -0.5373).normalize(),
};

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const EARTH_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uTopoMap;
  uniform sampler2D uWaterMap;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uAmbientColor;
  uniform vec3 uAtmosphereColor;
  uniform float uWaterFactor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float rawSun = dot(N, uSunDirection);

    // 昼夜过渡：终结线柔和过渡，避免生硬分界
    float dayAmount = smoothstep(-0.16, 0.34, rawSun);
    // 漫反射用略陡的幂次：太阳直射点附近不再整片烧成纯白，明暗过渡更像球体
    float diffuse = pow(max(rawSun, 0.0), 1.35);

    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb;

    // 地表起伏：用高度贴图当作凹凸，便宜且够用
    float height = texture2D(uTopoMap, vUv).r;
    float relief = 0.85 + 0.3 * height;

    // 水面遮罩：earth-water.png 的语义是「亮 = 海洋、暗 = 陆地」
    // （已用 day 贴图交叉验证：遮罩>0.65 的像素 day 亮度仅 25.7 且强烈偏蓝 = 海水）
    float waterMask = texture2D(uWaterMap, vUv).r;
    float landMask = 1.0 - waterMask;

    vec3 sunLight = uSunColor * diffuse;
    vec3 surface = mix(dayColor * vec3(0.7, 0.95, 1.1), vec3(0.006, 0.014, 0.022), landMask);
    vec3 color = surface * relief * (sunLight + uAmbientColor * vec3(0.34, 0.42, 0.62));

    // 夜面城市灯光
    float nightBoost = 1.0 - dayAmount;
    vec3 lights = nightColor * nightColor * 2.4;
    color += lights * nightBoost * 0.03;

    // 海面镜面高光：只在朝相机一侧出现，且刻意压得很低——
    // 否则太阳一转到朝向相机的方位，海面就会糊出一大团白斑。
    vec3 H = normalize(uSunDirection + V);
    float facingCam = smoothstep(0.0, 0.55, dot(N, V));
    float spec = pow(max(dot(N, H), 0.0), 30.0) * waterMask * uWaterFactor * dayAmount * facingCam;
    color += uSunColor * spec * 0.32;

    float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4);
    color += uAtmosphereColor * fresnel * (0.28 + 0.6 * dayAmount);

    // 极轻微的对比补偿，让贴图在色调映射后不发灰
    color = pow(clamp(color, 0.0, 4.0), vec3(0.96));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vViewDir;
  varying vec3 vGeoNormal;
  void main() {
    // 用几何法线（物体空间）而不是 normalMatrix：normalMatrix 在 BackSide 下会翻转，
    // 导致"边缘亮"变成"整片亮"，这是之前那团过曝白光晕的根因。
    vGeoNormal = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ATMO_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vViewDir;
  varying vec3 vGeoNormal;

  void main() {
    // 视线与球壳法线夹角 → 越靠边缘穿过的大气越厚
    float cosView = clamp(dot(normalize(vGeoNormal), normalize(vViewDir)), 0.0, 1.0);
    float limb = pow(1.0 - cosView, uPower);

    // 只画朝向相机的外壳正面（法线 z>0），球体背后的部分交给深度测试剔除
    float facing = smoothstep(0.0, 0.3, vGeoNormal.z);

    // 受光侧更亮，夜侧留一圈微光
    float sunFacing = clamp(dot(normalize(vViewDir), uSunDirection) * 0.5 + 0.45, 0.0, 1.0);

    float a = limb * facing * uIntensity * sunFacing;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** 生成一张径向渐变的圆点贴图，用于星点与太阳光晕 */
function makeRadialSprite(size, inner, outer, stops = [0, 0.25, 0.55, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(stops[0], inner);
  g.addColorStop(stops[1], outer);
  g.addColorStop(stops[2], 'rgba(255,255,255,0.06)');
  g.addColorStop(stops[3], 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 程序化生成月球表面贴图 + 凹凸贴图。
 *
 * 为什么不下载真实月面贴图：这台机器的 jsdelivr / raw.githubusercontent 都不通，
 * three-globe 的镜像仓库里也没有月面图，与其塞一个来源不明的二进制进来，
 * 不如用固定种子的噪声自己画——环月轨道上的小球，视觉上完全够用，
 * 而且和"全部依赖本地化、可断网运行"的约束一致。
 *
 * 注意：这里必须分片让出主线程。几百个陨石坑 + 逐像素噪声在真实 GPU 上很快，
 * 但在软件渲染（无显卡的无头环境）下会阻塞主线程几十秒，
 * 表现就是"页面迟迟不出现、加载提示一直不消失"。
 *
 * 返回 { map, bump }：map 是灰白色月面（含陨石坑与月海），bump 是同一批坑的高度图。
 */
async function makeMoonTexture(width = 768) {
  const height = width / 2;
  const cMap = document.createElement('canvas');
  const cBump = document.createElement('canvas');
  cMap.width = cBump.width = width;
  cMap.height = cBump.height = height;
  const gMap = cMap.getContext('2d');
  const gBump = cBump.getContext('2d');

  // 固定种子的伪随机，保证每次刷新看到同一颗月亮
  let seed = 20240213;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  // 让出主线程一帧，别把渲染循环饿死
  const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  // 底色：月海（暗）与高地（亮）的大块斑驳
  gMap.fillStyle = '#c9c6c0';
  gMap.fillRect(0, 0, width, height);
  gBump.fillStyle = '#808080';
  gBump.fillRect(0, 0, width, height);

  // 月海：几块大的暗区
  for (let i = 0; i < 14; i++) {
    if (i % 6 === 0) await yieldFrame();
    const x = rnd() * width;
    const y = height * (0.15 + rnd() * 0.7);
    const r = width * (0.05 + rnd() * 0.11);
    const grad = gMap.createRadialGradient(x, y, 0, x, y, r);
    const shade = 150 + Math.floor(rnd() * 22);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade + 2},0.85)`);
    grad.addColorStop(1, 'rgba(160,158,155,0)');
    gMap.fillStyle = grad;
    gMap.beginPath();
    gMap.arc(x, y, r, 0, Math.PI * 2);
    gMap.fill();
  }

  // 陨石坑：亮环 + 暗底，同时写进 bump
  for (let i = 0; i < 420; i++) {
    if (i % 40 === 0) await yieldFrame();
    const x = rnd() * width;
    const y = rnd() * height;
    // 越靠近两极坑越扁（等距圆柱投影的固有拉伸）
    const squish = Math.max(0.25, Math.cos(((y / height) * 2 - 1) * Math.PI * 0.5));
    const r = width * (0.0016 + Math.pow(rnd(), 3) * 0.035);
    const ry = r * squish;

    // 暗色坑底
    gMap.save();
    gMap.translate(x, y);
    gMap.scale(1, squish);
    const floor = gMap.createRadialGradient(0, 0, 0, 0, 0, r);
    const dark = 132 + Math.floor(rnd() * 30);
    floor.addColorStop(0, `rgba(${dark},${dark},${dark},0.55)`);
    floor.addColorStop(0.72, `rgba(${dark + 6},${dark + 6},${dark + 6},0.35)`);
    floor.addColorStop(1, 'rgba(150,148,146,0)');
    gMap.fillStyle = floor;
    gMap.beginPath();
    gMap.arc(0, 0, r, 0, Math.PI * 2);
    gMap.fill();
    gMap.restore();

    // 亮色坑缘
    if (r > width * 0.004) {
      gMap.save();
      gMap.translate(x, y);
      gMap.scale(1, squish);
      gMap.strokeStyle = `rgba(255,252,244,${0.12 + rnd() * 0.22})`;
      gMap.lineWidth = Math.max(1, r * 0.16);
      gMap.beginPath();
      gMap.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      gMap.stroke();
      gMap.restore();
    }

    // bump：坑底压低、坑缘抬高
    gBump.save();
    gBump.translate(x, y);
    gBump.scale(1, squish || 1e-3);
    const bump = gBump.createRadialGradient(0, 0, 0, 0, 0, r || 1e-3);
    bump.addColorStop(0, 'rgba(40,40,40,0.75)');
    bump.addColorStop(0.7, 'rgba(96,96,96,0.5)');
    bump.addColorStop(0.9, 'rgba(225,225,225,0.65)');
    bump.addColorStop(1, 'rgba(128,128,128,0)');
    gBump.fillStyle = bump;
    gBump.beginPath();
    gBump.arc(0, 0, r, 0, Math.PI * 2);
    gBump.fill();
    gBump.restore();
  }

  // 细颗粒噪声，破掉大色块的塑料感（按行分片让出主线程）
  const img = gMap.getImageData(0, 0, width, height);
  const data = img.data;
  for (let y = 0; y < height; y++) {
    if (y % 64 === 0) await yieldFrame();
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const n = (rnd() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
  }
  gMap.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(cBump);
  return { map, bump };
}

const MOON_REL_RADIUS = 1737.4 / 6371;

// A narrow ribbon gives the trail a soft edge at every device pixel ratio.
function orbitGeometry(radius, width, segments = 256) {
  const positions = [];
  const uv = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const phase = i / segments;
    const angle = phase * Math.PI * 2;
    for (const side of [-1, 1]) {
      const r = radius + side * width / 2;
      positions.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      uv.push(phase, (side + 1) / 2);
    }
    if (i < segments) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

function makeOrbitMaterial(color, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uHead: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uHead;
      varying vec2 vUv;
      void main() {
        float age = fract(uHead - vUv.x + 1.0);
        float trail = exp(-age * 10.0) * (1.0 - smoothstep(0.22, 0.42, age));
        float edge = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
        gl_FragColor = vec4(uColor, uOpacity * (0.025 + trail) * edge);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function makeLandParticles(waterMap, sunDirection, pixelRatio) {
  const mask = document.createElement('canvas');
  mask.width = waterMap.image.width;
  mask.height = waterMap.image.height;
  const ctx = mask.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(waterMap.image, 0, 0);
  const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
  const positions = [];
  const colors = [];
  const count = 92000;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + 0.5) / count;
    const phi = Math.acos(y);
    const theta = (i * goldenAngle) % (Math.PI * 2);
    const u = theta / (Math.PI * 2);
    const px = Math.min(mask.width - 1, Math.floor(u * mask.width));
    const py = Math.min(mask.height - 1, Math.floor(phi / Math.PI * mask.height));
    if (pixels[(py * mask.width + px) * 4] > 100) continue;
    const r = 1.009;
    positions.push(-r * Math.sin(phi) * Math.cos(theta), r * y, r * Math.sin(phi) * Math.sin(theta));
    const warmth = (Math.sin(i * 127.1) + 1) / 2;
    colors.push(0.35 + warmth * 0.55, 0.8 + warmth * 0.12, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uSunDirection: { value: sunDirection }, uPixelRatio: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      uniform vec3 uSunDirection;
      uniform float uPixelRatio;
      varying vec3 vColor;
      void main() {
        vec3 N = normalize(mat3(modelMatrix) * position);
        float daylight = smoothstep(-0.2, 0.5, dot(N, uSunDirection));
        vColor = color * (0.48 + daylight * 0.8);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(6.5 / -mv.z, 1.1, 3.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float alpha = (1.0 - smoothstep(0.15, 1.0, r)) * 0.95;
        gl_FragColor = vec4(vColor, alpha);
        #include <colorspace_fragment>
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(geometry, material);
  particles.name = 'land-particles';
  return particles;
}

export async function createGlobe(canvas, { onProgress = () => {}, pixelRatio = 1.5 } = {}) {
  // ---------- 渲染器 ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true, // 便于「保存当前画面 PNG」
  });
  renderer.setClearColor(0x03060f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);

  // ---------- 灯光 ----------
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.1);
  sun.position.copy(DEFAULTS.sunDirection).multiplyScalar(12);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223355, 0.5));
  const earthshine = new THREE.PointLight(0xc5dcf8, 1.1, 0, 2);
  scene.add(earthshine);

  const root = new THREE.Group();
  scene.add(root);

  // ---------- 贴图加载 ----------
  const loader = new THREE.TextureLoader();
  const steps = Object.keys(TEX).length;
  let loaded = 0;

  const loadTexture = (url, { srgb = true, repeatX = true } = {}) =>
    new Promise((resolve, reject) => {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          if (repeatX) {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
          }
          loaded += 1;
          onProgress(loaded / steps, url);
          resolve(tex);
        },
        undefined,
        (err) => reject(new Error(`贴图加载失败：${url}（${err?.message ?? '网络或文件缺失'}）`))
      );
    });

  const [dayMap, nightMap, topoMap, waterMap, cloudMap] = await Promise.all([
    loadTexture(TEX.day),
    loadTexture(TEX.night),
    loadTexture(TEX.topology, { srgb: false }),
    loadTexture(TEX.water, { srgb: false }),
    loadTexture(TEX.clouds),
  ]);

  // ---------- 地球本体 ----------
  const uniforms = {
    uDayMap: { value: dayMap },
    uNightMap: { value: nightMap },
    uTopoMap: { value: topoMap },
    uWaterMap: { value: waterMap },
    uSunDirection: { value: DEFAULTS.sunDirection.clone() },
    uSunColor: { value: new THREE.Color(0xfff2dd).multiplyScalar(1.15) },
    uAmbientColor: { value: new THREE.Color(0x2a3f66) },
    uAtmosphereColor: { value: new THREE.Color(0x5aa9ff) },
    uWaterFactor: { value: 1.0 },
  };

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULTS.radius, 144, 96),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    })
  );
  earth.rotation.y = -Math.PI / 2;
  root.add(earth);
  const landParticles = makeLandParticles(waterMap, uniforms.uSunDirection.value, renderer.getPixelRatio());
  earth.add(landParticles);

  // ---------- 云层 ----------
  // 云图是 RGBA PNG：白色云体自带宽高、alpha≈165；海洋区域 alpha=0 完全透明。
  // 之前用 map 直接当颜色导致"整层黑壳"——夜面纯黑、白天像浮了一层灰膜。
  // 这里改用 alphaMap 提供不透明度、map+emissiveMap 提供自发光白云。
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULTS.radius * 1.006, 96, 64),
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: cloudMap,
      alphaMap: cloudMap,
      emissive: 0xffffff,
      emissiveMap: cloudMap,
      emissiveIntensity: 0.02,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );
  clouds.rotation.y = earth.rotation.y + 0.02;
  root.add(clouds);

  // ---------- 大气光晕 ----------
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULTS.radius * 1.055, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x4aa8ff) },
        uSunDirection: { value: DEFAULTS.sunDirection.clone() },
        uIntensity: { value: 0.85 },
        uPower: { value: 3.4 },
      },
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  root.add(atmosphere);

  // ---------- 星空 ----------
  const starTex = makeRadialSprite(64, 'rgba(255,255,255,1)', 'rgba(200,225,255,0.35)');
  const starCount = 2600;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const color = new THREE.Color();
  for (let i = 0; i < starCount; i++) {
    const r = 60 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    color.setHSL(0.55 + Math.random() * 0.12, 0.25 + Math.random() * 0.4, 0.72 + Math.random() * 0.28);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.5 + Math.pow(Math.random(), 3) * 2.6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: starTex }, uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * 2.4;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec3 vColor;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vColor * t.rgb, t.a);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ---------- 太阳方向的远端光晕 ----------
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeRadialSprite(256, 'rgba(255,246,225,0.95)', 'rgba(255,214,150,0.35)'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  sunGlow.scale.setScalar(26);
  scene.add(sunGlow); // 位置由 layoutSun() 统一摆

  // ---------- 太阳本体（悬在太阳方向远处的亮盘）----------
  // 大小按照"屏幕角径固定"来算：视口越高，同距离下要越大才占同样的比例，
  // 这样用户缩放地球时太阳的大小看起来是稳定的。
  // Distances are compressed for display; the solar angular diameter is 0.533 degrees.
  const SUN = { distance: 88, diameter: THREE.MathUtils.degToRad(0.533) };
  const sunBody = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeRadialSprite(256, 'rgba(255,255,252,1)', 'rgba(255,245,222,1)', [0, 0.84, 0.98, 1]),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 1,
    })
  );
  sunBody.renderOrder = -1;
  scene.add(sunBody);

  // 把太阳摆到画面里一个固定的位置：宽屏在右上角，窄屏（手机竖屏）往中线挪，
  // 否则会被左右裁掉。位置是"相机基 + 目标 NDC"算出来的世界坐标，
  // 所以只在初始化与窗口尺寸变化时更新 —— 交互过程中太阳稳稳待在原处。
  const sunNdcTarget = () => {
    const t = THREE.MathUtils.clamp((camera.aspect - 0.7) / 0.6, 0, 1);
    const safeTop = canvas.clientWidth <= 620 ? 140 : 80;
    const y = Math.min(THREE.MathUtils.lerp(0.7, 0.42, t), 1 - 2 * safeTop / canvas.clientHeight);
    return { x: THREE.MathUtils.lerp(0.52, 0.8, t), y };
  };
  const layoutSun = () => {
    const ndc = sunNdcTarget();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tanH = tanV * camera.aspect;
    const L = SUN.distance;
    const fwd = camera.position.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const upv = new THREE.Vector3().crossVectors(right, fwd);
    sunBody.position
      .copy(camera.position)
      .addScaledVector(fwd, L)
      .addScaledVector(right, ndc.x * tanH * L)
      .addScaledVector(upv, ndc.y * tanV * L);
    sunBody.name = 'sun-body';
    sunGlow.position.copy(sunBody.position);
    // The visible Sun is the light source for Earth, Moon and clouds.
    const direction = sunBody.position.clone().normalize();
    uniforms.uSunDirection.value.copy(direction);
    sun.position.copy(sunBody.position);
    atmosphere.material.uniforms.uSunDirection.value.copy(direction);
  };

  // ---------- 月球（挂在不随地球自转的黄道面容器里，公转产生月相）----------
  // 贴图是异步分片生成的（内部会让出主线程），必须 await
  const moonTex = await makeMoonTexture(768);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshStandardMaterial({
      map: moonTex.map,
      bumpMap: moonTex.bump,
      bumpScale: 0.012,
      roughness: 0.96,
      metalness: 0,
    })
  );
  moon.scale.setScalar(MOON_REL_RADIUS);
  moon.name = 'moon';
  const MOON = { orbit: 3.2, period: 27.32166 * Math.PI * 2 / DEFAULTS.autoRotateSpeed, phase: 2.6 };
  moon.position.set(Math.cos(MOON.phase) * MOON.orbit, Math.sin(MOON.phase) * MOON.orbit, 0);

  // ---------- 卫星（少量，带轨道线）----------
  const SATS = [
    { orbit: 1.17, tiltX: 0.32, tiltZ: 0.1, phase: 0.0, color: 0x9fe8ff, size: 0.011 },
    { orbit: 1.31, tiltX: -0.55, tiltZ: 0.48, phase: 2.1, color: 0xffd9a0, size: 0.01 },
    { orbit: 1.48, tiltX: 0.78, tiltZ: -0.42, phase: 4.0, color: 0xc4efdc, size: 0.009 },
  ];
  const satSprite = makeRadialSprite(64, 'rgba(255,255,255,1)', 'rgba(190,225,255,0.6)');
  const satGroup = new THREE.Group();
  for (const s of SATS) {
    s.period = 13.4 * Math.pow(s.orbit / 1.17, 1.5);
    const orbit = new THREE.Mesh(
      orbitGeometry(s.orbit, 0.012),
      makeOrbitMaterial(s.color, 0.5)
    );
    orbit.name = 'satellite-trail';
    s.trail = orbit.material;

    const dot = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: satSprite,
        color: s.color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    dot.scale.setScalar(s.size * 9);
    dot.position.set(s.orbit, 0, 0);

    // 轨道倾角做在容器上，卫星位置只需在 XY 平面里转角度
    const plane = new THREE.Group();
    plane.rotation.set(s.tiltX, 0, s.tiltZ);
    plane.add(orbit, dot);
    satGroup.add(plane);
    s.dot = dot;
  }

  const ecliptic = new THREE.Group();
  // 挂到 scene 而不是跟着地球自转的 root 上：地球在下面自转，天体各自公转
  scene.add(ecliptic);

  const moonGroup = new THREE.Group();
  moonGroup.rotation.x = THREE.MathUtils.degToRad(5.145);
  moonGroup.add(moon);
  ecliptic.add(moonGroup, satGroup);

  // ---------- 相机与自定义控制 ----------
  const view = {
    lat: THREE.MathUtils.degToRad(DEFAULTS.latDeg),
    lon: THREE.MathUtils.degToRad(DEFAULTS.lonDeg),
    distance: DEFAULTS.distance,
    targetDistance: DEFAULTS.distance,
    min: DEFAULTS.minDistance,
    max: DEFAULTS.maxDistance,
    // 朝目标视角平滑过渡
    target: null,
    // 惯性（弧度/秒）
    velLat: 0,
    velLon: 0,
    dragging: false,
  };

  const state = {
    autoRotate: true,
    cloudsVisible: true,
    paused: false,
    elapsed: 0,
    spin: 0, // 自动旋转累计角度
  };

  const applyCamera = () => {
    const cosLat = Math.cos(view.lat);
    // 竖屏（手机）时把相机拉远，否则地球会被裁掉一大半；
    // Narrow screens need room for the Moon as well as the Earth.
    const frameK = THREE.MathUtils.clamp(1.42 / Math.max(0.35, camera.aspect), 1, 3.5);
    const d = view.distance * frameK;
    camera.position.set(d * cosLat * Math.sin(view.lon), d * Math.sin(view.lat), d * cosLat * Math.cos(view.lon));
    camera.lookAt(0, 0, 0);
  };
  applyCamera();

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(pixelRatio, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    starMat.uniforms.uPixelRatio.value = dpr;
    landParticles.material.uniforms.uPixelRatio.value = dpr;
    applyCamera(); // 竖屏/横屏切换时重新取景，避免地球被裁切
    layoutSun(); // 太阳的屏幕位置跟着新的取景/比例重算，窄屏才不会被裁掉
    const lightDirection = uniforms.uSunDirection.value;
    const north = new THREE.Vector3(0, 1, 0);
    const normal = north.addScaledVector(lightDirection, -north.dot(lightDirection)).normalize();
    ecliptic.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  };
  resize();

  const pointer = { active: false, id: null, x: 0, y: 0, moved: 0, lastTap: 0 };
  const rotationSpeed = 0.004; // radians per pixel
  const clampLat = () => THREE.MathUtils.clamp(view.lat, -1.35, 1.35);

  const onPointerDown = (e) => {
    if (pointer.active) return;
    pointer.active = true;
    pointer.id = e.pointerId;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved = 0;
    view.target = null;
    view.velLat = view.velLon = 0;
    canvas.classList.add('dragging');
    canvas.setPointerCapture?.(e.pointerId);

    const now = performance.now();
    if (now - pointer.lastTap < 320) {
      view.target = { lat: THREE.MathUtils.degToRad(DEFAULTS.latDeg), lon: THREE.MathUtils.degToRad(DEFAULTS.lonDeg), distance: DEFAULTS.distance };
      pointer.lastTap = 0;
    } else {
      pointer.lastTap = now;
    }
  };

  const onPointerMove = (e) => {
    if (!pointer.active || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    view.lon -= dx * rotationSpeed;
    view.lat = clampLat(view.lat + dy * rotationSpeed);
    // 拖拽尾速 → 松手后的惯性
    view.velLon = dx * rotationSpeed * 12;
    view.velLat = dy * rotationSpeed * 12;
  };

  const onPointerUp = (e) => {
    if (!pointer.active || e.pointerId !== pointer.id) return;
    pointer.active = false;
    pointer.id = null;
    canvas.classList.remove('dragging');
    canvas.releasePointerCapture?.(e.pointerId);
  };

  const onWheel = (e) => {
    e.preventDefault();
    view.target = null;
    const factor = Math.exp(e.deltaY * 0.0012);
    view.targetDistance = THREE.MathUtils.clamp(view.targetDistance * factor, view.min, view.max);
  };

  // 触摸双指缩放
  const touches = new Map();
  const onTouchStart = (e) => {
    for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY });
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      view.target = null;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const prev = touches.get(a.identifier);
      if (prev && prev.pinch) {
        view.targetDistance = THREE.MathUtils.clamp(view.targetDistance * (prev.pinch / dist), view.min, view.max);
      }
      const key = a.identifier;
      touches.set(key, { x: a.clientX, y: a.clientY, pinch: dist });
      touches.set(b.identifier, { x: b.clientX, y: b.clientY });
    }
  };
  const onTouchEnd = (e) => {
    for (const t of e.changedTouches) touches.delete(t.identifier);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- 主循环 ----------
  const clock = new THREE.Clock();
  let renderListeners = [];

  const update = (dt) => {
    // 平滑复位/过渡
    if (view.target) {
      const k = 1 - Math.pow(0.0015, dt);
      view.lat += (view.target.lat - view.lat) * k;
      view.lon += (view.target.lon - view.lon) * k;
      view.targetDistance += (view.target.distance - view.targetDistance) * k;
      if (
        Math.abs(view.target.lat - view.lat) < 0.002 &&
        Math.abs(((view.target.lon - view.lon + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.004 &&
        Math.abs(view.target.distance - view.targetDistance) < 0.01
      ) {
        view.lat = view.target.lat;
        view.lon = view.target.lon;
        view.targetDistance = view.target.distance;
        view.target = null;
      }
    }

    // 惯性衰减
    if (!pointer.active) {
      const damp = Math.pow(0.12, dt);
      view.lon -= view.velLon * dt;
      view.lat = clampLat(view.lat + view.velLat * dt);
      view.velLon *= damp;
      view.velLat *= damp;
      if (Math.abs(view.velLon) < 0.002) view.velLon = 0;
      if (Math.abs(view.velLat) < 0.002) view.velLat = 0;
    }

    // 自动旋转
    if (state.autoRotate && !pointer.active) state.spin += DEFAULTS.autoRotateSpeed * dt;

    // 距离平滑
    view.distance += (view.targetDistance - view.distance) * (1 - Math.pow(0.0025, dt));

    earth.rotation.y = state.spin - Math.PI / 2;
    clouds.rotation.y = earth.rotation.y + 0.02 + state.elapsed * 0.004;
    root.rotation.z = THREE.MathUtils.degToRad(23.44);
    root.rotation.x = 0;

    applyCamera();

    // ---- 月球与卫星的公转 ----
    const moonAngle = MOON.phase + (state.elapsed / MOON.period) * Math.PI * 2;
    moon.position.set(Math.cos(moonAngle) * MOON.orbit, Math.sin(moonAngle) * MOON.orbit, 0);
    moon.lookAt(0, 0, 0);
    const moonDirection = moon.getWorldPosition(new THREE.Vector3()).normalize();
    const earthPhase = (1 + moonDirection.dot(uniforms.uSunDirection.value)) / 2;
    earthshine.intensity = 1.1 * earthPhase * earthPhase;

    for (const s of SATS) {
      const a = s.phase + (state.elapsed / s.period) * Math.PI * 2;
      s.trail.uniforms.uHead.value = ((a / (Math.PI * 2)) % 1 + 1) % 1;
      s.dot.position.set(Math.cos(a) * s.orbit, Math.sin(a) * s.orbit, 0);
      // 卫星本体很小，远看只是个亮点；靠近时给一点点闪烁感
      const twinkle = 0.82 + Math.sin(state.elapsed * 3.1 + s.phase) * 0.18;
      s.dot.material.opacity = twinkle;
    }

    // 太阳亮盘的屏幕角径保持稳定（位置由 layoutSun 摆好，这里只管大小）
    const solarDiameter = 2 * sunBody.position.distanceTo(camera.position) * Math.tan(SUN.diameter / 2);
    sunBody.scale.setScalar(solarDiameter);
    sunGlow.scale.setScalar(solarDiameter * 5);

    // 视距越远，光晕环越薄，避免远看时糊成一圈
    const power = THREE.MathUtils.lerp(1.5, 4.2, THREE.MathUtils.clamp((7 - view.distance) / 4.6, 0, 1));
    atmosphere.material.uniforms.uPower.value = power;
    starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    stars.rotation.y = state.elapsed * 0.004;
  };

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!state.paused) {
      state.elapsed += dt;
      update(dt);
      for (const fn of renderListeners) fn(dt);
      renderer.render(scene, camera);
    }
  };

  renderer.setAnimationLoop(frame);

  // ---------- 对外 API ----------
  const api = {
    three: { THREE, scene, camera, renderer, earth, clouds, atmosphere, landParticles, moon, sunBody, sun, ecliptic },

    /** 手势/程序化旋转：传入角速度（弧度/秒）与帧间隔 */
    applyRotation(velLon, velLat, dt = 1 / 60) {
      view.target = null;
      view.lon += velLon * dt;
      view.lat = clampLat(view.lat + velLat * dt);
    },

    /** 连续旋转：以每帧增量方式累加（角度制） */
    nudgeRotation(dLonDeg, dLatDeg) {
      view.target = null;
      view.lon += THREE.MathUtils.degToRad(dLonDeg);
      view.lat = clampLat(view.lat + THREE.MathUtils.degToRad(dLatDeg));
    },

    /** 手势缩放：设置目标距离（球半径=1） */
    setDistance(distance) {
      view.target = null;
      view.targetDistance = THREE.MathUtils.clamp(distance, view.min, view.max);
    },

    /** 相对缩放（乘数），用于惯性/离散输入 */
    zoomBy(factor) {
      view.target = null;
      view.targetDistance = THREE.MathUtils.clamp(view.targetDistance * factor, view.min, view.max);
    },

    /** 当前**实际**视距（渲染用的值，带阻尼，会比目标值滞后） */
    getDistance() {
      return view.distance;
    },

    /** 当前**目标**视距：缩放指令直接作用在它上面，量测缩放方向要用这个 */
    getTargetDistance() {
      return view.targetDistance;
    },

    resetView({ instant = false } = {}) {
      const target = {
        lat: THREE.MathUtils.degToRad(DEFAULTS.latDeg),
        lon: THREE.MathUtils.degToRad(DEFAULTS.lonDeg),
        distance: DEFAULTS.distance,
      };
      if (instant) {
        view.lat = target.lat;
        view.lon = target.lon;
        view.targetDistance = target.distance;
        view.distance = target.distance;
        view.target = null;
      } else {
        view.target = target;
      }
      view.velLat = view.velLon = 0;
      view.targetDistance = THREE.MathUtils.clamp(view.targetDistance, view.min, view.max);
      state.spin = 0;
    },

    setAutoRotate(on) {
      state.autoRotate = !!on;
    },

    setCloudsVisible(on) {
      state.cloudsVisible = !!on;
      clouds.visible = !!on;
    },

    setPaused(paused) {
      state.paused = !!paused;
      if (paused) clock.stop();
      else clock.start();
    },

    setPixelRatio(ratio) {
      pixelRatio = ratio;
      resize();
    },

    onBeforeRender(fn) {
      renderListeners.push(fn);
      return () => {
        renderListeners = renderListeners.filter((f) => f !== fn);
      };
    },

    resize,

    /** 导出当前画面为 PNG DataURL */
    snapshot() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },

    dispose() {
      renderer.setAnimationLoop(null);
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        for (const m of mats) {
          for (const key of Object.keys(m)) {
            const v = m[key];
            if (v && v.isTexture) v.dispose();
          }
          m.dispose?.();
        }
      });
      renderer.dispose();
    },
  };

  return api;
}

export { DEFAULTS as GLOBE_DEFAULTS };
