import { createInitialDigitalTwinState } from './DigitalTwinState.js';

/**
 * Central State Manager for AERO-TWIN Digital Twin Core.
 * Manages the single source of truth DigitalTwinState and notifies listeners on state changes.
 */
export class TwinStateManager {
  constructor(initialState = createInitialDigitalTwinState()) {
    this.state = initialState;
    this.listeners = new Set();
  }

  /**
   * Returns the current complete Digital Twin state object.
   * @return {Object} Read-only view of current state.
   */
  getState() {
    return this.state;
  }

  /**
   * Subscribes a listener callback to state updates.
   * @param {Function} listener - Function receiving (state, changedPaths)
   * @return {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediate notification with initial state
    try {
      listener(this.state, ['*']);
    } catch (err) {
      console.error('[TwinStateManager] Error in initial subscriber callback:', err);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Updates state with deep partial merge and notifies subscribers.
   * @param {Object} partialState - Partial tree to merge into DigitalTwinState
   */
  updateState(partialState) {
    if (!partialState || typeof partialState !== 'object') return;

    const changedPaths = [];
    this._deepMerge(this.state, partialState, '', changedPaths);
    this.state.timestamp = Date.now();

    this.listeners.forEach((listener) => {
      try {
        listener(this.state, changedPaths);
      } catch (err) {
        console.error('[TwinStateManager] Error notifying subscriber:', err);
      }
    });
  }

  /**
   * Internal recursive helper for deep state merging and path tracking.
   */
  _deepMerge(target, source, currentPath, changedPaths) {
    for (const key of Object.keys(source)) {
      const path = currentPath ? `${currentPath}.${key}` : key;
      const sourceVal = source[key];
      const targetVal = target[key];

      if (
        sourceVal !== null &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal !== null &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        this._deepMerge(targetVal, sourceVal, path, changedPaths);
      } else if (targetVal !== sourceVal) {
        target[key] = sourceVal;
        changedPaths.push(path);
      }
    }
  }
}

// Global Singleton Instance
export const twinStateManager = new TwinStateManager();
