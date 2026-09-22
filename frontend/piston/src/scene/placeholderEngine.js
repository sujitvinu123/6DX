import * as THREE from 'three';

/**
 * Creates a stylized high-tech Aero-Piston Engine Assembly 3D Placeholder Object
 * for the AERO-TWIN MALE UAV Digital Twin Foundation.
 * 
 * @param {THREE.Scene} scene - The scene to add the engine object and tech grid to.
 * @return {Object} An object containing the engine model group and update function.
 */
export function createPlaceholderEngine(scene) {
  const engineGroup = new THREE.Group();

  // Materials with premium aerospace metallic and holographic finish
  const crankcaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
    wireframe: false
  });

  const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.2
  });

  const finMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.95,
    roughness: 0.15
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.98,
    roughness: 0.05
  });

  const glowCyanMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });

  const pulseRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });

  // 1. ENGINE CRANKCASE (Base Block)
  const crankcaseGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.6, 32);
  const crankcase = new THREE.Mesh(crankcaseGeo, crankcaseMaterial);
  crankcase.rotation.z = Math.PI / 2;
  crankcase.castShadow = true;
  crankcase.receiveShadow = true;
  engineGroup.add(crankcase);

  // Crankcase Front Plate with Hex Bolts
  const frontPlateGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.15, 32);
  const frontPlate = new THREE.Mesh(frontPlateGeo, chromeMaterial);
  frontPlate.rotation.z = Math.PI / 2;
  frontPlate.position.x = 0.85;
  frontPlate.castShadow = true;
  engineGroup.add(frontPlate);

  // 2. VERTICAL PISTON CYLINDER BARREL
  const cylinderGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.2, 32);
  const cylinder = new THREE.Mesh(cylinderGeo, cylinderMaterial);
  cylinder.position.y = 1.3;
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  engineGroup.add(cylinder);

  // Cooling Fins around Cylinder Barrel
  const finCount = 8;
  for (let i = 0; i < finCount; i++) {
    const finGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.06, 32);
    const fin = new THREE.Mesh(finGeo, finMaterial);
    fin.position.y = 0.5 + i * 0.22;
    fin.castShadow = true;
    engineGroup.add(fin);
  }

  // 3. CYLINDER HEAD & SPARK PLUG ACCENTS
  const headGeo = new THREE.CylinderGeometry(0.8, 0.75, 0.5, 32);
  const cylinderHead = new THREE.Mesh(headGeo, chromeMaterial);
  cylinderHead.position.y = 2.5;
  cylinderHead.castShadow = true;
  engineGroup.add(cylinderHead);

  // Spark Plug Tip (Cyan Glowing Accent)
  const plugGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16);
  const plug = new THREE.Mesh(plugGeo, glowCyanMaterial);
  plug.position.set(0, 2.85, 0);
  engineGroup.add(plug);

  // 4. OPPOSING DUAL EXHAUST MANIFOLD TUBES
  const tubeCurveLeft = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.6, 0.7),
    new THREE.Vector3(0.5, 1.4, 1.2),
    new THREE.Vector3(1.0, 0.6, 1.5)
  ]);
  const tubeGeoLeft = new THREE.TubeGeometry(tubeCurveLeft, 20, 0.15, 16, false);
  const exhaustPipeLeft = new THREE.Mesh(tubeGeoLeft, chromeMaterial);
  exhaustPipeLeft.castShadow = true;
  engineGroup.add(exhaustPipeLeft);

  const tubeCurveRight = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.6, -0.7),
    new THREE.Vector3(-0.5, 1.4, -1.2),
    new THREE.Vector3(-1.0, 0.6, -1.5)
  ]);
  const tubeGeoRight = new THREE.TubeGeometry(tubeCurveRight, 20, 0.15, 16, false);
  const exhaustPipeRight = new THREE.Mesh(tubeGeoRight, chromeMaterial);
  exhaustPipeRight.castShadow = true;
  engineGroup.add(exhaustPipeRight);

  // 5. PROPELLER SHAFT & HUB (Aero Engine Signature)
  const propShaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 16);
  const propShaft = new THREE.Mesh(propShaftGeo, chromeMaterial);
  propShaft.rotation.z = Math.PI / 2;
  propShaft.position.x = 1.25;
  engineGroup.add(propShaft);

  // 6. DIGITAL TWIN HOLOGRAPHIC SCANNER RING (Sensory Overlay)
  const holoRingGeo = new THREE.RingGeometry(1.6, 1.65, 64);
  const holoRing = new THREE.Mesh(holoRingGeo, pulseRingMaterial);
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.y = 1.3;
  engineGroup.add(holoRing);

  // Bounding Telemetry Cage (Wireframe Hologram)
  const cageGeo = new THREE.BoxGeometry(3.2, 3.8, 3.2);
  const cageWireframe = new THREE.Mesh(cageGeo, glowCyanMaterial);
  cageWireframe.position.y = 1.0;
  engineGroup.add(cageWireframe);

  // Add the engine assembly to the scene
  scene.add(engineGroup);

  // 7. GROUND GRID STAND (Aerospace Test Bench)
  const gridHelper = new THREE.GridHelper(20, 40, 0x00f0ff, 0x1e293b);
  gridHelper.position.y = -1.2;
  scene.add(gridHelper);

  // Ground plane to receive shadows
  const planeGeo = new THREE.PlaneGeometry(30, 30);
  const planeMat = new THREE.ShadowMaterial({ opacity: 0.4 });
  const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.21;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // Animation update loop handler for the placeholder model
  const animateEngine = (time) => {
    // Gentle idle floating animation
    engineGroup.position.y = Math.sin(time * 0.0015) * 0.08;
    
    // Slow rotational demonstration
    engineGroup.rotation.y = time * 0.0004;

    // Scan ring pulse vertical movement
    holoRing.position.y = 0.3 + Math.sin(time * 0.003) * 1.0 + 1.0;
    holoRing.rotation.z = time * 0.001;
  };

  return { engineGroup, animateEngine };
}
