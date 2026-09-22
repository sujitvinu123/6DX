import * as THREE from 'three';

/**
 * Creates the Front Aero Propeller and Aerodynamic Metallic Spinner Assembly
 * matching the high-performance aero-piston reference engine.
 * 
 * Features:
 * - Parabolic aerodynamic spinner nose cone in polished mirror chrome
 * - 3-blade variable-pitch propeller with airfoil camber, spanwise pitch twist, and tip warning stripes
 * - CNC hub clamp collar with perimeter retention bolts
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} Propeller Assembly Group
 */
export function createPropellerAssembly(materials) {
  const propGroup = new THREE.Group();
  propGroup.name = 'PropellerAssembly';

  // 1. AERODYNAMIC BULLET SPINNER NOSE CONE (Polished Chrome / Mirror Aluminum)
  const spinnerPoints = [];
  const numSpinnerPoints = 24;
  const spinnerLength = 1.45;
  const spinnerBaseRadius = 0.72;

  for (let i = 0; i <= numSpinnerPoints; i++) {
    const t = i / numSpinnerPoints; // 0 (tip) to 1 (base)
    // Parabolic profile: r(z) = R * (t^0.62)
    const r = spinnerBaseRadius * Math.pow(t, 0.62);
    const z = spinnerLength * (1 - t); // z from tip to base
    spinnerPoints.push(new THREE.Vector2(r, z));
  }

  const spinnerGeo = new THREE.LatheGeometry(spinnerPoints, 48);
  spinnerGeo.rotateX(Math.PI / 2); // Point forward along +Z
  const spinnerMesh = new THREE.Mesh(spinnerGeo, materials.spinner);
  spinnerMesh.name = 'PropellerSpinner';
  spinnerMesh.position.z = 2.85;
  spinnerMesh.castShadow = true;
  spinnerMesh.receiveShadow = true;
  propGroup.add(spinnerMesh);

  // Spinner Backplate Flange Ring
  const backplateGeo = new THREE.CylinderGeometry(spinnerBaseRadius + 0.02, spinnerBaseRadius + 0.02, 0.10, 48);
  backplateGeo.rotateX(Math.PI / 2);
  const backplateMesh = new THREE.Mesh(backplateGeo, materials.outputShaft);
  backplateMesh.name = 'SpinnerBackplate';
  backplateMesh.position.z = 2.80;
  backplateMesh.castShadow = true;
  propGroup.add(backplateMesh);

  // 2. CENTRAL PROPELLER HUB & BEARING CARRIER
  const hubGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.32, 36);
  hubGeo.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, materials.outputShaft);
  hubMesh.name = 'PropellerHub';
  hubMesh.position.z = 2.95;
  hubMesh.castShadow = true;
  propGroup.add(hubMesh);

  // Hub Retention Bolts (6 perimeter bolts)
  for (let hb = 0; hb < 6; hb++) {
    const angle = (hb / 6) * Math.PI * 2;
    const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12);
    boltGeo.rotateX(Math.PI / 2);
    const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
    boltMesh.position.set(Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 3.12);
    propGroup.add(boltMesh);
  }

  // 3. THREE-BLADE CURVED AIRFOIL PROPELLER
  const numBlades = 3;
  const bladeLength = 2.40;

  for (let b = 0; b < numBlades; b++) {
    const bladeAngle = (b / numBlades) * Math.PI * 2;
    const bladeHolder = new THREE.Group();
    bladeHolder.name = `PropellerBladeGroup_${b + 1}`;
    bladeHolder.position.z = 2.95;
    bladeHolder.rotation.z = bladeAngle;

    // Blade Root Hub Ferrule / Retention Clamp Collar
    const ferruleGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.40, 20);
    const ferruleMesh = new THREE.Mesh(ferruleGeo, materials.steelBolts);
    ferruleMesh.position.y = 0.46;
    ferruleMesh.castShadow = true;
    bladeHolder.add(ferruleMesh);

    // Blade Retention Ring Flange
    const ferruleRingGeo = new THREE.TorusGeometry(0.19, 0.025, 8, 20);
    const ferruleRing = new THREE.Mesh(ferruleRingGeo, materials.outputShaft);
    ferruleRing.position.y = 0.58;
    bladeHolder.add(ferruleRing);

    // Aerodynamic Airfoil Blade with Realistic Spanwise Twist & Chord Taper
    const bladeGeo = new THREE.BoxGeometry(0.34, bladeLength, 0.065, 6, 24, 3);
    const pos = bladeGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); // spanwise (-bladeLength/2 to +bladeLength/2)
      const normY = (y + bladeLength / 2) / bladeLength; // 0 (root) to 1 (tip)

      // Width chord taper: wide root, slender tapered tip
      const scaleX = 1.05 - normY * 0.48;
      pos.setX(i, pos.getX(i) * scaleX);

      // Thickness taper: thick structural root, thin aerodynamic tip
      const scaleZ = 1.20 - normY * 0.65;
      pos.setZ(i, pos.getZ(i) * scaleZ);

      // Aerodynamic pitch angle twist (washout: high pitch angle at root, flatter at tip)
      const twistAngle = (1.0 - normY) * 0.42 + 0.18;
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const rotatedX = x * Math.cos(twistAngle) - z * Math.sin(twistAngle);
      const rotatedZ = x * Math.sin(twistAngle) + z * Math.cos(twistAngle);
      pos.setX(i, rotatedX);
      pos.setZ(i, rotatedZ);
    }
    bladeGeo.computeVertexNormals();

    const bladeMesh = new THREE.Mesh(bladeGeo, materials.propellerBlade);
    bladeMesh.name = `PropellerBlade_${b + 1}`;
    bladeMesh.position.y = 0.60 + bladeLength / 2;
    bladeMesh.castShadow = true;
    bladeMesh.receiveShadow = true;
    bladeHolder.add(bladeMesh);

    // Aviation High-Visibility Tip Warning Band (Safety Striping)
    const tipGeo = new THREE.BoxGeometry(0.22, 0.32, 0.07);
    const tipMesh = new THREE.Mesh(tipGeo, materials.propellerTip);
    tipMesh.name = `PropellerTip_${b + 1}`;
    tipMesh.position.y = 0.60 + bladeLength - 0.17;
    tipMesh.rotation.x = 0.20;
    tipMesh.castShadow = true;
    bladeHolder.add(tipMesh);

    propGroup.add(bladeHolder);
  }

  return propGroup;
}
