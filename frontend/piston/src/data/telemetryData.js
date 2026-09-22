/**
 * Central Telemetry State Manager for AERO-TWIN Digital Twin.
 * Stores real-time simulated parameters and provides subscribers with update hooks.
 *
 * BROADCAST: Every update is published on BroadcastChannel("aero-twin-telemetry")
 * so the Digital Twin tab can receive live data from the simulator tab in real time.
 */

// ──────────────────────────────────────────────────────────────────
// BroadcastChannel publisher (simulator → digital twin)
// ──────────────────────────────────────────────────────────────────
const _bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('aero-twin-telemetry')
  : null;

// ──────────────────────────────────────────────────────────────────
// Master telemetry object — SINGLE SOURCE OF TRUTH for simulator
// ──────────────────────────────────────────────────────────────────
export const telemetry = {
  // Engine
  rpm: 4820,
  status: 'HEALTHY',
  manifoldPressure: null,  // kPa — unavailable in raw sim (leave null until simulator provides it)

  // Thermal (global + per-cylinder)
  cht: 158,          // °C global
  egt: 704,          // °C global
  cht_cyl1: null,    // °C cylinder 1 (Left 1)  — set to override global
  cht_cyl2: null,    // °C cylinder 2 (Left 2)
  cht_cyl3: null,    // °C cylinder 3 (Right 1)
  cht_cyl4: null,    // °C cylinder 4 (Right 2)
  egt_cyl1: null,    // °C EGT cylinder 1
  egt_cyl2: null,
  egt_cyl3: null,
  egt_cyl4: null,

  // Oil system
  oilPressure: 4.2,    // bar
  oilTemperature: 96,  // °C
  oilLevel: null,      // L — unavailable in raw sim
  oilFlow: null,       // L/min — unavailable in raw sim

  // Fuel system
  fuelFlow: 18.4,      // L/h

  // Vibration
  vibration: 0.13,     // g

  // Health / Diagnostics
  healthIndex: 94,     // %

  // UAV Flight Attitude (injected via updateTelemetry from flight controller or console)
  roll: 0,             // degrees
  pitch: 0,            // degrees
  yaw: 0,              // degrees
  altitude: null,      // m
  airspeed: null,      // m/s
  throttle: null,      // 0..1
};

const listeners = [];
let adapterInstance = null;

export function registerTwinStateAdapter(adapter) {
  adapterInstance = adapter;
  if (adapterInstance) {
    adapterInstance.ingestTelemetry(telemetry);
  }
}

/**
 * Updates telemetry data and notifies UI subscribers and the Digital Twin tab.
 * Preserves exact numerical input precision without rounding.
 * @param {Object} newData - Partial or full telemetry updates.
 */
export function updateTelemetry(newData) {
  Object.assign(telemetry, newData);

  // Push into DigitalTwinState pipeline (same tab)
  if (adapterInstance) {
    adapterInstance.ingestTelemetry(telemetry);
  }

  // Broadcast to Digital Twin tab (cross-tab via BroadcastChannel)
  if (_bc) {
    try {
      _bc.postMessage({ type: 'TELEMETRY_UPDATE', payload: { ...telemetry } });
    } catch (e) {
      // Structured clone failures (e.g. functions) — safe to ignore
    }
  }

  listeners.forEach(fn => fn(telemetry));
}

/**
 * Subscribes a listener callback to telemetry state changes.
 * @param {Function} callback
 */
export function subscribeTelemetry(callback) {
  listeners.push(callback);
  callback(telemetry);
}
