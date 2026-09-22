import * as THREE from 'three';

/**
 * Studio Lighting Setup for Photorealistic Metallic Aero-Engine Visualization.
 * Produces crisp specular highlights, deep shadows, and luminous rim accents.
 * 
 * @param {THREE.Scene} scene 
 * @return {Object} Light references
 */
export function setupLighting(scene) {
  // 1. SOFT AMBIENT & HEMISPHERE SKY LIGHTING
  const ambientLight = new THREE.AmbientLight(0xd1d5db, 1.2);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 1.0);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // 2. PRIMARY DIRECTIONAL KEY LIGHT (Crisp metallic specular highlights & sharp shadows)
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
  keyLight.position.set(8, 14, 10);
  keyLight.castShadow = true;
  
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 35;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);

  // 3. COOL LATERAL FILL LIGHT (Soft illumination of side cylinder banks)
  const fillLight = new THREE.DirectionalLight(0xa0aec0, 2.0);
  fillLight.position.set(-10, 8, 6);
  scene.add(fillLight);

  // 4. FRONT SPECULAR ACCENT LIGHT (Gleaming reflections on spinner & propeller)
  const frontAccent = new THREE.DirectionalLight(0xffffff, 2.4);
  frontAccent.position.set(0, 4, 12);
  scene.add(frontAccent);

  // 5. REAR/TOP RIM LIGHT (Silhouetting cylinder cooling fins & manifold tubes)
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
  rimLight.position.set(-8, 10, -10);
  scene.add(rimLight);

  const rimLightRight = new THREE.DirectionalLight(0xe2e8f0, 1.8);
  rimLightRight.position.set(8, 6, -10);
  scene.add(rimLightRight);

  return { ambientLight, hemiLight, keyLight, fillLight, frontAccent, rimLight, rimLightRight };
}
