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

// Ładowanie wielu tekstur z folderu PNG
const explosionTextures = [];
const textureNames = [
  'circle_01.png', 'dirt_01.png', 'flame_01.png',
  'fire_01.png', 'flare_01.png', 'light_01.png',
  'magic_01.png', 'star_01.png', 'spark_01.png',
];

textureNames.forEach((name) => {
  textureLoader.load(`PNG/${name}`, (texture) => {
    explosionTextures.push(texture);
  });
});

// Ładowanie tekstur dymu
const smokeTextures = [];
for (let i = 1; i <= 9; i++) {
  textureLoader.load(`PNG/smoke_0${i}.png`, (texture) => {
    smokeTextures.push(texture);
  });
}

function updateCameraMovement() {
  const forwardVector = new THREE.Vector3();
  camera.getWorldDirection(forwardVector);
  forwardVector.y = 0; // blokujemy ruch pionowy (wysokość)
  forwardVector.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(forwardVector, camera.up);
  rightVector.normalize();

  // Poruszanie się kamery na podstawie WSAD
  if (move.forward) camera.position.addScaledVector(forwardVector, moveSpeed);
  if (move.backward) camera.position.addScaledVector(forwardVector, -moveSpeed);
  if (move.left) camera.position.addScaledVector(rightVector, -moveSpeed);
  if (move.right) camera.position.addScaledVector(rightVector, moveSpeed);
}

camera.position.set(0, 0, 10);camera.position.set(0, 0, 10);
function updateExplosion() {
  if (!geometry || !material) return;

  const pos = geometry.attributes.position.array;
  const elapsedTime = performance.now() - explosionStartTime;

  // Stopniowe zmniejszanie opacity
  const fadeFactor = 1 - elapsedTime / explosionDuration; // Obliczanie współczynnika zanikania
  material.opacity = Math.max(fadeFactor, 0); // Ustawienie opacity w zakresie [0, 1]

  for (let i = 0; i < count; i++) {
    pos[i * 3] += velocities[i * 3];
    pos[i * 3 + 1] += velocities[i * 3 + 1];
    pos[i * 3 + 2] += velocities[i * 3 + 2];
  }

  geometry.attributes.position.needsUpdate = true;

  // Zakończenie eksplozji, gdy opacity osiągnie 0
  if (elapsedTime > explosionDuration) {
    endExplosion();
  }
}

function endExplosion() {
  explosionActive = false;
  if (particles) {
    scene.remove(particles);
    particles.geometry.dispose();
    particles.material.dispose();
    particles = null;    // Dodanie różnych obiektów do sceny
  }
}

function createMap() {
  // Sześcian
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 0, -5);
  scene.add(cube);

  // Kula
  const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(2, 0, -3);
  scene.add(sphere);

  // Płaszczyzna (podłoga)
  const planeGeometry = new THREE.PlaneGeometry(10, 10);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2; // Obrót, aby była pozioma
  plane.position.set(0, -1, 0);
  scene.add(plane);

  // Piramida
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 4);
  const coneMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.set(-2, 0, -4);
  scene.add(cone);

  // Drugi sześcian
  const cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube2.position.set(-3, 0, -6);
  scene.add(cube2);
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
  const textureIndex = Math.floor(Math.random() * explosionTextures.length); // Losowy wybór tekstury
  const selectedTexture = explosionTextures[textureIndex];

  for (let i = 0; i < count; i++) {
    const radius = Math.random() * 0.5; // Losowy promień (większy zakres)
    const theta = Math.random() * Math.PI * 2; // Kąt w płaszczyźnie XY
    const phi = Math.random() * Math.PI; // Kąt w osi Z

    const x = radius * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 0.2; // Dodanie losowego odchylenia
    const y = radius * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 0.2; // Dodanie losowego odchylenia
    const z = radius * Math.cos(phi) + (Math.random() - 0.5) * 0.2; // Dodanie losowego odchylenia

    positions.push(x, y, z);

    const speedFactor = Math.random() * 0.2; // Losowa prędkość
    const direction = new THREE.Vector3(x, y, z).normalize(); // Kierunek od środka
    velocities.push(
      direction.x * speedFactor + (Math.random() - 0.5) * 0.05, // Dodanie losowego odchylenia
      direction.y * speedFactor + (Math.random() - 0.5) * 0.05, // Dodanie losowego odchylenia
      direction.z * speedFactor + (Math.random() - 0.5) * 0.05  // Dodanie losowego odchylenia
    );
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  material = new THREE.PointsMaterial({
    size: 0.3,
    map: selectedTexture, // Użycie losowo wybranej tekstury
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 1, // Początkowa przezroczystość
    color: 0xffaa00
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  explosionActive = true;
  explosionStartTime = performance.now();

  // Dodanie efektu unoszącego się dymu
  startSmoke();
}

function startSmoke() {
  const smokeCount = 50; // Liczba cząsteczek dymu
  const smokePositions = [];
  const smokeVelocities = [];
  const smokeGeometry = new THREE.BufferGeometry();

  for (let i = 0; i < smokeCount; i++) {
    const x = (Math.random() - 0.5) * 1; // Losowa pozycja w poziomie (mniejszy zakres)
    const y = 0; // Startowa pozycja dymu (na środku eksplozji)
    const z = (Math.random() - 0.5) * 1; // Losowa pozycja w poziomie (mniejszy zakres)

    smokePositions.push(x, y, z);

    // Dym unosi się w górę z losową prędkością i odchyleniami w poziomie
    smokeVelocities.push(
      (Math.random() - 0.5) * 0.02, // Losowe odchylenie w poziomie X
      Math.random() * 0.1 + 0.05,   // Ruch w górę (większy zakres)
      (Math.random() - 0.5) * 0.02  // Losowe odchylenie w poziomie Z
    );
  }

  smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smokePositions, 3));
  const smokeMaterial = new THREE.PointsMaterial({
    size: 1,
    map: smokeTextures[Math.floor(Math.random() * smokeTextures.length)], // Losowa tekstura dymu
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.2 // Początkowa przezroczystość (bardziej zfadowany)
  });

  const smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
  scene.add(smokeParticles);

  // Animacja dymu
  const smokeStartTime = performance.now();
  function updateSmoke() {
    const elapsedTime = performance.now() - smokeStartTime;

    const pos = smokeGeometry.attributes.position.array;
    for (let i = 0; i < smokeCount; i++) {
      pos[i * 3] += smokeVelocities[i * 3];       // Ruch w poziomie X
      pos[i * 3 + 1] += smokeVelocities[i * 3 + 1]; // Ruch w górę Y
      pos[i * 3 + 2] += smokeVelocities[i * 3 + 2]; // Ruch w poziomie Z
    }

    smokeGeometry.attributes.position.needsUpdate = true;

    // Stopniowe zanikanie dymu
    smokeMaterial.opacity = Math.max(0.3 - elapsedTime / 4000, 0); // Fade w ciągu 4 sekund

    if (smokeMaterial.opacity > 0) {
      requestAnimationFrame(updateSmoke);
    } else {
      scene.remove(smokeParticles);
      smokeGeometry.dispose();
      smokeMaterial.dispose();
    }
  }

  // Dodanie minimalnego opóźnienia przed rozpoczęciem animacji dymu
  setTimeout(() => {
    updateSmoke();
  }, 500); // Opóźnienie 500 ms
}

createMap(); // Tworzenie mapy

function renderScene() {
  requestAnimationFrame(renderScene);
  updateCameraMovement(); // Aktualizacja ruchu kamery
  renderer.render(scene, camera);
  if (explosionActive) updateExplosion(); // Aktualizacja eksplozji
}

renderScene();
