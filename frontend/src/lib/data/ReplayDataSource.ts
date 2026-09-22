import { BaseDataSource } from './DataSource';
import { DataSourceType } from '../../types/engine';
import { EngineStateMapper } from './EngineStateMapper';

/**
 * ReplayDataSource
 * Reads recorded mission telemetry frames and streams them across a scrubbable timeline.
 */
export class ReplayDataSource extends BaseDataSource {
  readonly type: DataSourceType = 'MISSION_REPLAY';
  readonly label: string = 'MISSION REPLAY';
  readonly isLive: boolean = false;

  private isPlaying: boolean = false;
  private currentFrameIndex: number = 0;
  private playbackSpeed: number = 1.0;
  private timer: any = null;

  // Mock mission frames representing an 8-hour sortie with an anomaly at hour 5
  private frames: Array<Record<string, any>> = [];

  constructor() {
    super();
    this.generateMissionFrames();
  }

  private generateMissionFrames() {
    for (let minute = 0; minute <= 480; minute += 5) {
      const isClimb = minute < 60;
      const isCruise = minute >= 60 && minute < 420;
      const isAnomaly = minute >= 300 && minute < 380;

      this.frames.push({
        timestamp: new Date(Date.now() - (480 - minute) * 60000).toISOString(),
        altitude: isClimb ? minute * 80 : 5000,
        throttle: isClimb ? 85 : 70,
        rpm: isClimb ? 5100 : (isAnomaly ? 4760 : 4820),
        cht: isAnomaly ? 172 : 158,
        egt: isAnomaly ? 742 : 704,
        oilPressure: isAnomaly ? 3.9 : 4.2,
        oilTemperature: isAnomaly ? 104 : 96,
        vibration: isAnomaly ? 0.21 : 0.13,
        overallHealth: isAnomaly ? 82 : 94,
        anomalyScore: isAnomaly ? 0.84 : 0.12,
        missionPhase: isClimb ? 'INITIAL CLIMB' : (isCruise ? 'HIGH-ALTITUDE CRUISE' : 'DESCENT & RECOVERY'),
      });
    }
  }

  async connect(): Promise<void> {
    const initialFrame = this.frames[0];
    this.notifySubscribers(EngineStateMapper.fromRawTelemetry(initialFrame, this.type, this.label));
  }

  async disconnect(): Promise<void> {
    this.pause();
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    this.timer = setInterval(() => {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
      const frame = this.frames[this.currentFrameIndex];
      this.notifySubscribers(EngineStateMapper.fromRawTelemetry(frame, this.type, this.label));
    }, 1000 / this.playbackSpeed);
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  seek(frameIndex: number): void {
    this.currentFrameIndex = Math.max(0, Math.min(this.frames.length - 1, frameIndex));
    const frame = this.frames[this.currentFrameIndex];
    this.notifySubscribers(EngineStateMapper.fromRawTelemetry(frame, this.type, this.label));
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }
}
