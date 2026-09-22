/**
 * ProceduralEngineBuilder.js
 *
 * Builds a fully named, multi-component 3D representation of the UAV
 * Aero-Piston engine shown in the reference photograph.
 *
 * Orientation:
 *   +Z  → rear of engine (away from propeller)
 *   -Z  → propeller / front
 *   +X  → right side (alternator side in the image)
 *   +Y  → up
 *
 * Every major sub-assembly is its own named THREE.Group so that:
 *   • ExplodedViewManager can translate individual groups
 *   • EngineRaycaster / ComponentSelectionManager can identify them
 *   • XRayModeManager can highlight internal vs external parts
 *   • TelemetryMarkers / TelemetryOverlay can anchor to named objects
 *
 * Named components (matching image labels):
 *   Crankcase, Gearbox, OutputShaft, PropellerAssembly
 *   ForwardRHBearingFlange, ForwardLHBearingFlange
 *   TurbochargerSystem, WastegateController
 *   IntakeSystem, CoolantThermostat
 *   CommonRailValve, FuelTemperatureSensor, FuelPressureSensor
 *   FuelMeteringUnit, HighPressurePump
 *   CrankshaftSensor1, CrankshaftSensor2
 *   OilSystem (OilSump + GearboxOilDrainPlug)
 *   Alternator, VRibbedBelt
 *   EngineOilFillerCap, GearboxOilFillPlug
 *   GearboxOverpressureReliefValve, EngineOilFilterHousing
 *   PipingHoses
 */

import * as THREE from 'three';

// ─── Shared Material Library ──────────────────────────────────────────────────

function mat(color, metalness = 0.6, roughness = 0.45, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...opts });
}

const M = {
  crankcase:   mat(0x7a8290, 0.55, 0.55),   // warm-grey cast aluminium
  gearbox:     mat(0x6b7280, 0.60, 0.50),   // slightly darker dome
  machined:    mat(0x9ca3af, 0.75, 0.30),   // machined aluminium covers
  castIron:    mat(0x4b5563, 0.50, 0.65),   // raw cast iron
  steel:       mat(0xd1d5db, 0.85, 0.25),   // steel bolts/fittings
  turbo:       mat(0x374151, 0.65, 0.55),   // turbo housing
  turboHot:    mat(0x1f2937, 0.55, 0.65),   // turbine hot-side
  intake:      mat(0x7c3aed, 0.10, 0.60),   // purple/blue plastic plenum
  coolantHose: mat(0x2563eb, 0.05, 0.75),   // blue coolant hoses
  plug:        mat(0x374151, 0.80, 0.30),   // drain/fill plugs
  alternator:  mat(0xb45309, 0.70, 0.35),   // gold/brass alternator body
  oilSump:     mat(0xd97706, 0.65, 0.40),   // polished brass oil sump
  sensor:      mat(0x1f2937, 0.70, 0.40),   // black anodised sensors
  rubber:      mat(0x111827, 0.05, 0.90),   // rubber hoses
  belt:        mat(0x0f172a, 0.05, 0.85),   // V-ribbed belt
  shaft:       mat(0xe5e7eb, 0.90, 0.15),   // polished steel shaft
  valve:       mat(0xc0c0c0, 0.85, 0.20),   // relief valve
  fuelRail:    mat(0x9a3412, 0.65, 0.35),   // copper fuel line
  commonRail:  mat(0x374151, 0.65, 0.50),   // common rail housing
  blade:       mat(0x4a3728, 0.05, 0.75),   // wood/composite prop blade
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function mkMesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mkGroup(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

function addBolts(parent, radius, count, yOffset, boltMat) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const b = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), boltMat, `Bolt_${parent.name}_${i}`);
    b.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
    parent.add(b);
  }
}

// ─── Component builders ───────────────────────────────────────────────────────

function buildCrankcase() {
  const g = mkGroup('Crankcase');

  // Main dome — sphere truncated at bottom and front
  const dome = mkMesh(
    new THREE.SphereGeometry(1.15, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.65),
    M.crankcase, 'CrankcaseDome'
  );
  dome.rotation.x = -Math.PI / 2;
  g.add(dome);

  // Front face disc (mates with gearbox)
  const front = mkMesh(new THREE.CircleGeometry(0.78, 48), M.crankcase, 'CrankcaseFrontFace');
  front.rotation.y = Math.PI;
  front.position.z = -0.02;
  g.add(front);

  // Mating collar
  const collar = mkMesh(
    new THREE.CylinderGeometry(0.82, 0.78, 0.18, 48),
    M.machined, 'CrankcaseFrontCollar'
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -0.09;
  g.add(collar);

  // Top dome cap
  const cap = mkMesh(new THREE.SphereGeometry(0.18, 24, 16), M.machined, 'CrankcaseCap');
  cap.position.set(0, 1.08, 0.40);
  g.add(cap);

  // Embossed triangular logo (front face)
  const logo = mkMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 3), M.castIron, 'CrankcaseLogo');
  logo.rotation.x = Math.PI / 2;
  logo.position.set(0, -0.22, -1.12);
  g.add(logo);

  return g;
}

function buildGearbox() {
  const g = mkGroup('Gearbox');

  const housing = mkMesh(
    new THREE.CylinderGeometry(0.62, 0.70, 0.78, 48),
    M.gearbox, 'GearboxHousing'
  );
  housing.rotation.x = Math.PI / 2;
  housing.position.y = -0.02;
  g.add(housing);

  const frontFace = mkMesh(new THREE.CircleGeometry(0.62, 48), M.machined, 'GearboxFrontFace');
  frontFace.rotation.y = Math.PI;
  frontFace.position.z = -0.39;
  g.add(frontFace);

  const rearFlange = mkMesh(
    new THREE.CylinderGeometry(0.73, 0.70, 0.07, 48),
    M.machined, 'GearboxRearFlange'
  );
  rearFlange.rotation.x = Math.PI / 2;
  rearFlange.position.z = 0.39;
  g.add(rearFlange);

  addBolts(g, 0.68, 10, 0.04, M.steel);
  return g;
}

function buildOutputShaft() {
  const g = mkGroup('OutputShaft');

  const shaft = mkMesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.72, 24),
    M.shaft, 'PropellerShaft'
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.75;
  g.add(shaft);

  const hub = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.10, 24), M.machined, 'PropellerHub');
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.38;
  g.add(hub);

  const spigot = mkMesh(
    new THREE.CylinderGeometry(0.085, 0.105, 0.12, 24),
    M.shaft, 'PropellerSpigot'
  );
  spigot.rotation.x = Math.PI / 2;
  spigot.position.z = -1.10;
  g.add(spigot);

  // Right-hand bearing flange
  const rhFlange = mkGroup('ForwardRHBearingFlange');
  const rhMesh = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24), M.machined, 'RHFlangeMesh');
  rhMesh.rotation.x = Math.PI / 2;
  rhFlange.position.set(0.48, -0.22, -0.28);
  rhFlange.add(rhMesh);
  addBolts(rhFlange, 0.14, 4, 0.04, M.steel);
  g.add(rhFlange);

  // Left-hand bearing flange
  const lhFlange = mkGroup('ForwardLHBearingFlange');
  const lhMesh = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24), M.machined, 'LHFlangeMesh');
  lhMesh.rotation.x = Math.PI / 2;
  lhFlange.position.set(-0.48, -0.22, -0.28);
  lhFlange.add(lhMesh);
  addBolts(lhFlange, 0.14, 4, 0.04, M.steel);
  g.add(lhFlange);

  return g;
}

function buildTurbocharger() {
  const g = mkGroup('TurbochargerSystem');

  // Compressor housing (snail shape approximated with partial torus)
  const comp = mkMesh(
    new THREE.TorusGeometry(0.19, 0.085, 16, 32, Math.PI * 1.6),
    M.turbo, 'TurboCompressor'
  );
  comp.rotation.x = Math.PI / 2;
  g.add(comp);

  // Turbine housing (solid cylinder)
  const turbine = mkMesh(new THREE.CylinderGeometry(0.175, 0.175, 0.14, 28), M.turboHot, 'TurboTurbine');
  turbine.position.set(0, 0.02, 0);
  g.add(turbine);

  // Center cartridge
  const center = mkMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 16), M.machined, 'TurboCenterSection');
  g.add(center);

  // Compressor inlet pipe (large blue tube)
  const inlet = mkMesh(new THREE.CylinderGeometry(0.07, 0.065, 0.38, 16), M.coolantHose, 'TurboInletPipe');
  inlet.position.set(0, 0.28, 0);
  inlet.rotation.z = 0.12;
  g.add(inlet);

  // Outlet pipe
  const outlet = mkMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 14), M.turbo, 'TurboOutletPipe');
  outlet.position.set(0.18, 0, 0);
  outlet.rotation.z = Math.PI / 2;
  g.add(outlet);

  g.position.set(-0.88, 0.82, 0.55);
  g.rotation.y = 0.3;
  return g;
}

function buildWastegateController() {
  const g = mkGroup('WastegateController');
  const body = mkMesh(new THREE.BoxGeometry(0.10, 0.12, 0.08), M.sensor, 'WastegateSolenoidBody');
  const port = mkMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12), M.steel, 'WastegatePort');
  port.position.set(0, 0.10, 0);
  g.add(body);
  g.add(port);
  g.position.set(-0.62, 1.04, 0.70);
  return g;
}

function buildIntakeManifold() {
  const g = mkGroup('IntakeSystem');

  // Plenum body
  const plenum = mkMesh(new THREE.BoxGeometry(0.22, 0.32, 0.28), M.intake, 'IntakePlenum');
  plenum.position.set(0, 0.06, 0);
  g.add(plenum);

  // Throttle body
  const throttle = mkMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 16), M.machined, 'ThrottleBody');
  throttle.position.set(0, 0.30, 0);
  g.add(throttle);

  // Air inlet pipe
  const airPipe = mkMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.30, 14), M.intake, 'AirInletPipe');
  airPipe.rotation.z = 0.4;
  airPipe.position.set(-0.14, 0.36, 0);
  g.add(airPipe);

  // Two runners
  for (let i = 0; i < 2; i++) {
    const runner = mkMesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.30, 14),
      M.intake, `IntakeRunner_${i + 1}`
    );
    runner.position.set(i === 0 ? -0.07 : 0.07, -0.24, 0);
    runner.rotation.z = i === 0 ? -0.15 : 0.15;
    g.add(runner);
  }

  // Coolant thermostat housing
  const thermostat = mkGroup('CoolantThermostat');
  const tMesh = mkMesh(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 14), M.machined, 'ThermostatHousing');
  const tPipe = mkMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), M.coolantHose, 'ThermostatPipe');
  tPipe.position.set(0.12, 0, 0);
  tPipe.rotation.z = Math.PI / 2;
  thermostat.add(tMesh);
  thermostat.add(tPipe);
  thermostat.position.set(0.06, 0.42, 0);
  g.add(thermostat);

  g.position.set(-0.12, 0.30, 0.70);
  g.rotation.y = -0.15;
  return g;
}

function buildCommonRailValve() {
  const g = mkGroup('CommonRailValve');
  const rail = mkMesh(new THREE.BoxGeometry(0.38, 0.055, 0.055), M.commonRail, 'CommonRailBody');
  g.add(rail);
  const sensor = mkMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.065, 12), M.sensor, 'RailPressureSensor');
  sensor.position.set(0.12, 0.06, 0);
  g.add(sensor);
  const valveCap = mkMesh(new THREE.BoxGeometry(0.055, 0.07, 0.07), M.fuelRail, 'RailControlValveCap');
  valveCap.position.set(-0.22, 0, 0);
  g.add(valveCap);
  g.position.set(-0.52, 0.95, 0.45);
  g.rotation.y = 0.5;
  return g;
}

function buildFuelTemperatureSensor() {
  const g = mkGroup('FuelTemperatureSensor');
  const body = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.075, 10), M.sensor, 'FuelTempSensorBody');
  const conn = mkMesh(new THREE.BoxGeometry(0.030, 0.025, 0.025), M.sensor, 'FuelTempSensorConnector');
  conn.position.y = 0.055;
  g.add(body);
  g.add(conn);
  g.position.set(-1.02, 0.48, 0.38);
  return g;
}

function buildFuelPressureSensor() {
  const g = mkGroup('FuelPressureSensor');
  const body = mkMesh(new THREE.CylinderGeometry(0.020, 0.020, 0.080, 10), M.sensor, 'FuelPressSensorBody');
  const hex  = mkMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 6),  M.steel,  'FuelPressSensorHex');
  hex.position.y = -0.045;
  g.add(body);
  g.add(hex);
  g.position.set(-1.08, 0.18, 0.45);
  return g;
}

function buildFuelMeteringUnit() {
  const g = mkGroup('FuelMeteringUnit');
  const body = mkMesh(new THREE.BoxGeometry(0.12, 0.16, 0.10), M.sensor, 'FuelMeteringBody');
  g.add(body);
  for (let i = 0; i < 2; i++) {
    const stub = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), M.steel, `FuelMeteringPort_${i}`);
    stub.rotation.z = Math.PI / 2;
    stub.position.set(i === 0 ? -0.09 : 0.09, 0.04, 0);
    g.add(stub);
  }
  g.position.set(-1.04, -0.08, 0.50);
  return g;
}

function buildHighPressurePump() {
  const g = mkGroup('HighPressurePump');
  const body = mkMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 18), M.machined, 'HPPumpBody');
  g.add(body);
  const cap = mkMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 18), M.steel, 'HPPumpCap');
  cap.position.y = 0.12;
  g.add(cap);
  const flange = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 18), M.machined, 'HPPumpFlange');
  flange.position.y = -0.10;
  g.add(flange);
  g.position.set(-1.00, -0.38, 0.40);
  return g;
}

function buildCrankshaftSensor(index, position, rotX) {
  const g = mkGroup(`CrankshaftSensor${index}`);
  const body = mkMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.085, 12), M.sensor, `CrankSensor${index}Body`);
  const hex  = mkMesh(new THREE.CylinderGeometry(0.030, 0.030, 0.020, 6),  M.steel,  `CrankSensor${index}Hex`);
  hex.position.y = -0.048;
  const conn = mkMesh(new THREE.BoxGeometry(0.028, 0.028, 0.030), M.sensor, `CrankSensor${index}Connector`);
  conn.position.y = 0.065;
  g.add(body);
  g.add(hex);
  g.add(conn);
  g.position.copy(position);
  g.rotation.x = rotX;
  return g;
}

function buildOilSystem() {
  const g = mkGroup('OilSystem');

  // Sump body
  const sump = mkMesh(new THREE.BoxGeometry(0.55, 0.24, 0.42), M.oilSump, 'OilSump');
  sump.position.set(0, -0.12, 0);
  g.add(sump);

  // Drain plug
  const drainPlug = mkGroup('GearboxOilDrainPlug');
  const dp = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10), M.plug, 'DrainPlugMesh');
  dp.rotation.x = Math.PI / 2;
  drainPlug.add(dp);
  drainPlug.position.set(0, -0.24, -0.21);
  g.add(drainPlug);

  // Check port
  const check = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), M.plug, 'OilCheckPort');
  check.rotation.z = Math.PI / 2;
  check.position.set(-0.28, 0, 0.10);
  g.add(check);

  g.position.set(0, -1.02, -0.24);
  return g;
}

function buildAlternator() {
  const g = mkGroup('Alternator');

  const body = mkMesh(new THREE.CylinderGeometry(0.19, 0.17, 0.42, 24), M.alternator, 'AlternatorBody');
  g.add(body);

  const rear = mkMesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), M.machined, 'AlternatorRearCap');
  rear.position.y = -0.23;
  g.add(rear);

  const lug = mkMesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), M.alternator, 'AlternatorLug');
  lug.position.set(-0.22, 0.02, 0);
  g.add(lug);

  const terminal = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 10), M.steel, 'AlternatorTerminal');
  terminal.position.y = 0.24;
  g.add(terminal);

  const pulley = mkMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 24), M.machined, 'AlternatorPulley');
  pulley.position.y = 0.22;
  g.add(pulley);

  g.position.set(1.02, -0.08, 0.28);
  g.rotation.x = Math.PI / 2;
  return g;
}

function buildVRibbedBelt() {
  const g = mkGroup('VRibbedBelt');
  const belt = mkMesh(new THREE.TorusGeometry(0.20, 0.018, 10, 36), M.belt, 'BeltMesh');
  belt.rotation.x = Math.PI / 2;
  g.add(belt);
  g.position.set(0.98, 0.24, 0.28);
  g.rotation.y = 0.3;
  return g;
}

function buildEngineOilFillerCap() {
  const g = mkGroup('EngineOilFillerCap');
  const cap = mkMesh(new THREE.CylinderGeometry(0.048, 0.042, 0.055, 16), M.plug, 'OilFillerCapMesh');
  const handle = mkMesh(new THREE.TorusGeometry(0.032, 0.010, 8, 16), M.rubber, 'OilFillerCapHandle');
  handle.position.y = 0.030;
  g.add(cap);
  g.add(handle);
  g.position.set(0.90, 0.68, 0.38);
  return g;
}

function buildGearboxOilFillPlug() {
  const g = mkGroup('GearboxOilFillPlug');
  const plug = mkMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.055, 14), M.plug, 'GearboxFillPlugMesh');
  const hex  = mkMesh(new THREE.CylinderGeometry(0.042, 0.042, 0.022, 6),  M.steel, 'GearboxFillPlugHex');
  hex.position.y = -0.034;
  g.add(plug);
  g.add(hex);
  g.position.set(0.52, 0.70, -0.20);
  return g;
}

function buildGearboxOverpressureReliefValve() {
  const g = mkGroup('GearboxOverpressureReliefValve');
  const body = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12), M.valve, 'ReliefValveBody');
  body.rotation.x = Math.PI / 2;
  const tip = mkMesh(new THREE.CylinderGeometry(0.015, 0.025, 0.06, 12), M.valve, 'ReliefValveTip');
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -0.17;
  g.add(body);
  g.add(tip);
  g.position.set(0.88, 0.40, 0.15);
  g.rotation.z = -0.2;
  return g;
}

function buildEngineOilFilterHousing() {
  const g = mkGroup('EngineOilFilterHousing');
  const body = mkMesh(new THREE.CylinderGeometry(0.078, 0.078, 0.32, 18), M.machined, 'OilFilterHousingBody');
  const cap  = mkMesh(new THREE.CylinderGeometry(0.088, 0.078, 0.06, 18), M.machined, 'OilFilterHousingCap');
  cap.position.y = 0.19;
  const drain = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), M.plug, 'OilFilterDrainPort');
  drain.rotation.z = Math.PI / 2;
  drain.position.set(-0.10, -0.10, 0);
  g.add(body);
  g.add(cap);
  g.add(drain);
  g.position.set(0.78, 0.90, 0.60);
  return g;
}

function buildPipingHoses() {
  const g = mkGroup('PipingHoses');

  // Coolant line (turbo → thermostat)
  g.add(mkMesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.88, 0.82, 0.55),
      new THREE.Vector3(-0.70, 0.68, 0.62),
      new THREE.Vector3(-0.42, 0.55, 0.70),
    ]), 20, 0.024, 8),
    M.coolantHose, 'CoolantLine1'
  ));

  // Charge pipe (turbo → plenum)
  g.add(mkMesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.88, 0.82, 0.55),
      new THREE.Vector3(-0.55, 0.82, 0.68),
      new THREE.Vector3(-0.12, 0.62, 0.70),
    ]), 20, 0.030, 8),
    M.rubber, 'ChargePipe'
  ));

  // Oil return line (filter → sump)
  g.add(mkMesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.78, 0.90, 0.60),
      new THREE.Vector3(0.72, 0.55, 0.52),
      new THREE.Vector3(0.55, 0.28, 0.42),
    ]), 16, 0.018, 8),
    M.rubber, 'OilReturnLine'
  ));

  // Fuel supply line (common rail → metering unit)
  g.add(mkMesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.52, 0.95, 0.45),
      new THREE.Vector3(-0.80, 0.70, 0.48),
      new THREE.Vector3(-1.04, -0.08, 0.50),
    ]), 16, 0.015, 8),
    M.fuelRail, 'FuelSupplyLine'
  ));

  // Wastegate actuator hose
  g.add(mkMesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 1.04, 0.70),
      new THREE.Vector3(-0.75, 0.90, 0.60),
      new THREE.Vector3(-0.88, 0.82, 0.55),
    ]), 12, 0.014, 8),
    M.rubber, 'WastegateHose'
  ));

  return g;
}

function buildPropellerAssembly() {
  const g = mkGroup('PropellerAssembly');

  // 3 composite blades
  for (let b = 0; b < 3; b++) {
    const bladeGrp = mkGroup(`PropBlade_${b + 1}`);
    const angle    = (b / 3) * Math.PI * 2;

    // Blade shape using extruded profile
    const profile = new THREE.Shape();
    profile.moveTo(0, 0);
    profile.lineTo(-0.055, 0.12);
    profile.lineTo(-0.045, 0.95);
    profile.lineTo(0.018, 0.95);
    profile.lineTo(0.060, 0.12);
    profile.lineTo(0, 0);

    const extOpts = { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 };
    const bladeMesh = mkMesh(new THREE.ExtrudeGeometry(profile, extOpts), M.blade, `PropBladeMesh_${b + 1}`);
    bladeMesh.position.y = 0.08;
    bladeGrp.add(bladeMesh);

    // Root cuff
    const cuff = mkMesh(new THREE.CylinderGeometry(0.055, 0.05, 0.12, 14), M.machined, `PropBladeCuff_${b + 1}`);
    cuff.position.y = 0.04;
    bladeGrp.add(cuff);

    bladeGrp.rotation.z = angle;
    g.add(bladeGrp);
  }

  // Spinner cone
  const spinner = mkMesh(new THREE.ConeGeometry(0.12, 0.26, 18), M.machined, 'PropellerSpinner');
  spinner.rotation.x = Math.PI;
  spinner.position.z = -0.12;
  g.add(spinner);

  g.position.z = -1.22;
  g.rotation.y = Math.PI;
  return g;
}

// ─── Master builder ───────────────────────────────────────────────────────────

/**
 * Assembles the complete UAV Aero-Piston Engine and returns an object
 * compatible with the existing EngineModelLoader return contract.
 *
 * @returns {Object} Engine API expected by digital-twin-main.js / main.js
 */
export function buildProceduralEngine() {
  console.info('[ProceduralEngine] Building UAV Aero-Piston Engine...');

  const engineGroup = mkGroup('AeroPistonEngine');

  // ── Structural assemblies ────────────────────────────────────────────────
  const crankcase    = buildCrankcase();
  const gearbox      = buildGearbox();
  const outputShaft  = buildOutputShaft();
  const propeller    = buildPropellerAssembly();

  // ── Accessories / subsystems ─────────────────────────────────────────────
  const turbo        = buildTurbocharger();
  const wastegate    = buildWastegateController();
  const intake       = buildIntakeManifold();
  const commonRail   = buildCommonRailValve();
  const fuelTempSen  = buildFuelTemperatureSensor();
  const fuelPressSen = buildFuelPressureSensor();
  const fuelMetering = buildFuelMeteringUnit();
  const hpPump       = buildHighPressurePump();
  const crankSen1    = buildCrankshaftSensor(1, new THREE.Vector3(-0.60, -0.70, -0.20), 0.3);
  const crankSen2    = buildCrankshaftSensor(2, new THREE.Vector3( 0.62, -0.72, -0.18), 0.3);
  const oilSystem    = buildOilSystem();
  const alternator   = buildAlternator();
  const belt         = buildVRibbedBelt();
  const oilCap       = buildEngineOilFillerCap();
  const gbFillPlug   = buildGearboxOilFillPlug();
  const reliefValve  = buildGearboxOverpressureReliefValve();
  const oilFilter    = buildEngineOilFilterHousing();
  const piping       = buildPipingHoses();

  // Position gearbox / shaft forward relative to crankcase
  gearbox.position.set(0, -0.22, -1.00);
  outputShaft.position.set(0, -0.22, -1.00);

  // Compose
  [
    crankcase, gearbox, outputShaft, propeller,
    turbo, wastegate, intake, commonRail,
    fuelTempSen, fuelPressSen, fuelMetering, hpPump,
    crankSen1, crankSen2, oilSystem, alternator,
    belt, oilCap, gbFillPlug, reliefValve, oilFilter, piping,
  ].forEach(c => engineGroup.add(c));

  // ── Runtime state ─────────────────────────────────────────────────────────
  let currentRPM = 1200;
  let targetRPM  = 1200;
  let propAngle  = 0;

  // Store original materials for X-Ray restore
  const materialStore = new Map();
  engineGroup.traverse(child => {
    if (child.isMesh) materialStore.set(child.uuid, child.material);
  });

  const xrayMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, metalness: 0.3, roughness: 0.2,
    transparent: true, opacity: 0.28, depthWrite: false, name: 'mat_xray',
  });
  const xrayHighlight = new THREE.MeshStandardMaterial({
    color: 0x06b6d4, metalness: 0.3, roughness: 0.2,
    transparent: true, opacity: 0.72, depthWrite: true,
    emissive: new THREE.Color(0x0284c7), emissiveIntensity: 0.40,
    name: 'mat_xray_highlight',
  });

  const setRPM = (rpm) => {
    targetRPM = Math.max(0, typeof rpm === 'number' ? rpm : 0);
  };

  const setXRayMode = (enable) => {
    engineGroup.traverse(child => {
      if (!child.isMesh) return;
      if (enable) {
        const isInternal =
          child.name.includes('Crankshaft') ||
          child.name.includes('Sensor') ||
          child.name.includes('Pump') ||
          child.name.includes('Turbine');
        child.material = (isInternal ? xrayHighlight : xrayMat).clone();
      } else {
        const orig = materialStore.get(child.uuid);
        if (orig) child.material = orig;
      }
    });
  };

  const _animator = { engineRPM: currentRPM, crankAngle: propAngle, setRPM, pistons: {} };

  const updateEngine = (deltaTime) => {
    currentRPM += (targetRPM - currentRPM) * Math.min(deltaTime * 8.0, 1.0);
    _animator.engineRPM = currentRPM;
    if (currentRPM > 1) {
      propAngle += (currentRPM / 60) * Math.PI * 2 * deltaTime;
      propeller.rotation.z = propAngle;
      _animator.crankAngle = propAngle;
    }
  };

  // Telemetry anchor points for leader-line labels
  const sensorAnchors = {
    rpm:         new THREE.Vector3(0, -0.22, -1.80),
    cht:         new THREE.Vector3(-0.12, 0.30, 0.70),
    egt:         new THREE.Vector3(-0.88, 0.82, 0.55),
    oilPressure: new THREE.Vector3(0, -1.02, -0.24),
    oilTemp:     new THREE.Vector3(0.78, 0.90, 0.60),
    fuelFlow:    new THREE.Vector3(-1.04, -0.08, 0.50),
    vibration:   new THREE.Vector3(0, 0, 0),
  };

  console.info('[ProceduralEngine] Assembly complete — 22 named component groups.');

  return {
    engineGroup,
    engineModel: engineGroup,
    sensorAnchors,
    isGLB: false,
    isUnifiedMesh: false,
    hasSeparateComponents: true,
    animator: _animator,
    setRPM,
    getRPM:      () => Math.round(currentRPM),
    setXRayMode,
    startEngine: () => setRPM(1200),
    stopEngine:  () => setRPM(0),
    updateEngine,
    explode:        () => false,
    assemble:       () => true,
    toggleExploded: () => false,
    isExploded:     () => false,
  };
}
