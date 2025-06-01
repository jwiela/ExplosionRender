const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// GLB Model loader
const gltfLoader = new THREE.GLTFLoader();
let model = null;

gltfLoader.load('texstures/minecraft_landscape.glb', (gltf) => {
  model = gltf.scene;
  model.position.set(0, -1, -5);
  scene.add(model);
});

// Camera movement
const moveSpeed = 0.5;
const move = { forward: false, backward: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
    case 'Space':
      if (spriteTexture) startExplosion();
      break;
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

function updateCameraMovement() {
  const forwardVector = new THREE.Vector3();
  camera.getWorldDirection(forwardVector);
  forwardVector.y = 0;
  forwardVector.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(forwardVector, camera.up).normalize();

  if (move.forward) camera.position.addScaledVector(forwardVector, moveSpeed);
  if (move.backward) camera.position.addScaledVector(forwardVector, -moveSpeed);
  if (move.left) camera.position.addScaledVector(rightVector, -moveSpeed);
  if (move.right) camera.position.addScaledVector(rightVector, moveSpeed);
}

// Particle system
const textureLoader = new THREE.TextureLoader();
let spriteTexture = null;
textureLoader.load('particle.png', (sprite) => { spriteTexture = sprite; });

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

function startExplosion() {
  if (!model || !explosionTextures.length) return;

  if (particles) {
    scene.remove(particles);
    particles.geometry.dispose();
    particles.material.dispose();
    particles = null;
  }

  const modelPos = new THREE.Vector3();
  model.getWorldPosition(modelPos);

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

    positions.push(x + modelPos.x, y + modelPos.y, z + modelPos.z);

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

  startSmoke(modelPos);
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
    particles.geometry.dispose();
    particles.material.dispose();
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

// Main render loop
function renderScene() {
  requestAnimationFrame(renderScene);
  updateCameraMovement();
  if (explosionActive) updateExplosion();
  renderer.render(scene, camera);
}

renderScene();
