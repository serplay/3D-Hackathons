import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as CANNON from 'cannon';

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

// Cam Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = 1.5512625986551463;
controls.target.set(0, 0, 0);
controls.maxDistance = 50;
controls.cursor = new THREE.Vector3(0,0,0);
controls.maxTargetRadius = 50;
controls.enablePan = true;

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.position.y = 0.5;
scene.add(cube);

const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const cubeBody = new CANNON.Body({ mass: 1 });
cubeBody.addShape(cubeShape);
cubeBody.position.set(0, 0.5, 0);
world.addBody(cubeBody);

// Plane
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({ mass: 0 });
planeBody.addShape(planeShape);
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(planeBody);

const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true;
plane.rotation.x = Math.PI / 2;
scene.add(plane);

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

// State flag for cube
let cubeInFrontOfCamera = false;

// Animation
function animate() {
  requestAnimationFrame(animate);
  
  world.step(1 / 60);

  if (cubeInFrontOfCamera) {
    // Move cube in front of camera
    const v1 = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    const cameraOffset = camera.position.clone().add(v1.multiplyScalar(-2));
    cubeBody.quaternion.copy(camera.quaternion);
    cubeBody.position.copy(cameraOffset);
    cubeBody.velocity.set(0, 0, 0); // Prevent it from falling
    cubeBody.angularVelocity.set(0, 0, 0); // Prevent it from rotating
    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);
    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);
  } else {
    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);
  }

  controls.update();
  //console.log(camera.position, controls.getPolarAngle(), controls.getAzimuthalAngle());
  
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

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', onClick, false);

function onClick(event) {
  // Update the mouse vector with the current mouse position
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Use the raycaster to check if the cube was clicked
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object === cube) {
      // Toggle the cube's state
      if (cubeInFrontOfCamera) {
        // The cube is in front of the camera, throw it towards the center of the plane
        cubeBody.type = CANNON.Body.DYNAMIC;
        const cameraDirection = new THREE.Vector3();
        const forceVec = camera.getWorldDirection(cameraDirection).multiplyScalar(30);
        const forceDirection = new CANNON.Vec3(forceVec.x, forceVec.y, forceVec.z);
        cubeBody.applyImpulse(forceDirection, cubeBody.position);

        
        cubeInFrontOfCamera = false;
      } else {
        // The cube is not in front of the camera, move it closer
        cubeBody.type = CANNON.Body.KINEMATIC;
        cubeInFrontOfCamera = true;
      }
      break;
    }
  }
}

animate();
