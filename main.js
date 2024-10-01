import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Vertex Shader for Spaceship
const vertexShader = `
    varying vec3 vUv; 

    void main() {
        vUv = position; 

        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
    }
`;

// Fragment Shader for Spaceship with dynamic color
const fragmentShader = `
    uniform float time; 
    uniform vec3 color; 
    varying vec3 vUv; 

    void main() {
        gl_FragColor = vec4(
            color.r * abs(sin(time + vUv.x)),
            color.g * abs(sin(time + vUv.y)),
            color.b * abs(sin(time + vUv.z)),
            1.0
        );
    }
`;

// Create a scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Set a default black background color

// Create a camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  10000
);
camera.position.z = 10;

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7).normalize();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Create Shader Material for Spaceship
const spaceshipShaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    time: { value: 1.0 },
    color: { value: new THREE.Color(0xc0c0c0) }, // Default to silver color
  },
});

// Create asteroids with original texture
const textureLoader = new THREE.TextureLoader();
const asteroidTexture = textureLoader.load("textures/asteroid.png");

const asteroidMaterial = new THREE.MeshPhongMaterial({
  map: asteroidTexture,
  shininess: 10,
});

const asteroidGeometry = new THREE.SphereGeometry(1, 32, 32);
const asteroids = [];
for (let i = 0; i < 50; i++) {
  const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
  asteroid.position.set(
    Math.random() * 50 - 25,
    Math.random() * 50 - 25,
    Math.random() * 50 - 25
  );
  asteroids.push(asteroid);
  scene.add(asteroid);
}

// Add the particle system (stars) to the scene
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 15000;
const vertices = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
  vertices[i] = (Math.random() - 0.5) * 100;
}

particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(vertices, 3)
);

const particleTexture = textureLoader.load("textures/star.png");

const particlesMaterial = new THREE.PointsMaterial({
  map: particleTexture,
  size: 0.5,
  sizeAttenuation: true, // Ensures particles shrink with distance
  transparent: true,
  depthWrite: false, // Ensures proper blending
  blending: THREE.AdditiveBlending, // Smooth blending effect
});

const stars = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(stars);

// Load spaceship model and apply shader material
const loader = new GLTFLoader();
let spaceship;

loader.load(
  "models/spaceship.gltf",
  function (gltf) {
    spaceship = gltf.scene;
    spaceship.scale.set(2, 2, 2);
    spaceship.position.set(0, 0, 0);
    scene.add(spaceship);

    spaceship.traverse(function (child) {
      if (child.isMesh) {
        child.material = spaceshipShaderMaterial.clone();
        child.material.needsUpdate = true;
      }
    });

    console.log("Spaceship loaded and added to the scene");
  },
  undefined,
  function (error) {
    console.error("Error loading spaceship:", error);
  }
);

// Animation loop
let asteroidSpeed = 0.1;
function animate() {
  requestAnimationFrame(animate);

  // Update shader time uniform
  spaceshipShaderMaterial.uniforms.time.value += 0.05;

  // Rotate and move asteroids
  asteroids.forEach((asteroid) => {
    asteroid.rotation.x += 0.01;
    asteroid.rotation.y += 0.01;
    asteroid.position.z += asteroidSpeed;
    if (asteroid.position.z > 10) {
      asteroid.position.z = -50;
    }
  });

  // Rotate stars (particle system)
  stars.rotation.y += -0.0001;

  if (spaceship) {
    camera.position.x = spaceship.position.x;
    camera.position.y = spaceship.position.y;
    camera.position.z = spaceship.position.z + 10;
    camera.lookAt(spaceship.position);
  }

  renderer.render(scene, camera);
}
animate();

// Keyboard controls
document.addEventListener("keydown", function (event) {
  if (spaceship) {
    switch (event.key) {
      case "ArrowUp":
        spaceship.position.y += 0.5;
        break;
      case "ArrowDown":
        spaceship.position.y -= 0.5;
        break;
      case "ArrowLeft":
        spaceship.position.x -= 0.5;
        break;
      case "ArrowRight":
        spaceship.position.x += 0.5;
        break;
    }
  }
});

// Mouse interaction to change spaceship color and adjust asteroid speed
const colors = [
  new THREE.Color(0xc0c0c0),
  new THREE.Color(0xb0b0b0),
  new THREE.Color(0xffffff),
]; // Silver, Ash, Green
let currentColorIndex = 0;

document.addEventListener("click", function () {
  currentColorIndex = (currentColorIndex + 1) % colors.length;
  if (spaceship) {
    spaceship.traverse(function (child) {
      if (child.isMesh && child.material.isShaderMaterial) {
        child.material.uniforms.color.value.copy(colors[currentColorIndex]);
        child.material.uniformsNeedUpdate = true; // Ensures the shader recompiles
      }
    });
    console.log(
      "Spaceship color changed to: ",
      colors[currentColorIndex].getStyle()
    );
  }
});

// Handle window resize
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Optimize renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
