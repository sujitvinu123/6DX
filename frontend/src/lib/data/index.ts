import { IDataSource, DataSourceType, EngineState } from '../../types/engine';
import { DatasetDataSource } from './DatasetDataSource';
import { ReplayDataSource } from './ReplayDataSource';
import { LiveTelemetryDataSource } from './LiveTelemetryDataSource';

export * from './DataSource';
export * from './EngineStateMapper';
export * from './DatasetDataSource';
export * from './ReplayDataSource';
export * from './LiveTelemetryDataSource';

/**
 * Central DataManager Singleton
 * Manages active data source (Dataset, Replay, Live Telemetry) and dispatches normalized EngineState.
 */
class DataManager {
  private activeSource: IDataSource;
  private datasetSource: DatasetDataSource;
  private replaySource: ReplayDataSource;
  private liveSource: LiveTelemetryDataSource;

  private listeners: Array<(state: EngineState) => void> = [];
  private unsubscribeCurrent: (() => void) | null = null;

  constructor() {
    this.datasetSource = new DatasetDataSource();
    this.replaySource = new ReplayDataSource();
    this.liveSource = new LiveTelemetryDataSource();

    // Default to Simulated Dataset for development
    this.activeSource = this.datasetSource;
  }

  async init(): Promise<void> {
    await this.setDataSource('SIMULATED_DATASET');
  }

  async setDataSource(type: DataSourceType): Promise<void> {
    if (this.unsubscribeCurrent) {
      this.unsubscribeCurrent();
      this.unsubscribeCurrent = null;
    }
    await this.activeSource.disconnect();

    switch (type) {
      case 'SIMULATED_DATASET':
        this.activeSource = this.datasetSource;
        break;
      case 'MISSION_REPLAY':
        this.activeSource = this.replaySource;
        break;
      case 'LIVE_TELEMETRY':
      case 'CAN_ECU':
        this.activeSource = this.liveSource;
        break;
      default:
        this.activeSource = this.datasetSource;
    }

    await this.activeSource.connect();
    this.unsubscribeCurrent = this.activeSource.subscribe((state) => {
      this.listeners.forEach((listener) => listener(state));
    });
  }

  subscribe(callback: (state: EngineState) => void): () => void {
    this.listeners.push(callback);
    try {
      callback(this.activeSource.getCurrentState());
    } catch {
      // Not yet connected
    }

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  getActiveSource(): IDataSource {
    return this.activeSource;
  }

  getDatasetSource(): DatasetDataSource {
    return this.datasetSource;
  }

  getReplaySource(): ReplayDataSource {
    return this.replaySource;
  }
}

export const dataManager = new DataManager();
