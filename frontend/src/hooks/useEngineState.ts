import { useState, useEffect } from 'react';
import { EngineState, TelemetryDataPoint, ActiveAlert } from '../types/engine';
import { initialEngineState, generateHistoricalTelemetry, mockAlerts } from '../lib/mockEngineData';

/**
 * useEngineState Hook
 * Provides synchronized EngineState, historical telemetry buffer, alerts, and live updates.
 * Architected to be dropped-in replaced with useEngineWebSocket() when FastAPI backend is ready.
 */
export function useEngineState() {
  const [engineState, setEngineState] = useState<EngineState>(initialEngineState);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>(generateHistoricalTelemetry());
  const [alerts, setAlerts] = useState<ActiveAlert[]>(mockAlerts);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ENGINE');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'>('CONNECTED');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toTimeString().split(' ')[0]);

  // Live Simulation Clock: micro-updates telemetry every 800ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setLastSyncTime(timeStr);

      setEngineState((prev) => {
        // Natural small thermodynamic sensor noise
        const rpmDelta = Math.floor((Math.random() - 0.5) * 8);
        const chtDelta = Number(((Math.random() - 0.5) * 0.3).toFixed(1));
        const egtDelta = Number(((Math.random() - 0.5) * 0.8).toFixed(1));
        const oilPDelta = Number(((Math.random() - 0.5) * 0.02).toFixed(2));
        const vibDelta = Number(((Math.random() - 0.5) * 0.004).toFixed(3));

        const updatedRpm = Math.max(4780, Math.min(4860, prev.rpm + rpmDelta));
        const updatedCht = Number((prev.cht + chtDelta).toFixed(1));
        const updatedEgt = Number((prev.egt + egtDelta).toFixed(1));
        const updatedOilP = Number((prev.oilPressure + oilPDelta).toFixed(2));
        const updatedVib = Number((prev.vibration + vibDelta).toFixed(3));

        const newPoint: TelemetryDataPoint = {
          time: timeStr,
          rpm: updatedRpm,
          cht: updatedCht,
          egt: updatedEgt,
          oilPressure: updatedOilP,
          oilTemperature: prev.oilTemperature,
          vibration: updatedVib,
          fuelFlow: prev.fuelFlow,
        };

        setTelemetryHistory((hist) => [...hist.slice(1), newPoint]);

        return {
          ...prev,
          timestamp: now.toISOString(),
          rpm: updatedRpm,
          cht: updatedCht,
          egt: updatedEgt,
          oilPressure: updatedOilP,
          vibration: updatedVib,
        };
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return {
    engineState,
    telemetryHistory,
    alerts,
    selectedSubsystem,
    setSelectedSubsystem,
    connectionStatus,
    lastSyncTime,
  };
}
