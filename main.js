import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import * as CANNON from 'cannon';

//scene
const scene = new THREE.Scene();

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // m/s²

//camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0,10,30)

//renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#app'),
});

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .6;
renderer.outputEncoding = THREE.sRGBEncoding;
window.addEventListener('resize', onWindowResize);
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true;

//controls
const controls = new OrbitControls(camera, renderer.domElement);

//cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Use MeshStandardMaterial
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.position.y = 0.5;
scene.add(cube);

// Create a physics body for the cube
const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const cubeBody = new CANNON.Body({ mass: 1 });
cubeBody.addShape(cubeShape);
cubeBody.position.set(0, 0.5, 0);
world.addBody(cubeBody);


// Create a physics body for the plane

const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({ mass: 0 }); // mass 0 makes it static
planeBody.addShape(planeShape);
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(planeBody);

const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide }); // Use MeshStandardMaterial
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true; // Enable shadow receiving for the plane
plane.rotation.x = Math.PI / 2; // Rotate the plane to make it horizontal
scene.add(plane);

//skybox
new RGBELoader()
  .load("env.hdr", function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });

//lighting

const sunLight = new THREE.DirectionalLight(0xffe5b4, 1); // Slightly yellowish color

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

sunLight.shadow.mapSize.width = 4096; // default is 512
sunLight.shadow.mapSize.height = 4096;

//animation
function animate() {
  requestAnimationFrame(animate)
  
  world.step(1 / 60);
  cube.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);

  controls.update()
  renderer.render(scene, camera)
}

//resize
function onWindowResize() {

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );

};

animate()