import { EngineState, IDataSource, DataSourceType } from '../../types/engine';

/**
 * Base Abstract DataSource class
 * Manages subscriber lifecycle and event dispatching.
 */
export abstract class BaseDataSource implements IDataSource {
  abstract readonly type: DataSourceType;
  abstract readonly label: string;
  abstract readonly isLive: boolean;

  protected subscribers: Array<(state: EngineState) => void> = [];
  protected currentState: EngineState | null = null;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  subscribe(callback: (state: EngineState) => void): () => void {
    this.subscribers.push(callback);
    if (this.currentState) {
      callback(this.currentState);
    }

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  protected notifySubscribers(state: EngineState): void {
    this.currentState = state;
    this.subscribers.forEach((callback) => {
      try {
        callback(state);
      } catch (err) {
        console.error(`[DataSource ${this.label}] Subscriber error:`, err);
      }
    });
  }

  getCurrentState(): EngineState {
    if (!this.currentState) {
      throw new Error(`[DataSource ${this.label}] No state available. Ensure connect() has been called.`);
    }
    return this.currentState;
  }
}
