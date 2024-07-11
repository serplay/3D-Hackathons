import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as CANNON from 'cannon';
import { RoundedBoxGeometry } from 'three/examples/jsm/Addons.js';

// Scene
const scene = new THREE.Scene();

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // m/s²

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 10, 30);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#app'),
  antialias: true,
});

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .6;
renderer.outputEncoding = THREE.sRGBEncoding;
window.addEventListener('resize', onWindowResize);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// Skybox
new RGBELoader()
  .load("/env.hdr", function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });

// Lighting
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

// Cam Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = 1.5512625986551463;
controls.target.set(0, 0, 0);
controls.maxDistance = 50;
controls.cursor = new THREE.Vector3(0,0,0);
controls.maxTargetRadius = 50;
controls.enablePan = true;
controls.maxZoom = 1;

// Plane class
class Plane {
  constructor(scene, world, color = 0xffff00) {
    // CANNON.js plane
    const planeShape = new CANNON.Plane();
    this.planeBody = new CANNON.Body({ mass: 0 });
    this.planeBody.addShape(planeShape);
    this.planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(this.planeBody);

    // THREE.js plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.plane.receiveShadow = true;
    this.plane.rotation.x = Math.PI / 2;
    scene.add(this.plane);
  }
}

// Cube class
class Cube {
  constructor(
    scene,
    world,
    id, 
    color = 0x00ff00, 
    position = { x: 0, y: 0.5, z: 0 }, 
    dimensions = { x: 1, y: 1, z: 1 }
  ) {
    // CANNON.js cube
    const cubeShape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2));
    this.cubeBody = new CANNON.Body({ mass: 1 });
    this.cubeBody.addShape(cubeShape);
    this.cubeBody.position.set(position.x, position.y, position.z);
    world.addBody(this.cubeBody);

    // THREE.js cube
    const geometry = new RoundedBoxGeometry( dimensions.x, dimensions.y, dimensions.z, 10, 3.14/18 );
    const material = new THREE.MeshStandardMaterial({ color });
    this.cube = new THREE.Mesh(geometry, material);
    this.cube.castShadow = true;
    scene.add(this.cube);

    // State flag for cube
    this.cubeInFrontOfCamera = false;

    // Register mouse click event
    window.addEventListener('click', (event) => this.onClick(event), false);
  }

  update() {
    if (this.cubeInFrontOfCamera) {
      // Move cube in front of camera
      const v1 = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      const cameraOffset = camera.position.clone().add(v1.multiplyScalar(-10));
      this.cubeBody.quaternion.copy(camera.quaternion);
      this.cubeBody.position.copy(cameraOffset);
      this.cubeBody.velocity.set(0, 0, 0); // Prevent it from falling
      this.cubeBody.angularVelocity.set(0, 0, 0); // Prevent it from rotating
      this.cube.position.copy(this.cubeBody.position);
      this.cube.quaternion.copy(this.cubeBody.quaternion);
    } else {
      this.cube.position.copy(this.cubeBody.position);
      this.cube.quaternion.copy(this.cubeBody.quaternion);
    }
  }

  onClick(event) {
    // Update the mouse vector with the current mouse position
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    // Use the raycaster to check if the cube was clicked
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      // Sort the intersects array by distance from the camera
      intersects.sort((a, b) => a.distance - b.distance);
      const closestIntersect = intersects[0];

      if (closestIntersect.object === this.cube) {
        // Toggle the cube's state
        if (this.cubeInFrontOfCamera) {
          // The cube is in front of the camera, throw it towards the center of the plane
          this.cubeBody.type = CANNON.Body.DYNAMIC;
          const cameraDirection = new THREE.Vector3();
          const forceVec = camera.getWorldDirection(cameraDirection).multiplyScalar(30);
          const forceDirection = new CANNON.Vec3(forceVec.x, forceVec.y, forceVec.z);
          this.cubeBody.applyImpulse(forceDirection, this.cubeBody.position);

          this.cubeInFrontOfCamera = false;
        } else {
          // The cube is not in front of the camera, move it closer
          this.cubeBody.type = CANNON.Body.KINEMATIC;
          this.cubeInFrontOfCamera = true;
        }
      }
    }
  }
}

// Create instances of Plane and Cube
const plane1 = new Plane(scene, world);
const cubes = [];
for (let i = 0; i < 10; i++) {
  cubes.push(new Cube(scene, world,i, Math.round(0xffffff*Math.random()), { x: Math.random()*10, y: Math.random()*10, z: Math.random()*10 },{ x: Math.random()*10, y: Math.random()*10, z: Math.random()*10 }));
}

// Animation
function animate() {
  requestAnimationFrame(animate);

  world.step(1 / 60);

  cubes.forEach(cube => cube.update());

  controls.update();
  renderer.render(scene, camera);
}

// Resize
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

// Helper
const dirX = new THREE.Vector3( 1, 0, 0 );
const dirY = new THREE.Vector3( 0, 1, 0 );
const dirZ = new THREE.Vector3( 0, 0, 1 );

dirX.normalize();
dirY.normalize();
dirZ.normalize();

const origin = new THREE.Vector3( 0, 5, 0 );
const length = 20;
const hexX = 0xff0000;
const hexY = 0x00ff00;
const hexZ = 0x0000ff;

const arrowX = new THREE.ArrowHelper( dirX, origin, length, hexX );
const arrowY = new THREE.ArrowHelper( dirY, origin, length, hexY );
const arrowZ = new THREE.ArrowHelper( dirZ, origin, length, hexZ );
scene.add(arrowX);
scene.add(arrowY);
scene.add(arrowZ);

animate();
