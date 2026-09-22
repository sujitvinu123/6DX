import * as THREE from 'three';

/**
 * Creates the High-Performance Aero Engine Lubrication & Cooling Oil System.
 * 
 * Replicating aviation horizontally-opposed piston engine lubrication loops:
 * - Spin-on oil filter canister mounted on crankcase filter boss
 * - Oil cooler heat exchanger matrix with cooling fins and end tanks
 * - High-pressure braided stainless steel lines with anodized blue/red AN-8 fittings
 * - Oil filler neck and aluminum cap
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} Oil System Group
 */
export function createOilSystem(materials) {
  const oilGroup = new THREE.Group();
  oilGroup.name = 'OilSystem';

  // 1. SPIN-ON OIL FILTER CANISTER (Mounted on right lower crankcase)
  const filterGroup = new THREE.Group();
  filterGroup.name = 'OilFilterCanister';

  // Filter mounting adapter pad
  const adapterPadGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24);
  adapterPadGeo.rotateZ(Math.PI / 2);
  const adapterPad = new THREE.Mesh(adapterPadGeo, materials.crankcaseCover);
  adapterPad.castShadow = true;
  filterGroup.add(adapterPad);

  // Main cylindrical canister body
  const canisterGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.65, 32);
  canisterGeo.rotateZ(Math.PI / 2);
  const canisterMesh = new THREE.Mesh(canisterGeo, materials.oilFilter);
  canisterMesh.position.x = 0.35;
  canisterMesh.castShadow = true;
  canisterMesh.receiveShadow = true;
  filterGroup.add(canisterMesh);

  // Hex removal nut on canister dome
  const hexNutGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 6);
  hexNutGeo.rotateZ(Math.PI / 2);
  const hexNut = new THREE.Mesh(hexNutGeo, materials.steelBolts);
  hexNut.position.x = 0.70;
  filterGroup.add(hexNut);

  filterGroup.position.set(0.85, -0.45, 0.65);
  filterGroup.rotation.y = -Math.PI / 6;
  oilGroup.add(filterGroup);

  // 2. OIL COOLER HEAT EXCHANGER RADIATOR (Mounted lower front)
  const coolerGroup = new THREE.Group();
  coolerGroup.name = 'OilCoolerRadiator';

  // Cooler core matrix box
  const coreGeo = new THREE.BoxGeometry(1.6, 0.45, 0.35);
  const coreMesh = new THREE.Mesh(coreGeo, materials.oilCooler);
  coreMesh.castShadow = true;
  coolerGroup.add(coreMesh);

  // Radiator Cooling Core Fins
  for (let f = -7; f <= 7; f++) {
    const finGeo = new THREE.BoxGeometry(0.02, 0.42, 0.34);
    const finMesh = new THREE.Mesh(finGeo, materials.coolingFin);
    finMesh.position.x = f * 0.10;
    coolerGroup.add(finMesh);
  }

  // Left & Right Aluminum End Tanks
  [-0.85, 0.85].forEach((x, idx) => {
    const tankGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.48, 16);
    const tankMesh = new THREE.Mesh(tankGeo, materials.crankcaseCover);
    tankMesh.position.x = x;
    tankMesh.castShadow = true;
    coolerGroup.add(tankMesh);

    // AN-8 Hose Port Fitting (Blue/Red)
    const portMat = idx === 0 ? materials.anodizedBlue : materials.anodizedRed;
    const portGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16);
    portGeo.rotateX(Math.PI / 2);
    const portMesh = new THREE.Mesh(portGeo, portMat);
    portMesh.position.set(x, 0.12, 0.22);
    coolerGroup.add(portMesh);
  });

  coolerGroup.position.set(0, -1.05, 1.45);
  oilGroup.add(coolerGroup);

  // 3. BRAIDED STAINLESS STEEL OIL PLUMBING LINES WITH AN-8 FITTINGS
  // Line 1: From Oil Filter adapter to Oil Cooler Inlet
  const line1Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.9, -0.45, 0.55),
    new THREE.Vector3(1.1, -0.75, 0.95),
    new THREE.Vector3(0.95, -1.0, 1.35),
    new THREE.Vector3(0.85, -0.93, 1.67)
  ]);
  const line1Geo = new THREE.TubeGeometry(line1Curve, 24, 0.035, 10, false);
  const line1Mesh = new THREE.Mesh(line1Geo, materials.braidedLine);
  line1Mesh.castShadow = true;
  oilGroup.add(line1Mesh);

  // Line 2: From Oil Cooler Outlet to Crankcase Lower Gallery Return
  const line2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.85, -0.93, 1.67),
    new THREE.Vector3(-0.95, -1.0, 1.35),
    new THREE.Vector3(-0.8, -0.65, 0.8),
    new THREE.Vector3(-0.55, -0.4, 0.2)
  ]);
  const line2Geo = new THREE.TubeGeometry(line2Curve, 24, 0.035, 10, false);
  const line2Mesh = new THREE.Mesh(line2Geo, materials.braidedLine);
  line2Mesh.castShadow = true;
  oilGroup.add(line2Mesh);

  // 4. OIL FILLER NECK & BILLET ALUMINUM CAP
  const fillerNeckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.55, 16);
  const fillerNeck = new THREE.Mesh(fillerNeckGeo, materials.crankcaseCover);
  fillerNeck.position.set(0.65, 0.85, 0.45);
  fillerNeck.rotation.z = -Math.PI / 10;
  fillerNeck.castShadow = true;
  oilGroup.add(fillerNeck);

  const fillerCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20);
  const fillerCap = new THREE.Mesh(fillerCapGeo, materials.anodizedBlue);
  fillerCap.position.set(0.72, 1.12, 0.45);
  fillerCap.rotation.z = -Math.PI / 10;
  fillerCap.castShadow = true;
  oilGroup.add(fillerCap);

  return oilGroup;
}
