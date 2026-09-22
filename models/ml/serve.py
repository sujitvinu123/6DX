"""
Real inference stream server.

`mock_stream_server.py` fake frames anuppuchu. Idhu **unga real models**
vechu same shape-la frames anuppudhu. Frontend URL onnu kooda maatha
vendaam — same ws://localhost:8765, same JSON.

    pip install websockets
    python serve.py --scenario LUBRICATION_FAILURE --speed 4

Scenarios: entha fault class-um, illa "healthy".

Backend person-ku: idhu reference implementation. Unga real CAN stream
vandhadhum, `replay_source()`-a andha stream-a vechu maathunga. Mitha
ellam same.
"""

from __future__ import annotations
import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

import importlib.util as _il
_sp = _il.spec_from_file_location("inf", Path(__file__).with_name("inference.py"))
_inf = _il.module_from_spec(_sp)
_sp.loader.exec_module(_inf)
InferenceEngine = _inf.InferenceEngine

GT_COLS = ["fault_class", "fault_severity", "time_to_failure_s", "health_index_true"]
SCHEMA_VERSION = "1.0.0"


def load_limits(schema_path: Path) -> dict:
    """Frontend reads gauge thresholds from here, never hardcodes them."""
    if not schema_path.exists():
        return {}
    s = json.loads(schema_path.read_text())
    return {c["name"]: {"normal": c.get("normal"), "caution": c.get("caution"),
                        "limit": c.get("limit"),
                        "direction": c.get("limit_direction", "high"),
                        "unit": c["unit"]}
            for c in s.get("channels", [])}


def replay_source(data_dir: Path, scenario: str):
    """
    Yields raw telemetry records, ground truth stripped.

    THIS is the only function to replace when the real CAN stream exists.
    Everything downstream stays identical.
    """
    if scenario.upper() == "HEALTHY":
        df = pd.read_csv(data_dir / "T1_healthy.csv")
        fid = df.flight_id.iloc[0]
    else:
        df = pd.read_csv(data_dir / "T2_degradation.csv")
        m = df.fault_class == scenario.upper()
        if not m.any():
            raise SystemExit(f"no runs with fault class {scenario!r}")
        fid = df.loc[m, "flight_id"].iloc[0]

    run = df[df.flight_id == fid].sort_values("t_s")
    print(f"  source: {fid}  ({len(run)} ticks)")
    for _, r in run.iterrows():
        yield {k: v for k, v in r.to_dict().items() if k not in GT_COLS}


def build_event(t_s, evt_id, kind, severity, fault_class, message, lead_min):
    return {"type": "event", "schema_version": SCHEMA_VERSION,
            "event_id": f"evt_{evt_id:05d}", "t_s": round(float(t_s), 1),
            "wall_clock": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "kind": kind, "severity": severity, "fault_class": fault_class,
            "message": message, "lead_time_min": lead_min}


async def stream(ws, engine, data_dir, scenario, limits, speed):
    first = next(iter(replay_source(data_dir, scenario)))
    await ws.send(json.dumps({
        "type": "hello", "schema_version": SCHEMA_VERSION,
        "engine_id": first.get("engine_id"), "flight_id": first.get("flight_id"),
        "channels": engine.sur.targets, "limits": limits}))

    evt_id, announced = 1, set()
    for rec in replay_source(data_dir, scenario):
        frame = engine.step(rec)
        await ws.send(json.dumps(frame, default=float))

        sev = frame["advisory"]["severity"]
        if frame["fault"] and sev not in announced:
            announced.add(sev)
            await ws.send(json.dumps(build_event(
                frame["meta"]["t_s"], evt_id,
                "FAULT_ONSET" if len(announced) == 1 else "FAULT_ESCALATED",
                sev, frame["fault"]["class"], frame["advisory"]["message"],
                frame["rul"]["p10"] if frame["rul"] else None), default=float))
            evt_id += 1

        await asyncio.sleep(1.0 / speed)
    print("  replay finished")


async def main_async(a):
    import websockets
    engine = InferenceEngine.load(a.artifacts)
    limits = load_limits(Path(a.schema))
    print(f"loaded models from {a.artifacts}   limits for {len(limits)} channels")

    async def handler(ws):
        print(f"client connected  scenario={a.scenario}  speed={a.speed}x")
        try:
            await stream(ws, engine, Path(a.data), a.scenario, limits, a.speed)
        except Exception as e:
            print("client gone:", type(e).__name__, e)

    print(f"real inference stream on ws://localhost:{a.port}")
    async with websockets.serve(handler, "localhost", a.port):
        await asyncio.Future()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", default="artifacts")
    ap.add_argument("--data", default=".")
    ap.add_argument("--schema", default="telemetry_schema.json")
    ap.add_argument("--scenario", default="LUBRICATION_FAILURE")
    ap.add_argument("--speed", type=float, default=4.0)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--dump", type=int, default=0,
                    help="print N frames as JSON and exit (no websocket)")
    a = ap.parse_args()

    if a.dump:
        engine = InferenceEngine.load(a.artifacts)
        for i, rec in enumerate(replay_source(Path(a.data), a.scenario)):
            f = engine.step(rec)
            if i >= a.dump:
                break
        print(json.dumps(f, indent=2, default=float))
        return

    asyncio.run(main_async(a))


if __name__ == "__main__":
    main()
