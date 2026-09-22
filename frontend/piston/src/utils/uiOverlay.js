/**
 * UI Overlay Utility for AERO-TWIN Engine Digital Twin.
 * Displays engine telemetry state, RPM, and exposes controls.
 * 
 * @param {Object} engine - The AeroPistonEngine instance.
 */
export function initUIOverlay(engine) {
  console.log(
    '%c[AERO-TWIN]%c Procedural Boxer 4-Cylinder Aero-Piston Engine Initialized.',
    'color: #00f0ff; font-weight: bold; background: #070a12; padding: 4px 8px; border-radius: 4px;',
    'color: #8fa0b5;'
  );

  console.log(
    '%c[ENGINE API]%c Access engine via window.aeroEngine:\n - aeroEngine.setRPM(1800)\n - aeroEngine.stopEngine()\n - aeroEngine.startEngine()\n - aeroEngine.getCylinderByName("LeftCylinder_1")',
    'color: #38bdf8; font-weight: bold;',
    'color: #cbd5e1;'
  );
}/