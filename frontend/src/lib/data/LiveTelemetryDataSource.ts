import { BaseDataSource } from './DataSource';
import { DataSourceType } from '../../types/engine';
import { EngineStateMapper } from './EngineStateMapper';

/**
 * LiveTelemetryDataSource
 * Production telemetry gateway that connects to live backend WebSocket (FastAPI) or CAN stream.
 */
export class LiveTelemetryDataSource extends BaseDataSource {
  readonly type: DataSourceType = 'LIVE_TELEMETRY';
  readonly label: string = 'LIVE TELEMETRY';
  readonly isLive: boolean = true;

  private socket: WebSocket | null = null;
  private wsUrl: string;

  constructor(wsUrl: string = 'ws://localhost:8000/ws/telemetry/ENG-001') {
    super();
    this.wsUrl = wsUrl;
  }

  async connect(): Promise<void> {
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const normalized = EngineStateMapper.fromRawTelemetry(rawData, this.type, this.label);
          this.notifySubscribers(normalized);
        } catch (err) {
          console.error('[LiveTelemetryDataSource] Failed to parse WebSocket packet:', err);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[LiveTelemetryDataSource] WebSocket connection unavailable (running offline):', err);
      };
    } catch (e) {
      console.warn('[LiveTelemetryDataSource] Offline mode:', e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
