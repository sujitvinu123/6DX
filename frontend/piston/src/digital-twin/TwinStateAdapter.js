import { SensorManager } from './sensors/SensorManager.js';

/**
 * TwinStateAdapter bridges the EXISTING simulator inputs and mechanical animations
 * into the normalized DigitalTwinState single source of truth.
 *
 * Rules:
 * - Performs NO fake physics generation.
 * - Preserves exact numeric precision from simulator feeds.
 * - Leaves unavailable fields as null.
 */
export class TwinStateAdapter {
  /**
   * @param {TwinStateManager} stateManager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.sensorManager = new SensorManager();
  }

  /**
   * Ingests real-time telemetry updates from telemetryData.js or BroadcastChannel.
   * @param {Object} rawTelemetry - Raw telemetry feed from simulator
   */
  ingestTelemetry(rawTelemetry) {
    if (!rawTelemetry) return;

    const current = this.stateManager.getState();
    const partialUpdate = {};

    // ── 1. Engine ──────────────────────────────────────────────────────────────
    if (rawTelemetry.rpm !== undefined || rawTelemetry.status !== undefined || rawTelemetry.manifoldPressure !== undefined) {
      partialUpdate.engine = {
        ...current.engine,
        rpm:              rawTelemetry.rpm              !== undefined ? rawTelemetry.rpm              : current.engine.rpm,
        operatingState:   rawTelemetry.status           !== undefined ? rawTelemetry.status           : current.engine.operatingState,
        manifoldPressure: rawTelemetry.manifoldPressure !== undefined ? rawTelemetry.manifoldPressure : current.engine.manifoldPressure,
      };
      // Propulsion — prop RPM is direct-drive from engine RPM
      if (rawTelemetry.rpm !== undefined) {
        partialUpdate.propulsion = {
          ...current.propulsion,
          propellerRpm: rawTelemetry.rpm
        };
      }
    }

    // ── 2. UAV Attitude ────────────────────────────────────────────────────────
    // Route roll/pitch/yaw/altitude/airspeed/throttle through to uav state
    const uavKeys = ['roll', 'pitch', 'yaw', 'altitude', 'airspeed', 'throttle'];
    const hasUAV  = uavKeys.some(k => rawTelemetry[k] !== undefined && rawTelemetry[k] !== null);
    if (hasUAV) {
      partialUpdate.uav = { ...current.uav };
      uavKeys.forEach(k => {
        if (rawTelemetry[k] !== undefined) {
          partialUpdate.uav[k] = rawTelemetry[k];
        }
      });
      // velocity alias for airspeed
      if (rawTelemetry.airspeed !== undefined) {
        partialUpdate.uav.velocity = rawTelemetry.airspeed;
      }
    }

    // ── 3. Cooling (global) + Per-cylinder CHT / EGT ──────────────────────────
    const hasThermal = rawTelemetry.cht !== undefined || rawTelemetry.egt !== undefined ||
      rawTelemetry.cht_cyl1 !== undefined || rawTelemetry.cht_cyl2 !== undefined ||
      rawTelemetry.cht_cyl3 !== undefined || rawTelemetry.cht_cyl4 !== undefined ||
      rawTelemetry.egt_cyl1 !== undefined || rawTelemetry.egt_cyl2 !== undefined ||
      rawTelemetry.egt_cyl3 !== undefined || rawTelemetry.egt_cyl4 !== undefined;

    if (hasThermal) {
      const globalCht = rawTelemetry.cht !== undefined ? rawTelemetry.cht : current.cooling.cht;
      const globalEgt = rawTelemetry.egt !== undefined ? rawTelemetry.egt : current.cooling.egt;

      partialUpdate.cooling = {
        ...current.cooling,
        cht: globalCht,
        egt: globalEgt,
      };

      // Per-cylinder: use explicit per-cyl value if provided, else fall back to global
      const resolveCht = (cylKey, rawKey, currentCyl) => {
        if (rawTelemetry[rawKey] !== undefined && rawTelemetry[rawKey] !== null) return rawTelemetry[rawKey];
        if (currentCyl.cht !== null) return currentCyl.cht;
        return globalCht;
      };
      const resolveEgt = (rawKey, currentCyl) => {
        if (rawTelemetry[rawKey] !== undefined && rawTelemetry[rawKey] !== null) return rawTelemetry[rawKey];
        if (currentCyl.egt !== null) return currentCyl.egt;
        return globalEgt;
      };

      partialUpdate.cylinders = {
        cylinder1: { ...current.cylinders.cylinder1, cht: resolveCht('cylinder1', 'cht_cyl1', current.cylinders.cylinder1), egt: resolveEgt('egt_cyl1', current.cylinders.cylinder1) },
        cylinder2: { ...current.cylinders.cylinder2, cht: resolveCht('cylinder2', 'cht_cyl2', current.cylinders.cylinder2), egt: resolveEgt('egt_cyl2', current.cylinders.cylinder2) },
        cylinder3: { ...current.cylinders.cylinder3, cht: resolveCht('cylinder3', 'cht_cyl3', current.cylinders.cylinder3), egt: resolveEgt('egt_cyl3', current.cylinders.cylinder3) },
        cylinder4: { ...current.cylinders.cylinder4, cht: resolveCht('cylinder4', 'cht_cyl4', current.cylinders.cylinder4), egt: resolveEgt('egt_cyl4', current.cylinders.cylinder4) },
      };
    }

    // ── 4. Oil ────────────────────────────────────────────────────────────────
    if (rawTelemetry.oilPressure !== undefined || rawTelemetry.oilTemperature !== undefined ||
        rawTelemetry.oilLevel    !== undefined || rawTelemetry.oilFlow        !== undefined) {
      partialUpdate.oil = {
        ...current.oil,
        pressure:    rawTelemetry.oilPressure    !== undefined ? rawTelemetry.oilPressure    : current.oil.pressure,
        temperature: rawTelemetry.oilTemperature !== undefined ? rawTelemetry.oilTemperature : current.oil.temperature,
        level:       rawTelemetry.oilLevel       !== undefined ? rawTelemetry.oilLevel       : current.oil.level,
        flow:        rawTelemetry.oilFlow        !== undefined ? rawTelemetry.oilFlow        : current.oil.flow,
      };
    }

    // ── 5. Fuel ───────────────────────────────────────────────────────────────
    if (rawTelemetry.fuelFlow !== undefined) {
      partialUpdate.fuel = { ...current.fuel, flow: rawTelemetry.fuelFlow };
    }

    // ── 6. Vibration ──────────────────────────────────────────────────────────
    if (rawTelemetry.vibration !== undefined) {
      partialUpdate.vibration = { ...current.vibration, value: rawTelemetry.vibration };
    }

    // ── 7. Diagnostics — healthIndex ──────────────────────────────────────────
    if (rawTelemetry.healthIndex !== undefined) {
      partialUpdate.diagnostics = {
        ...current.diagnostics,
        healthIndices: {
          ...current.diagnostics.healthIndices,
          overall: rawTelemetry.healthIndex
        }
      };
    }

    // ── 8. Environment ────────────────────────────────────────────────────────
    if (rawTelemetry.altitude !== undefined || rawTelemetry.airspeed !== undefined) {
      partialUpdate.environment = {
        ...current.environment,
        altitude: rawTelemetry.altitude !== undefined ? rawTelemetry.altitude : current.environment.altitude,
      };
    }

    // ── Commit + sync sensors ─────────────────────────────────────────────────
    this.stateManager.updateState(partialUpdate);
    this.sensorManager.syncState(this.stateManager.getState());
    this.stateManager.updateState({ sensors: this.sensorManager.getSensors() });
  }

  /**
   * Ingests continuous mechanical kinematics state from EngineAnimation.
   * @param {Object} animationState - { engineRPM, crankAngle, pistonsDisplacement }
   */
  ingestKinematics(animationState) {
    if (!animationState) return;

    const current = this.stateManager.getState();
    const partialUpdate = {};

    if (animationState.engineRPM !== undefined && animationState.engineRPM !== current.engine.rpm) {
      partialUpdate.engine = {
        ...current.engine,
        rpm: animationState.engineRPM
      };
      partialUpdate.propulsion = {
        ...current.propulsion,
        propellerRpm: animationState.engineRPM
      };
    }

    if (animationState.pistonsDisplacement || animationState.crankAngle !== undefined) {
      const disp = animationState.pistonsDisplacement || {};
      partialUpdate.cylinders = {
        cylinder1: { ...current.cylinders.cylinder1, position: disp.Piston_Left_1  ?? current.cylinders.cylinder1.position },
        cylinder2: { ...current.cylinders.cylinder2, position: disp.Piston_Left_2  ?? current.cylinders.cylinder2.position },
        cylinder3: { ...current.cylinders.cylinder3, position: disp.Piston_Right_1 ?? current.cylinders.cylinder3.position },
        cylinder4: { ...current.cylinders.cylinder4, position: disp.Piston_Right_2 ?? current.cylinders.cylinder4.position },
      };
    }

    this.stateManager.updateState(partialUpdate);
  }

  /**
   * Updates UAV flight attitude states (roll, pitch, yaw, altitude, velocity, throttle).
   * @param {Object} uavState - Partial UAV parameters
   */
  updateUAV(uavState) {
    const current = this.stateManager.getState();
    this.stateManager.updateState({
      uav: { ...current.uav, ...uavState }
    });
  }

  /**
   * Updates Digital Twin Diagnostics & Residuals.
   * @param {Object} diagnosticsUpdate - Partial diagnostics fields
   */
  updateDiagnostics(diagnosticsUpdate) {
    const current = this.stateManager.getState();
    this.stateManager.updateState({
      diagnostics: { ...current.diagnostics, ...diagnosticsUpdate }
    });
  }
}
