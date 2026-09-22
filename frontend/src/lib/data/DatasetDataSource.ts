import { BaseDataSource } from './DataSource';
import { DataSourceType } from '../../types/engine';
import { EngineStateMapper } from './EngineStateMapper';

/**
 * DatasetDataSource
 * Connects to the simulated engine dataset (as defined in the piston resource)
 * and streams continuous real-time telemetry frames with realistic thermodynamic physics noise.
 */
export class DatasetDataSource extends BaseDataSource {
  readonly type: DataSourceType = 'SIMULATED_DATASET';
  readonly label: string = 'SIMULATED DATASET';
  readonly isLive: boolean = false;

  private timer: any = null;
  private currentRawState = {
    uavId: 'UAV-001',
    engineId: 'ENG-001',
    missionId: 'M-ISR-2026',
    altitude: 5000,
    ambientTemperature: 35,
    atmosphericPressure: 540,
    throttle: 70,
    engineLoad: 68,
    missionPhase: 'HIGH-ALTITUDE CRUISE',
    rpm: 4820,
    cht: 158.0,
    egt: 704.0,
    oilPressure: 4.20,
    oilTemperature: 96.0,
    fuelFlow: 18.4,
    vibration: 0.130,
    batteryVoltage: 24.4,
    alternatorVoltage: null,
    alternatorLoad: null,
    injectionTiming: 24,
    thermalHealth: 91,
    mechanicalHealth: 96,
    lubricationHealth: 94,
    combustionHealth: 92,
    electricalHealth: 97,
    overallHealth: 94,
    anomalyScore: 0.12,
    degradationIndex: 8.4,
    rulHours: 86,
    rulConfidence: 82,
  };

  async connect(): Promise<void> {
    if (this.timer) return;

    // Initial dispatch
    this.notifySubscribers(EngineStateMapper.fromRawTelemetry(this.currentRawState, this.type, this.label));

    // Stream 50Hz frame loop / periodic telemetry update
    this.timer = setInterval(() => {
      // Natural sensor micro-variance based on aero-piston dynamics
      const rpmNoise = 4820 + Math.floor((Math.random() - 0.5) * 8);
      const chtNoise = Number((158.0 + (Math.random() - 0.5) * 0.3).toFixed(1));
      const egtNoise = Number((704.0 + (Math.random() - 0.5) * 1.1).toFixed(1));
      const oilPNoise = Number((4.20 + (Math.random() - 0.5) * 0.02).toFixed(2));
      const vibNoise = Number((0.130 + (Math.random() - 0.5) * 0.004).toFixed(3));

      this.currentRawState = {
        ...this.currentRawState,
        rpm: rpmNoise,
        cht: chtNoise,
        egt: egtNoise,
        oilPressure: oilPNoise,
        vibration: vibNoise,
      };

      const normalized = EngineStateMapper.fromRawTelemetry(this.currentRawState, this.type, this.label);
      this.notifySubscribers(normalized);
    }, 800);
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Allows injecting synthetic anomalies for testing
   */
  injectAnomaly(isAnomaly: boolean): void {
    if (isAnomaly) {
      this.currentRawState.egt = 734.2;
      this.currentRawState.cht = 168.5;
      this.currentRawState.oilPressure = 3.92;
      this.currentRawState.vibration = 0.195;
      this.currentRawState.anomalyScore = 0.68;
      this.currentRawState.overallHealth = 84;
    } else {
      this.currentRawState.egt = 704.0;
      this.currentRawState.cht = 158.0;
      this.currentRawState.oilPressure = 4.20;
      this.currentRawState.vibration = 0.130;
      this.currentRawState.anomalyScore = 0.12;
      this.currentRawState.overallHealth = 94;
    }
  }
}
