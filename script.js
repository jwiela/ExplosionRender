const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

// Ładowanie EXR jako tła i środowiska
const exrLoader = new THREE.EXRLoader();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

exrLoader.load('texstures/pine_picnic_4k.exr', function (texture) {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.background = envMap;
  scene.environment = envMap;

  texture.dispose();
  pmremGenerator.dispose();
});

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// WSAD
const moveSpeed = 0.05;
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

// Explosion
const textureLoader = new THREE.TextureLoader();
let spriteTexture = null;
textureLoader.load('particle.png', (sprite) => { spriteTexture = sprite; });

let geometry, material, particles;
let velocities = [];
const count = 500;
let explosionActive = false;
let explosionStartTime = 0;
const explosionDuration = 2000;

function updateCameraMovement() {
  const forwardVector = new THREE.Vector3();
  camera.getWorldDirection(forwardVector);
  forwardVector.y = 0;
  forwardVector.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(camera.up, forwardVector);
  rightVector.normalize();

  if (move.forward) camera.position.addScaledVector(forwardVector, moveSpeed);
  if (move.backward) camera.position.addScaledVector(forwardVector, -moveSpeed);
  if (move.left) camera.position.addScaledVector(rightVector, moveSpeed);
  if (move.right) camera.position.addScaledVector(rightVector, -moveSpeed);
}

function updateExplosion() {
  if (!geometry) return;
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < count; i++) {
    pos[i * 3] += velocities[i * 3];
    pos[i * 3 + 1] += velocities[i * 3 + 1];
    pos[i * 3 + 2] += velocities[i * 3 + 2];
  }
  geometry.attributes.position.needsUpdate = true;

  if (performance.now() - explosionStartTime > explosionDuration) endExplosion();
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

function startExplosion() {
  if (particles) {
    scene.remove(particles);
    particles.geometry.dispose();
    particles.material.dispose();
    particles = null;
  }

  velocities = [];
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    velocities.push((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  material = new THREE.PointsMaterial({
    size: 0.3,
    map: spriteTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xffaa00
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  explosionActive = true;
  explosionStartTime = performance.now();
}

function renderScene() {
  requestAnimationFrame(renderScene);
  updateCameraMovement();
  controls.update();
  renderer.render(scene, camera);
  if (explosionActive) updateExplosion();
}

renderScene();
