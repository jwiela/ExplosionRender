const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Sterowanie ruchem WSAD
const moveSpeed = 0.05;
const move = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
    case 'Space': // start explosion po spacji
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

const textureLoader = new THREE.TextureLoader();

let spriteTexture = null;
textureLoader.load('particle.png', function (sprite) {
  spriteTexture = sprite;
});

let geometry, material, particles;
let velocities = [];
const count = 500;

let explosionActive = false;
let explosionStartTime = 0;
const explosionDuration = 2000;

// Funkcja aktualizująca pozycję kamery wg WSAD
function updateCameraMovement() {
  // Vector do przodu i boku (zależne od kierunku patrzenia kamery)
  const forwardVector = new THREE.Vector3();
  camera.getWorldDirection(forwardVector);
  forwardVector.y = 0; // zablokuj ruch w osi y (wysokość), żeby nie latać pionowo
  forwardVector.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(camera.up, forwardVector);
  rightVector.normalize();

  if (move.forward) camera.position.addScaledVector(forwardVector, moveSpeed);
  if (move.backward) camera.position.addScaledVector(forwardVector, -moveSpeed);
  if (move.left) camera.position.addScaledVector(rightVector, moveSpeed);
  if (move.right) camera.position.addScaledVector(rightVector, -moveSpeed);
}

function renderScene() {
  requestAnimationFrame(renderScene);

  updateCameraMovement();

  controls.update();
  renderer.render(scene, camera);

  if (explosionActive) {
    updateExplosion();
  }
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

  const elapsed = performance.now() - explosionStartTime;
  if (elapsed > explosionDuration) {
    endExplosion();
  }
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
    positions.push(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    velocities.push(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );
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

// Start renderowania
renderScene();
