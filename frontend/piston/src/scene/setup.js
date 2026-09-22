import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Initializes the main Three.js Scene, Camera, Renderer, and OrbitControls.
 * Configured for light technical engineering workspace.
 * 
 * @param {HTMLCanvasElement} canvas - The HTML5 canvas element.
 * @return {Object} Three.js core components: { scene, camera, renderer, controls }
 */
export function initScene(canvas) {
  // 1. SCENE SETUP
  const scene = new THREE.Scene();

  // Clean Light Technical Background & Fog
  const lightBackgroundColor = new THREE.Color(0xf1f5f9);
  scene.background = lightBackgroundColor;
  scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

  // 2. PERSPECTIVE CAMERA SETUP
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(4.8, 2.4, 4.2);

  // 3. WEBGL RENDERER SETUP
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. ORBIT CONTROLS SETUP
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2.0;
  controls.maxDistance = 22.0;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.target.set(0, -0.2, 0);
  controls.update();

  // 5. RESPONSIVE RESIZE HANDLER
  const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener('resize', onWindowResize);

  return { scene, camera, renderer, controls };
}
