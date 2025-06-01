const scene = new THREE.Scene();

// Load cube map skybox
const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader.load([
  'texstures/skybox/posx.jpg', // Positive X
  'texstures/skybox/negx.jpg', // Negative X
  'texstures/skybox/posy.jpg', // Positive Y
  'texstures/skybox/negy.jpg', // Negative Y
  'texstures/skybox/posz.jpg', // Positive Z
  'texstures/skybox/negz.jpg'  // Negative Z
]);
scene.background = skyboxTexture;
scene.environment = skyboxTexture; // Optional: adds environment lighting to scene objects

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 10);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

const gltfLoader = new THREE.GLTFLoader();
let model = null;
let cameraBounds = null;

gltfLoader.load('texstures/minecraft_landscape.glb', (gltf) => {
  model = gltf.scene;
  model.position.set(0, -1, -5);
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const margin = 0.5;

  cameraBounds = {
    minX: box.min.x + margin,
    maxX: box.max.x - margin,
    minZ: box.min.z + margin,
    maxZ: box.max.z - margin,
    minY: box.min.y + 1.0,
    maxY: box.max.y + 1.0
  };
});

const moveSpeed = 0.1;
const move = { forward: false, backward: false, left: false, right: false };
let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.002;

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.backward = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
});

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= e.movementX * mouseSensitivity;
    pitch -= e.movementY * mouseSensitivity;
    const pitchLimit = Math.PI / 2 - 0.1;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
  }
});

function updateCameraMovement() {
  camera.rotation.set(pitch, yaw, 0);

  const forward = new THREE.Vector3(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  ).normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const newPos = camera.position.clone();

  if (move.forward) newPos.addScaledVector(forward, moveSpeed);
  if (move.backward) newPos.addScaledVector(forward, -moveSpeed);
  if (move.left) newPos.addScaledVector(right, -moveSpeed);
  if (move.right) newPos.addScaledVector(right, moveSpeed);

  if (cameraBounds) {
    newPos.x = THREE.MathUtils.clamp(newPos.x, cameraBounds.minX, cameraBounds.maxX);
    newPos.z = THREE.MathUtils.clamp(newPos.z, cameraBounds.minZ, cameraBounds.maxZ);
    newPos.y = THREE.MathUtils.clamp(newPos.y, cameraBounds.minY, cameraBounds.maxY);
  }

  camera.position.copy(newPos);
}

const textureLoader = new THREE.TextureLoader();

const explosionTextures = [];
const textureNames = [
  'circle_01.png', 'dirt_01.png', 'flame_01.png',
  'fire_01.png', 'flare_01.png', 'light_01.png',
  'magic_01.png', 'star_01.png', 'spark_01.png',
];
textureNames.forEach(name => {
  textureLoader.load(`PNG/${name}`, (texture) => explosionTextures.push(texture));
});

const smokeTextures = [];
for (let i = 1; i <= 9; i++) {
  textureLoader.load(`PNG/smoke_0${i}.png`, (texture) => smokeTextures.push(texture));
}

let geometry, material, particles;
let velocities = [];
const count = 500;
let explosionActive = false;
let explosionStartTime = 0;
const explosionDuration = 2000;

function startExplosionAt(pos) {
  if (!explosionTextures.length) return;

  if (particles) {
    scene.remove(particles);
    geometry.dispose();
    material.dispose();
    particles = null;
  }

  velocities = [];
  const positions = [];
  const textureIndex = Math.floor(Math.random() * explosionTextures.length);
  const selectedTexture = explosionTextures[textureIndex];

  for (let i = 0; i < count; i++) {
    const radius = Math.random() * 0.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions.push(x + pos.x, y + pos.y, z + pos.z);

    const speed = Math.random() * 0.2;
    const dir = new THREE.Vector3(x, y, z).normalize();
    velocities.push(
      dir.x * speed + (Math.random() - 0.5) * 0.05,
      dir.y * speed + (Math.random() - 0.5) * 0.05,
      dir.z * speed + (Math.random() - 0.5) * 0.05
    );
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  material = new THREE.PointsMaterial({
    size: 0.3,
    map: selectedTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 1,
    color: 0xffaa00
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  explosionActive = true;
  explosionStartTime = performance.now();

  startSmoke(pos);
}

function updateExplosion() {
  if (!geometry || !material) return;

  const pos = geometry.attributes.position.array;
  const elapsedTime = performance.now() - explosionStartTime;
  material.opacity = Math.max(1 - elapsedTime / explosionDuration, 0);

  for (let i = 0; i < count; i++) {
    pos[i * 3] += velocities[i * 3];
    pos[i * 3 + 1] += velocities[i * 3 + 1];
    pos[i * 3 + 2] += velocities[i * 3 + 2];
  }
  geometry.attributes.position.needsUpdate = true;

  if (elapsedTime > explosionDuration) endExplosion();
}

function endExplosion() {
  explosionActive = false;
  if (particles) {
    scene.remove(particles);
    geometry.dispose();
    material.dispose();
    particles = null;
  }
}

function startSmoke(origin) {
  const smokeCount = 50;
  const smokePositions = [];
  const smokeVelocities = [];
  const smokeGeometry = new THREE.BufferGeometry();

  for (let i = 0; i < smokeCount; i++) {
    const x = origin.x + (Math.random() - 0.5);
    const y = origin.y;
    const z = origin.z + (Math.random() - 0.5);
    smokePositions.push(x, y, z);

    smokeVelocities.push(
      (Math.random() - 0.5) * 0.02,
      Math.random() * 0.1 + 0.05,
      (Math.random() - 0.5) * 0.02
    );
  }

  smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smokePositions, 3));
  const smokeMaterial = new THREE.PointsMaterial({
    size: 1,
    map: smokeTextures[Math.floor(Math.random() * smokeTextures.length)],
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.2
  });

  const smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
  scene.add(smokeParticles);

  const smokeStartTime = performance.now();
  function updateSmoke() {
    const elapsedTime = performance.now() - smokeStartTime;
    const pos = smokeGeometry.attributes.position.array;

    for (let i = 0; i < smokeCount; i++) {
      pos[i * 3] += smokeVelocities[i * 3];
      pos[i * 3 + 1] += smokeVelocities[i * 3 + 1];
      pos[i * 3 + 2] += smokeVelocities[i * 3 + 2];
    }

    smokeGeometry.attributes.position.needsUpdate = true;
    smokeMaterial.opacity = Math.max(0.3 - elapsedTime / 4000, 0);

    if (smokeMaterial.opacity > 0) {
      requestAnimationFrame(updateSmoke);
    } else {
      scene.remove(smokeParticles);
      smokeGeometry.dispose();
      smokeMaterial.dispose();
    }
  }

  setTimeout(() => updateSmoke(), 500);
}

const bombGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const bombMaterial = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0x440000 });
const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
scene.add(bomb);

bomb.position.set(0, 5, -5);
let bombFalling = false;
const bombFallSpeed = 0.07;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!bombFalling && !explosionActive) {
      bomb.position.set(0, 5, -5);
      bomb.visible = true;
      bombFalling = true;
    }
  }
});

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

function updateBomb() {
  if (!bombFalling) return;

  bomb.position.y -= bombFallSpeed;

  if (bomb.position.y <= -1) {
    bombFalling = false;
    bomb.visible = false;
    startExplosionAt(bomb.position.clone());
  }
}

function renderScene() {
  requestAnimationFrame(renderScene);
  updateCameraMovement();
  updateBomb();
  if (explosionActive) updateExplosion();
  renderer.render(scene, camera);
}

renderScene();