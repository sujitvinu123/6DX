import * as THREE from 'three';

/**
 * Creates an individual Horizontally-Opposed Cylinder Assembly with high-density
 * cooling fins, dual pushrod tubes, spark plugs/injectors, and internal piston.
 * 
 * @param {string} side - 'Left' or 'Right'
 * @param {number} index - 1 or 2
 * @param {Object} materials - PBR engine materials map
 * @return {Object} Object containing cylinderGroup and references to subcomponents.
 */
export function createCylinderAssembly(side, index, materials) {
  const isLeft = side === 'Left';
  const nameSuffix = `${side}_${index}`;
  const dirSign = isLeft ? -1 : 1;

  const cylinderGroup = new THREE.Group();
  cylinderGroup.name = `${side}Cylinder_${index}`;

  // 1. CYLINDER BARREL (Main Cast Steel Sleeve)
  const barrelLength = 1.35;
  const barrelRadius = 0.44;
  const barrelGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 32);
  barrelGeo.rotateZ(Math.PI / 2);
  
  const barrelMesh = new THREE.Mesh(barrelGeo, materials.cylinderBarrel);
  barrelMesh.name = `Barrel_${nameSuffix}`;
  barrelMesh.position.x = dirSign * (barrelLength / 2 + 0.45);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  cylinderGroup.add(barrelMesh);

  // 2. DENSE COOLING FIN PACK (16 precision-spaced rectangular/rounded fins)
  const finCount = 16;
  const finThickness = 0.032;
  const finWidth = 1.22;
  const finHeight = 1.18;
  const finSpacing = (barrelLength - 0.15) / finCount;
  const startX = dirSign * 0.52;

  for (let f = 0; f < finCount; f++) {
    // Rounded-rectangle fin profile matching reference photo
    const finGeo = new THREE.BoxGeometry(finThickness, finHeight, finWidth);
    const finMesh = new THREE.Mesh(finGeo, materials.coolingFin);
    finMesh.name = `Fin_${nameSuffix}_${f + 1}`;
    finMesh.position.x = startX + dirSign * (f * finSpacing);
    finMesh.castShadow = true;
    finMesh.receiveShadow = true;
    cylinderGroup.add(finMesh);
  }

  // 3. CYLINDER HEAD & ROCKER VALVE COVER
  const headGroup = new THREE.Group();
  headGroup.name = `${side}Head_${index}`;

  const headGeo = new THREE.BoxGeometry(0.55, 1.15, 1.15);
  const headMesh = new THREE.Mesh(headGeo, materials.cylinderHead);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Head Top Cooling Fins
  for (let hf = -4; hf <= 4; hf++) {
    const headFinGeo = new THREE.BoxGeometry(0.56, 0.028, 1.10);
    const headFinMesh = new THREE.Mesh(headFinGeo, materials.coolingFin);
    headFinMesh.position.y = 0.28 + hf * 0.075;
    headFinMesh.castShadow = true;
    headGroup.add(headFinMesh);
  }

  // Rocker Valve Cover (Billet Machined Aluminum with Center Rib)
  const coverGeo = new THREE.BoxGeometry(0.20, 0.95, 0.95);
  const coverMesh = new THREE.Mesh(coverGeo, materials.headCover);
  coverMesh.position.x = dirSign * 0.36;
  coverMesh.castShadow = true;
  headGroup.add(coverMesh);

  // Center Stiffener Rib on Valve Cover
  const coverRibGeo = new THREE.BoxGeometry(0.22, 0.12, 0.90);
  const coverRib = new THREE.Mesh(coverRibGeo, materials.crankcaseCover);
  coverRib.position.x = dirSign * 0.37;
  headGroup.add(coverRib);

  // 4 Corner Head Stud Fasteners
  const boltPositions = [
    [0.38, 0.40, 0.40],
    [0.38, 0.40, -0.40],
    [0.38, -0.40, 0.40],
    [0.38, -0.40, -0.40]
  ];
  boltPositions.forEach(([bx, by, bz], i) => {
    const boltGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.09, 12);
    boltGeo.rotateZ(Math.PI / 2);
    const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
    boltMesh.name = `HeadBolt_${nameSuffix}_${i + 1}`;
    boltMesh.position.set(dirSign * bx, by, bz);
    headGroup.add(boltMesh);
  });

  headGroup.position.x = dirSign * (barrelLength + 0.65);
  cylinderGroup.add(headGroup);

  // 4. DUAL PUSHROD TUBES (Connecting crankcase to cylinder head underside)
  [-0.22, 0.22].forEach((zOffset) => {
    const pushrodGeo = new THREE.CylinderGeometry(0.045, 0.045, barrelLength + 0.5, 16);
    pushrodGeo.rotateZ(Math.PI / 2);
    const pushrodMesh = new THREE.Mesh(pushrodGeo, materials.outputShaft);
    pushrodMesh.position.set(dirSign * (barrelLength / 2 + 0.45), -0.48, zOffset);
    pushrodMesh.castShadow = true;
    cylinderGroup.add(pushrodMesh);
  });

  // 5. INJECTOR & SPARK PLUG ASSEMBLY
  const injectorGroup = new THREE.Group();
  injectorGroup.name = `Injector_${nameSuffix}`;

  const plugBodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 16);
  const plugBody = new THREE.Mesh(plugBodyGeo, materials.steelBolts);
  injectorGroup.add(plugBody);

  const ceramicGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16);
  const ceramic = new THREE.Mesh(ceramicGeo, materials.sparkPlugCeramic);
  ceramic.position.y = 0.18;
  injectorGroup.add(ceramic);

  const glowTipGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const glowTip = new THREE.Mesh(glowTipGeo, materials.sparkPlugGlow);
  glowTip.position.y = 0.28;
  injectorGroup.add(glowTip);

  injectorGroup.position.set(dirSign * (barrelLength + 0.65), 0.48, 0.15);
  injectorGroup.rotation.z = -dirSign * (Math.PI / 6);
  cylinderGroup.add(injectorGroup);

  // 6. INTERNAL PISTON & CONNECTING ROD ASSEMBLY (Driven by Kinematics)
  const pistonGroup = new THREE.Group();
  pistonGroup.name = `Piston_${nameSuffix}`;

  const pistonCrownGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.45, 32);
  pistonCrownGeo.rotateZ(Math.PI / 2);
  const pistonCrown = new THREE.Mesh(pistonCrownGeo, materials.outputShaft);
  pistonCrown.castShadow = true;
  pistonGroup.add(pistonCrown);

  for (let r = -1; r <= 1; r++) {
    const ringGeo = new THREE.TorusGeometry(0.405, 0.012, 8, 32);
    ringGeo.rotateY(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, materials.steelBolts);
    ringMesh.position.x = r * 0.1;
    pistonGroup.add(ringMesh);
  }

  const conRodGeo = new THREE.BoxGeometry(0.9, 0.08, 0.12);
  const conRodMesh = new THREE.Mesh(conRodGeo, materials.cylinderBarrel);
  conRodMesh.position.x = -dirSign * 0.45;
  pistonGroup.add(conRodMesh);

  const wristPinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16);
  const wristPin = new THREE.Mesh(wristPinGeo, materials.steelBolts);
  wristPin.position.x = 0;
  pistonGroup.add(wristPin);

  const defaultPistonX = dirSign * (barrelLength / 2 + 0.45);
  pistonGroup.position.x = defaultPistonX;
  cylinderGroup.add(pistonGroup);

  return {
    cylinderGroup,
    headGroup,
    injectorGroup,
    pistonGroup,
    defaultPistonX,
    barrelLength,
    dirSign
  };
}
