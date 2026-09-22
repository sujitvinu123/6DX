import * as THREE from 'three';

/**
 * Creates the Turbocharger System & Charge Air Plumbing.
 * 
 * Replicating modern turbocharged aero-piston engines (e.g. Rotax 914/915/916):
 * - Centrifugal compressor housing (volute scroll)
 * - Exhaust turbine housing
 * - Wastegate canister actuator & linkage arm
 * - Charge air boost tubes with silicone couplers & stainless T-bolt clamps
 * - High-pressure oil feed lines
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} Turbocharger System Group
 */
export function createTurbochargerSystem(materials) {
  const turboGroup = new THREE.Group();
  turboGroup.name = 'TurbochargerSystem';

  // Base position: mounted top-rear above crankcase, behind intake plenum
  const turboBasePos = new THREE.Vector3(0, 0.95, -1.35);

  // 1. COMPRESSOR HOUSING (Aluminum Volute Scroll)
  const compHousingGeo = new THREE.TorusGeometry(0.32, 0.16, 16, 32);
  const compHousing = new THREE.Mesh(compHousingGeo, materials.turboCompressor);
  compHousing.name = 'Turbo_CompressorHousing';
  compHousing.position.set(0.18, turboBasePos.y, turboBasePos.z);
  compHousing.rotation.y = Math.PI / 2;
  compHousing.castShadow = true;
  turboGroup.add(compHousing);

  // Compressor Inlet Bellmouth Flange
  const inletGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.25, 24);
  inletGeo.rotateZ(Math.PI / 2);
  const inletMesh = new THREE.Mesh(inletGeo, materials.turboCompressor);
  inletMesh.position.set(0.36, turboBasePos.y, turboBasePos.z);
  inletMesh.castShadow = true;
  turboGroup.add(inletMesh);

  // 2. TURBINE HOUSING (High-Temp Cast Steel Scroll)
  const turbineHousingGeo = new THREE.TorusGeometry(0.30, 0.15, 16, 32);
  const turbineHousing = new THREE.Mesh(turbineHousingGeo, materials.turboTurbine);
  turbineHousing.name = 'Turbo_TurbineHousing';
  turbineHousing.position.set(-0.18, turboBasePos.y, turboBasePos.z);
  turbineHousing.rotation.y = Math.PI / 2;
  turbineHousing.castShadow = true;
  turboGroup.add(turbineHousing);

  // Turbine Exhaust Downpipe Outlet Flange
  const downpipeOutletGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.22, 24);
  downpipeOutletGeo.rotateZ(Math.PI / 2);
  const downpipeOutlet = new THREE.Mesh(downpipeOutletGeo, materials.exhaust);
  downpipeOutlet.position.set(-0.35, turboBasePos.y, turboBasePos.z);
  downpipeOutlet.castShadow = true;
  turboGroup.add(downpipeOutlet);

  // 3. CENTER ROTATING HOUSING & BEARING SECTION (CHRA)
  const chraGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.26, 20);
  chraGeo.rotateZ(Math.PI / 2);
  const chraMesh = new THREE.Mesh(chraGeo, materials.steelBolts);
  chraMesh.name = 'Turbo_CHRA';
  chraMesh.position.set(0, turboBasePos.y, turboBasePos.z);
  chraMesh.castShadow = true;
  turboGroup.add(chraMesh);

  // 4. WASTEGATE PNEUMATIC ACTUATOR CANISTER
  const actuatorGroup = new THREE.Group();
  actuatorGroup.name = 'Turbo_WastegateActuator';

  const actuatorCanisterGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16);
  actuatorCanisterGeo.rotateX(Math.PI / 2);
  const actuatorCanister = new THREE.Mesh(actuatorCanisterGeo, materials.steelBolts);
  actuatorCanister.castShadow = true;
  actuatorGroup.add(actuatorCanister);

  // Actuator Control Rod Linkage
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8);
  rodGeo.rotateX(Math.PI / 2);
  const rodMesh = new THREE.Mesh(rodGeo, materials.outputShaft);
  rodMesh.position.set(0, -0.06, 0.25);
  actuatorGroup.add(rodMesh);

  actuatorGroup.position.set(-0.32, turboBasePos.y + 0.35, turboBasePos.z + 0.1);
  turboGroup.add(actuatorGroup);

  // 5. CHARGE AIR BOOST PIPE (Compressor Outlet to Intake Plenum)
  const boostPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, turboBasePos.y + 0.28, turboBasePos.z),
    new THREE.Vector3(0.22, 1.35, -0.9),
    new THREE.Vector3(0.12, 1.35, -0.4),
    new THREE.Vector3(0, 1.25, -0.1)
  ]);
  const boostPipeGeo = new THREE.TubeGeometry(boostPipeCurve, 24, 0.085, 16, false);
  const boostPipeMesh = new THREE.Mesh(boostPipeGeo, materials.turboCompressor);
  boostPipeMesh.name = 'Turbo_BoostPipe';
  boostPipeMesh.castShadow = true;
  turboGroup.add(boostPipeMesh);

  // Blue Silicone Coupler & T-Bolt Clamps
  const couplerGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.16, 16);
  couplerGeo.rotateX(Math.PI / 2);
  const couplerMesh = new THREE.Mesh(couplerGeo, materials.anodizedBlue);
  couplerMesh.position.set(0.06, 1.30, -0.25);
  couplerMesh.castShadow = true;
  turboGroup.add(couplerMesh);

  // 6. STAINLESS BRAIDED TURBO OIL FEED LINE WITH AN-FITTINGS
  const oilFeedCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, turboBasePos.y + 0.15, turboBasePos.z),
    new THREE.Vector3(-0.15, 0.85, -1.0),
    new THREE.Vector3(-0.25, 0.45, -0.5),
    new THREE.Vector3(-0.15, 0.2, 0.0)
  ]);
  const oilFeedGeo = new THREE.TubeGeometry(oilFeedCurve, 20, 0.025, 8, false);
  const oilFeedMesh = new THREE.Mesh(oilFeedGeo, materials.braidedLine);
  turboGroup.add(oilFeedMesh);

  // AN-4 Blue/Red Fittings
  const anFitting1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), materials.anodizedBlue);
  anFitting1.position.set(0, turboBasePos.y + 0.16, turboBasePos.z);
  turboGroup.add(anFitting1);

  const anFitting2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), materials.anodizedRed);
  anFitting2.position.set(-0.15, 0.2, 0.0);
  turboGroup.add(anFitting2);

  return turboGroup;
}
