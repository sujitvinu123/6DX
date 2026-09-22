import { INITIAL_SENSOR_REGISTRY } from './SensorRegistry.js';

/**
 * Sensor Manager for SIH 26054 Digital Twin.
 * Binds DigitalTwinState updates to the physical sensor registry.
 */
export class SensorManager {
  constructor(registry = INITIAL_SENSOR_REGISTRY) {
    // Clone registry array & items so state mutations are contained
    this.sensors = registry.map(s => ({ ...s, position: { ...s.position } }));
    this.sensorMap = new Map(this.sensors.map(s => [s.id, s]));
  }

  getSensors() {
    return this.sensors;
  }

  getSensorById(id) {
    return this.sensorMap.get(id);
  }

  /**
   * Updates live sensor values from DigitalTwinState.
   * Preserves status as 'OFFLINE' for unavailable placeholder sensors.
   * 
   * @param {Object} state - Current DigitalTwinState object
   */
  syncState(state) {
    if (!state) return;

    this.sensors.forEach(sensor => {
      switch (sensor.id) {
        case 'SENS_RPM_01':
          if (state.engine && state.engine.rpm !== null) {
            sensor.value = state.engine.rpm;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_CHT_CYL1':
          if (state.cylinders && state.cylinders.cylinder1 && state.cylinders.cylinder1.cht !== null) {
            sensor.value = state.cylinders.cylinder1.cht;
            sensor.status = 'NORMAL';
          } else if (state.cooling && state.cooling.cht !== null) {
            sensor.value = state.cooling.cht;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_CHT_CYL2':
          if (state.cylinders && state.cylinders.cylinder2 && state.cylinders.cylinder2.cht !== null) {
            sensor.value = state.cylinders.cylinder2.cht;
            sensor.status = 'NORMAL';
          } else if (state.cooling && state.cooling.cht !== null) {
            sensor.value = state.cooling.cht;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_CHT_CYL3':
          if (state.cylinders && state.cylinders.cylinder3 && state.cylinders.cylinder3.cht !== null) {
            sensor.value = state.cylinders.cylinder3.cht;
            sensor.status = 'NORMAL';
          } else if (state.cooling && state.cooling.cht !== null) {
            sensor.value = state.cooling.cht;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_CHT_CYL4':
          if (state.cylinders && state.cylinders.cylinder4 && state.cylinders.cylinder4.cht !== null) {
            sensor.value = state.cylinders.cylinder4.cht;
            sensor.status = 'NORMAL';
          } else if (state.cooling && state.cooling.cht !== null) {
            sensor.value = state.cooling.cht;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_EGT_RUN1':
        case 'SENS_EGT_RUN2':
        case 'SENS_EGT_RUN3':
        case 'SENS_EGT_RUN4':
        case 'SENS_EGT_COLL_L':
        case 'SENS_EGT_COLL_R':
          if (state.cooling && state.cooling.egt !== null) {
            sensor.value = state.cooling.egt;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_OIL_PRESS':
          if (state.oil && state.oil.pressure !== null) {
            sensor.value = state.oil.pressure;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_OIL_TEMP':
          if (state.oil && state.oil.temperature !== null) {
            sensor.value = state.oil.temperature;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_OIL_FLOW':
          if (state.oil && state.oil.flow !== null) {
            sensor.value = state.oil.flow;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_FUEL_FLOW':
          if (state.fuel && state.fuel.flow !== null) {
            sensor.value = state.fuel.flow;
            sensor.status = 'NORMAL';
          }
          break;
        case 'SENS_VIB_CRANK':
          if (state.vibration && state.vibration.value !== null) {
            sensor.value = state.vibration.value;
            sensor.status = 'NORMAL';
          }
          break;
        default:
          // Placeholder sensors remain OFFLINE unless explicit telemetry exists
          break;
      }
    });
  }
}
