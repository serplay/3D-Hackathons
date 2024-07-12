import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as CANNON from 'cannon';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FastAverageColor } from 'fast-average-color';

// Function to fetch hackathons from an API
async function pullHackathons() {
  const response = await fetch('https://corsproxy.io/?' + 'https://hackathons.hackclub.com/api/events/all');
  const hackathons = await response.json();
  const length = hackathons.length;
  const last50 = hackathons.slice(length - 50, length); // Get the last 50 hackathons
  return last50;
}

// Function to create a hackathon card canvas
async function createHackathonCanvas(
  id = 'default',
  banner = '/default_card_bg.png',
  logo = '/logo.png',
  name = 'RythmHacks',
  date = 'September 1–3',
  city = 'Waterloo',
  state = '',
  country = 'Canada',
  eventType = 'in-person'
) {
  const scalar = 4; // Scaling factor for high resolution
  const hackathonBanner = new Image();
  hackathonBanner.src = banner !== '/default_card_bg.png' ? 'https://corsproxy.io/?'+banner : banner;

  const hackathonLogo = new Image();
  hackathonLogo.src = logo !== '/logo.png' ? 'https://corsproxy.io/?'+logo : logo;

  const hackathonCanvas = document.createElement('canvas');
  hackathonCanvas.width = 640 * scalar;
  hackathonCanvas.height = 360 * scalar;
  hackathonCanvas.id = id;
  document.body.appendChild(hackathonCanvas);

  const eventTypeColors = {
    'in-person': '#00BCD4',
    'hybrid': '#4CAF50',
    'online': '#F44336'
  };

  // Wait for both images to load
  await Promise.all([
    new Promise(resolve => { hackathonBanner.onload = resolve; }),
    new Promise(resolve => { hackathonLogo.onload = resolve; })
  ]);

  const canvas = document.querySelector('#' + id);
  const ctx = canvas.getContext('2d');

  // Draw the banner image
  ctx.drawImage(hackathonBanner, 0, 0, 640 * scalar, 360 * scalar);

  const logoSize = 100 * scalar;
  // Draw the logo image
  ctx.drawImage(hackathonLogo, 320 * scalar - logoSize / 2, 160 * scalar - logoSize / 2, logoSize, logoSize);

  ctx.font = 'bold 160px system-ui';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';

  const text_distance = 25 * scalar;
  // Draw the hackathon name
  ctx.fillText(name, 320 * scalar, 285 * scalar + text_distance);

  ctx.font = '100px system-ui';
  // Draw the hackathon date and location
  ctx.fillText(`${date}: ${city}, ${country}`, 320 * scalar, 240 * scalar + text_distance);

  const eventTypeText = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  const eventTypeColor = eventTypeColors[eventType];
  ctx.fillStyle = eventTypeColor;
  ctx.strokeStyle = eventTypeColor;
  ctx.lineWidth = 2;

  const rectX = 480 * scalar - 100;
  const rectY = 20 * scalar;
  const rectWidth = 150 * scalar;
  const rectHeight = 40 * scalar;
  const rectRadius = 10 * scalar;

  // Draw rounded rectangle for event type
  ctx.beginPath();
  ctx.moveTo(rectX + rectRadius, rectY);
  ctx.lineTo(rectX + rectWidth - rectRadius, rectY);
  ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + rectRadius);
  ctx.lineTo(rectX + rectWidth, rectY + rectHeight - rectRadius);
  ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - rectRadius, rectY + rectHeight);
  ctx.lineTo(rectX + rectRadius, rectY + rectHeight);
  ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - rectRadius);
  ctx.lineTo(rectX, rectY + rectRadius);
  ctx.quadraticCurveTo(rectX, rectY, rectX + rectRadius, rectY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 80px system-ui';
  ctx.fillStyle = '#FFFFFF';
  // Draw the event type text
  ctx.fillText(eventTypeText, rectX + rectWidth / 2, rectY + rectHeight / 2 + 5 * scalar);

  const texture = new THREE.CanvasTexture(canvas);
  const back = new THREE.TextureLoader().load(hackathonBanner);
  const fac = new FastAverageColor();
  const sides = new Image().src = '/deafult_card_bg.png'; 
  document.body.removeChild(canvas);
  return [texture, back, new THREE.Color(sides.rgb)];
}

// Main function to initialize the scene
async function main() {
  const hackathons = await pullHackathons();

  // Create hackathon cards
  const hackathonCards = await Promise.all(hackathons.map((hackathon, index) => {
    return createHackathonCanvas(
      `hackathon_${index}`,
      hackathon.banner || '/default_card_bg.png',
      hackathon.logo || '/logo.png',
      hackathon.name,
      hackathon.date,
      hackathon.city || '',
      hackathon.state || '',
      hackathon.country || '',
      hackathon.eventType
    );
  }));
  
  console.log(hackathonCards)
  console.log('here')
  
  const AppCanvas = document.createElement('canvas');
  AppCanvas.id = 'app';
  document.body.appendChild(AppCanvas);
  
  const scene = new THREE.Scene();
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0); // Set gravity for the physics world

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 10, 30); // Set initial camera position

  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#app'),
    antialias: true,
  });

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.outputEncoding = THREE.sRGBEncoding;
  window.addEventListener('resize', onWindowResize);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Load the environment texture
  new RGBELoader()
    .load("/env.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
    });

  // Add directional light
  const sunLight = new THREE.DirectionalLight(0xffe5b4, 1);
  const angle = 45 * Math.PI / 180;
  const d = 500;
  sunLight.position.set(d * Math.cos(angle), d * Math.sin(angle), d);
  sunLight.castShadow = true;
  scene.add(sunLight);

  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;

  // Add orbit controls for the camera
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = 1.5512625986551463;
  controls.target.set(0, 0, 0);
  controls.maxDistance = 50;
  controls.cursor = new THREE.Vector3(0, 0, 0);
  controls.maxTargetRadius = 50;
  controls.enablePan = true;
  controls.maxZoom = 1;

  // Class to create the ground plane
  class Plane {
    constructor(scene, world, color = 0xffff00) {
      const planeShape = new CANNON.Plane();
      this.planeBody = new CANNON.Body({ mass: 0 });
      this.planeBody.addShape(planeShape);
      this.planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
      world.addBody(this.planeBody);

      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
      this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
      this.plane.receiveShadow = true;
      this.plane.rotation.x = Math.PI / 2;
      scene.add(this.plane);
    }
  }

  // Class to create the hackathon card objects
  class Card {
    constructor(scene, world, id, albedo, bg, sides, position = { x: 0, y: 0.5, z: 0 }, dimensions = { x: 1, y: 1, z: 1 }) {
      this.id = id;

      const cubeShape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2));
      this.cubeBody = new CANNON.Body({ mass: 1 });
      this.cubeBody.addShape(cubeShape);
      this.cubeBody.position.set(position.x, position.y, position.z);
      world.addBody(this.cubeBody);

      const textureLoader = new THREE.TextureLoader();
      const texture = {
        ao: textureLoader.load('/material/ao.jpg'),
        albedo: albedo,
        height: textureLoader.load('/material/height.png'),
        metallic: textureLoader.load('/material/metallic.jpg'),
        normal: textureLoader.load('/material/normal.png'),
        roughness: textureLoader.load('/material/roughness.jpg')
      };

      const material = new THREE.MeshStandardMaterial({
        aoMap: texture.ao,
        aoMapIntensity: 1,
        map: texture.albedo,
        normalMap: texture.normal,
        normalScale: new THREE.Vector2(1, 1),
        displacementMap: texture.height,
        displacementScale: 0.1,
        displacementBias: -0.1,
        roughnessMap: texture.roughness,
        roughness: 1,
        metalnessMap: texture.metallic,
        metalness: 1,
      });

      const materialBg = new THREE.MeshStandardMaterial({
        aoMap: texture.ao,
        aoMapIntensity: 1,
        map: bg,
        normalMap: texture.normal,
        normalScale: new THREE.Vector2(1, 1),
        displacementMap: texture.height,
        displacementScale: 0.1,
        displacementBias: -0.1,
        roughnessMap: texture.roughness,
        roughness: 1,
        metalnessMap: texture.metallic,
        metalness: 1,
      });

      const materialSides = new THREE.MeshStandardMaterial({
        aoMap: texture.ao,
        aoMapIntensity: 1,
        color: sides,
        normalMap: texture.normal,
        normalScale: new THREE.Vector2(1, 1),
        displacementMap: texture.height,
        displacementScale: 0.1,
        displacementBias: -0.1,
        roughnessMap: texture.roughness,
        roughness: 1,
        metalnessMap: texture.metallic,
        metalness: 1,
      });

      const geometry = new RoundedBoxGeometry(dimensions.x, dimensions.y, dimensions.z, 10, 3.14 / 18);
      this.cube = new THREE.Mesh(geometry, [materialSides, materialSides, materialSides, materialSides, material, materialBg]);
      this.cube.castShadow = true;
      scene.add(this.cube);

      this.cubeInFrontOfCamera = false;

      renderer.domElement.addEventListener('click', (event) => this.onClick(event), false);
    }

    update() {
      if (this.cubeInFrontOfCamera) {
        const v1 = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const cameraOffset = camera.position.clone().add(v1.multiplyScalar(-20));
        this.cubeBody.quaternion.copy(camera.quaternion);
        this.cubeBody.position.copy(cameraOffset);
        this.cubeBody.velocity.set(0, 0, 0);
        this.cubeBody.angularVelocity.set(0, 0, 0);
        this.cube.position.copy(this.cubeBody.position);
        this.cube.quaternion.copy(this.cubeBody.quaternion);
      } else {
        this.cube.position.copy(this.cubeBody.position);
        this.cube.quaternion.copy(this.cubeBody.quaternion);
      }
    }

    onClick(event) {
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const closestIntersect = intersects[0];
        if (closestIntersect.object === this.cube) {
          if (this.cubeInFrontOfCamera) {
            this.cubeBody.type = CANNON.Body.DYNAMIC;
            const cameraDirection = new THREE.Vector3();
            const forceVec = camera.getWorldDirection(cameraDirection).multiplyScalar(30);
            const forceDirection = new CANNON.Vec3(forceVec.x, forceVec.y, forceVec.z);
            this.cubeBody.applyImpulse(forceDirection, this.cubeBody.position);

            this.cubeInFrontOfCamera = false;
          } else {
            this.cubeBody.type = CANNON.Body.KINEMATIC;
            this.cubeInFrontOfCamera = true;
          }
        }
      }
    }
  }

  // Create the ground plane
  const plane1 = new Plane(scene, world);

// Create the hackathon cards and add them to the scene **DOES NOT WORK: DOM exception insecure sth**
  const cubes = hackathonCards.map((card, index) => {
    const scalar = 0.7;
    return new Card(
      scene,
      world,
      index,
      card[0],
      card[1],
      card[2],
      { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 },
      { x: scalar * 16, y: scalar * 9, z: scalar * 1 }
    );
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    world.step(1 / 60); // Step the physics world

    cubes.forEach(cube => cube.update());

    controls.update(); // Update camera controls
    renderer.render(scene, camera); // Render the scene
  }

  // Handle window resize events
  function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  animate(); // Start the animation loop
}

main(); // Initialize the application
