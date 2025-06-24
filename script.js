const scene = new THREE.Scene();

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
scene.environment = skyboxTexture; 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 10);

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
    maxY: box.max.y + 3.0
  };
});

const moveAcceleration = 0.02;
const maxSpeed = 0.15;
const friction = 0.85;
const move = { forward: false, backward: false, left: false, right: false };
let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.002;
let velocity = new THREE.Vector3(0, 0, 0);

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
  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  


  const acceleration = new THREE.Vector3();
  if (move.forward) acceleration.add(forward.multiplyScalar(moveAcceleration));
  if (move.backward) acceleration.add(forward.multiplyScalar(-moveAcceleration));
  if (move.right) acceleration.add(right.multiplyScalar(moveAcceleration));
  if (move.left) acceleration.add(right.multiplyScalar(-moveAcceleration));


  velocity.add(acceleration);


  velocity.multiplyScalar(friction);


  const speed = velocity.length();
  if (speed > maxSpeed) {
    velocity.multiplyScalar(maxSpeed / speed);
  }

  const newPos = camera.position.clone().add(velocity);


  if (cameraBounds) {
    newPos.x = THREE.MathUtils.clamp(newPos.x, cameraBounds.minX, cameraBounds.maxX);
    newPos.y = THREE.MathUtils.clamp(newPos.y, cameraBounds.minY, cameraBounds.maxY);
    newPos.z = THREE.MathUtils.clamp(newPos.z, cameraBounds.minZ, cameraBounds.maxZ);
  }

  camera.position.copy(newPos);
}





const textureLoader = new THREE.TextureLoader();

const explosionTextures = [];
const textureNames = [
  'flame_01.png',
  'fire_01.png',
];
textureNames.forEach(name => {
  textureLoader.load(`PNG/${name}`, (texture) => explosionTextures.push(texture));
});

const smokeTextures = [];
for (let i = 1; i <= 9; i++) {
  textureLoader.load(`PNG/smoke_0${i}.png`, (texture) => smokeTextures.push(texture));
}

let bombModel = null;
let bombFalling = false;
const bombFallSpeed = 0.07;

gltfLoader.load('texstures/atomic_bomb.glb', (gltf) => {
  bombModel = gltf.scene;
  bombModel.scale.set(0.2, 0.2, 0.2);  
  bombModel.visible = false;  
  scene.add(bombModel);
});

function startExplosionAt(pos) {
  flashScreen(); 
  setTimeout(() => createPlasmaBall(pos), 10); 
  setTimeout(() => createShockwave(pos), 40); 
  setTimeout(() => createFireball(pos), 80); 
  setTimeout(() => startMushroomCloud(pos), 180); 
  setTimeout(() => startSmoke(pos), 350); 
  setTimeout(() => createFallout(pos), 2500); 
}

function createPlasmaBall(pos) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 40; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = 0.2 + Math.random() * 0.1;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),                   
      r * Math.sin(phi) * Math.sin(theta) 
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 1.2,
    map: explosionTextures[1] || null,
    color: 0x99ccff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.position.set(pos.x, pos.y, pos.z);
  scene.add(points);

  const start = performance.now();
  function update() {
    const t = (performance.now() - start) / 1000;
    material.opacity = 0.95 - t * 2.5;
    points.scale.setScalar(1 + t * 2.5);
    if (material.opacity > 0) {
      requestAnimationFrame(update);
    } else {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    }
  }
  update();
}

function createShockwave(pos) {
  const shockwaveY = pos.y + 1.3;

  const ringGeo = new THREE.RingGeometry(0.5, 1.5, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0, 
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, shockwaveY, pos.z); 
  scene.add(ring);

  const start = performance.now();
  function update() {
    const t = (performance.now() - start) / 1000;
    ring.scale.setScalar(1 + t * 7); 
    ring.material.opacity = 1.0 * (1 - t / 1.5); 

    if (ring.material.opacity > 0) {
      requestAnimationFrame(update);
    } else {
      scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    }
  }
  update();
}

function flashScreen() {
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.top = 0;
  flash.style.left = 0;
  flash.style.width = '100vw';
  flash.style.height = '100vh';
  flash.style.backgroundColor = 'white';
  flash.style.opacity = 1;
  flash.style.zIndex = 9999;
  flash.style.pointerEvents = 'none';
  document.body.appendChild(flash);

  let opacity = 1;
  function fade() {
    opacity -= 0.05;
    flash.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(fade);
    } else {
      document.body.removeChild(flash);
    }
  }

  setTimeout(fade, 30);
}

function createFireball(pos) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 150; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = 0.5 + Math.random() * 0.3;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),                  
      r * Math.sin(phi) * Math.sin(theta)  
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 2.5,
    map: explosionTextures[0] || null, 
    color: 0xffcc00,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.position.set(pos.x, pos.y, pos.z);
  scene.add(points);

  const start = performance.now();
  function update() {
    const t = (performance.now() - start) / 1000;
    material.opacity = 0.85 - t * 0.7;
    points.scale.setScalar(1 + t * 2.5);
    if (material.opacity > 0) {
      requestAnimationFrame(update);
    } else {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    }
  }
  update();
}

function startSmoke(origin) {
  const smokeCount = 200;
  const smokePositions = [];
  const smokeVelocities = [];
  const smokeGeometry = new THREE.BufferGeometry();

  for (let i = 0; i < smokeCount; i++) {
    const x = origin.x + (Math.random() - 0.5);
    const y = origin.y;
    const z = origin.z + (Math.random() - 0.5);
    smokePositions.push(x, y, z);

    smokeVelocities.push(
      (Math.random() - 0.5) * 0.1,
      Math.random() * 0.1 + 0.05,
      (Math.random() - 0.1) * 0.05
    );
  }

  smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smokePositions, 3));
  const smokeMaterial = new THREE.PointsMaterial({
    size: 2,
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

  setTimeout(() => updateSmoke(), 100);
}

function startMushroomCloud(origin) {
  const count = 600;
  const positions = [];
  const velocities = [];
  const geometry = new THREE.BufferGeometry();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 1.5;
    const height = Math.random() * 2;

    const x = Math.cos(angle) * radius;
    const y = height;
    const z = Math.sin(angle) * radius;

    positions.push(origin.x + x, origin.y + y, origin.z + z);

  
    velocities.push(x * 0.005, 0.02 + Math.random() * 0.03, z * 0.005);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const texture = smokeTextures[Math.floor(Math.random() * smokeTextures.length)];
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const material = new THREE.PointsMaterial({
    size: 2.0,
    map: texture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.1, 
    vertexColors: false,
    sizeAttenuation: true
  });

  const cloud = new THREE.Points(geometry, material);
  scene.add(cloud);

  const startTime = performance.now();

  function update() {
    const time = performance.now() - startTime;
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];
      pos[i * 3 + 2] += velocities[i * 3 + 2];
    }

    geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.max(0.25 - time / 6000, 0);

    if (material.opacity > 0) {
      requestAnimationFrame(update);
    } else {
      scene.remove(cloud);
      geometry.dispose();
      material.dispose();
    }
  }

  update();
}

function createFallout(pos) {
  const geometry = new THREE.BufferGeometry();
  const count = 1200; 
  const positions = [];
  const velocities = [];
  
  const falloutRadius = 50; 

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * falloutRadius;
    const x = pos.x + Math.cos(angle) * radius;
    const z = pos.z + Math.sin(angle) * radius;
    const y = pos.y + 10 + Math.random() * 8;

    positions.push(x, y, z);

    velocities.push(
      (Math.random() - 0.5) * 0.002, 
      -0.003 - Math.random() * 0.003,
      (Math.random() - 0.5) * 0.002
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.22,
    map: smokeTextures[0] || null,
    color: 0xaaa97f,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const start = performance.now();
  function update() {
    const t = (performance.now() - start) / 1000;
    const posArr = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3] += velocities[i * 3];
      posArr[i * 3 + 1] += velocities[i * 3 + 1];
      posArr[i * 3 + 2] += velocities[i * 3 + 2];
    }
    geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.max(0.32 - t * 0.012, 0); 
    if (material.opacity > 0) {
      requestAnimationFrame(update);
    } else {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    }
  }
  update();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!bombFalling && bombModel) {
      bombModel.position.set(0, 5, -5);
      bombModel.visible = true;
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
  if (!bombFalling || !bombModel) return;

  bombModel.position.y -= bombFallSpeed;

  if (bombModel.position.y <= 0.5) {
    bombFalling = false;
    bombModel.visible = false;
    startExplosionAt(bombModel.position.clone());
  }
}

function renderScene() {
  requestAnimationFrame(renderScene);
  updateCameraMovement();
  updateBomb();
  renderer.render(scene, camera);
}
//////
/////
/////
/////
renderScene();