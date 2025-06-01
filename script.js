const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Czarne tło

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// Kontrola kamery (myszka)
const controls = new THREE.OrbitControls(camera, renderer.domElement);

const textureLoader = new THREE.TextureLoader();

let geometry, material, particles;
let velocities = [];
const count = 500;

let explosionStarted = false;  // flaga, czy animacja działa

// Ładujemy teksturę od razu, ale cząstki inicjujemy dopiero po spacji
let spriteTexture = null;
textureLoader.load('particle.png', function (sprite) {
  spriteTexture = sprite;
});

// Nasłuch na wciśnięcie spacji
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !explosionStarted) {
    explosionStarted = true;
    initParticles(spriteTexture);
    animate();
  }
});

function initParticles(sprite) {
  velocities = []; // reset velocity przy kolejnym wybuchu

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
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xffaa00
  });

  if (particles) {
    scene.remove(particles);  // usuń stare cząstki przy kolejnym wybuchu
  }

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function animate() {
  if (!explosionStarted) return;

  requestAnimationFrame(animate);

  if (!geometry) return;

  const pos = geometry.attributes.position.array;

  for (let i = 0; i < count; i++) {
    pos[i * 3] += velocities[i * 3];
    pos[i * 3 + 1] += velocities[i * 3 + 1];
    pos[i * 3 + 2] += velocities[i * 3 + 2];
  }

  geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}
