"""
Person B — Step 6: InferenceEngine.

Idhu than unga FINAL deliverable. Backend person ithu mattum use pannuvaanga:

    from inference import InferenceEngine

    engine = InferenceEngine.load("artifacts/")
    for record in can_stream:
        frame = engine.step(record)      # dict in -> tick frame dict out
        websocket.broadcast(frame)

Andha `frame` exactly `frontend_data_contract.md`-la irukkura tick frame.
`mock_stream_server.py`-oda `build_tick()` enna return pannudho, adhae.

STATEFUL. Ovvoru flight-kum rolling buffer ulla maintain aagum, because
30 s / 5 min window features-ku history thevai. Backend ovvoru tick-kum
call pannuvaanga, history ingaye irukkum.

Pipeline ovvoru step-lum:
    raw record
      -> surrogate predicts the healthy engine
      -> residual = measured - predicted, in sigma units
      -> windowed features
      -> Model 1 gate: anomaly?   illa-na healthy frame, mudinjudhu
      -> Model 2: which fault + physics rules
      -> Model 3: RUL (engine faults only; sensor faults get null)
      -> health indices, advisory, tick frame

    python inference.py --replay <flight_id> --data . --features features
"""

from __future__ import annotations
import argparse
import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import importlib.util as _il


def _load(name, fname):
    spec = _il.spec_from_file_location(name, Path(__file__).with_name(fname))
    mod = _il.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_sur = _load("sur", "01_surrogate_baseline.py")
_feat = _load("feat", "02_features.py")
_m1 = _load("m1", "03_model1_anomaly.py")
_m2 = _load("m2", "04_model2_fault.py")
_m3 = _load("m3", "05_model3_rul.py")

# The training scripts ran as __main__, so joblib recorded their classes under
# that name. Re-register them here or every load fails with AttributeError.
import sys as _sys
_main = _sys.modules["__main__"]
for _mod, _names in ((_sur, ["SurrogateBaseline"]), (_m1, ["AnomalyModel"]),
                     (_m2, ["FaultModel"]), (_m3, ["RulModel"])):
    for _n in _names:
        if not hasattr(_main, _n):
            setattr(_main, _n, getattr(_mod, _n))

SCHEMA_VERSION = "1.0.0"
BUFFER_S = 620                 # enough for the 300 s windows plus margin
DEBOUNCE_S = 30
SENSOR_CLASSES = {"SENSOR_DRIFT", "SENSOR_FAILURE"}

SUBSYSTEM = {
    "combustion": ["egt_1_c", "egt_2_c", "egt_3_c", "egt_4_c",
                   "injection_timing_deg", "fuel_flow_lph"],
    "lubrication": ["oil_pressure_bar", "oil_temp_c"],
    "thermal": ["cht_1_c", "cht_2_c", "cht_3_c", "cht_4_c", "coolant_temp_c"],
    "mechanical": ["vib_rms_g", "vib_1x_g", "vib_high_g", "vib_kurtosis", "rpm"],
    "electrical": ["battery_voltage_v", "alternator_current_a"],
}

ADVISORY_TEXT = {
    "LUBRICATION_FAILURE": "Oil pressure degrading. Reduce power and divert to nearest recovery site.",
    "BEARING_WEAR": "Bearing wear detected. Avoid high power settings, schedule inspection.",
    "MISFIRE": "Cylinder misfire. Reduce power, expect vibration. Land at nearest suitable site.",
    "INJECTOR_ABNORMALITY": "Injector fault on one cylinder. Monitor EGT spread, plan inspection.",
    "COOLING_DEGRADATION": "Cooling performance degrading. Reduce power, descend if temperatures rise.",
    "INTAKE_RESTRICTION": "Induction restriction. Power available is reduced; plan a lower cruise.",
    "FUEL_SYSTEM_FAULT": "Fuel delivery pressure low. Switch tanks/pumps if available, land soon.",
    "COMBUSTION_INSTABILITY": "Unstable combustion. Reduce power and avoid rapid throttle changes.",
    "ELECTRICAL_FAULT": "Charging system fault. Shed electrical load, expect battery-only endurance.",
    "SENSOR_DRIFT": "Sensor reading suspect. Engine parameters nominal. Disregard that indication.",
    "SENSOR_FAILURE": "Sensor not responding. Engine parameters nominal. Disregard that indication.",
}


def _health(resid_abs: pd.Series) -> dict:
    """Map residual magnitude to a 0-100 score per subsystem."""
    h = {}
    for sub, chans in SUBSYSTEM.items():
        vals = [abs(resid_abs.get(c, 0.0)) for c in chans]
        m = float(np.mean(vals)) if vals else 0.0
        h[sub] = round(float(100.0 * np.exp(-m / 12.0)), 1)
    h["overall_index"] = round(min(h.values()), 1)
    return h


class InferenceEngine:
    def __init__(self, sur, model1, model2, model3, floors):
        self.sur, self.model1, self.model2, self.model3 = sur, model1, model2, model3
        self.floors = floors
        self._buf: dict[str, deque] = {}
        self._run: dict[str, int] = {}

    @staticmethod
    def load(artifacts: str | Path) -> "InferenceEngine":
        a = Path(artifacts)
        floors_p = a / "noise_floors.json"
        floors = json.loads(floors_p.read_text()) if floors_p.exists() else {}
        return InferenceEngine(
            _sur.SurrogateBaseline.load(a / "surrogate"),
            joblib.load(a / "model1" / "model1.joblib"),
            joblib.load(a / "model2" / "model2.joblib"),
            joblib.load(a / "model3" / "model3.joblib"),
            floors)

    # ------------------------------------------------------------------ core
    def step(self, record: dict) -> dict:
        fid = record.get("flight_id", "unknown")
        buf = self._buf.setdefault(fid, deque(maxlen=BUFFER_S))
        buf.append(dict(record))

        df = pd.DataFrame(list(buf))
        df = _feat.build(df, self.sur)          # residuals + windowed features
        row = df.iloc[[-1]]
        raw = df_raw = pd.DataFrame(list(buf))

        # ---- Model 1 gate ---------------------------------------------
        score = float(self.model1.score(row)[0])
        thr = float(self.model1.threshold)
        above = score > thr
        run = self._run.get(fid, 0)
        run = run + 1 if above else 0
        self._run[fid] = run

        frozen = self._frozen_channels(df_raw)
        detected = bool(run >= DEBOUNCE_S or frozen)

        # feature columns are named residual_<channel>_now; the contract wants
        # the bare channel name, and the residuals block below looks them up by
        # that name — leaving the prefix on silently zeroes the whole block.
        resid_now = row.filter(like="_now").iloc[0]
        resid_now.index = [c[len("residual_"):-len("_now")]
                           for c in resid_now.index]
        health = _health(resid_now)

        fault = rul = None
        advisory = {"severity": "NORMAL", "message": "All systems nominal.",
                    "action_by_min": None}
        sensor_health = {"all_valid": not frozen,
                         "suspect_channels": list(frozen)}

        if detected:
            fault, rul, advisory, sensor_health = self._diagnose(
                row, resid_now, frozen, health)

        return self._frame(record, row, resid_now, health, score, thr, run,
                           detected, fault, rul, advisory, sensor_health)

    # ------------------------------------------------------------- internals
    def _frozen_channels(self, raw: pd.DataFrame) -> list[str]:
        out = []
        if len(raw) < 25:
            return out
        for c, floor in self.floors.items():
            if c in raw.columns:
                sd = float(raw[c].tail(60).std())
                if sd < floor:
                    out.append(c)
        return out

    def _diagnose(self, row, resid_now, frozen, health):
        cls_arr, conf_arr, _ = self.model2.predict(row)
        cls, conf = str(cls_arr[0]), float(conf_arr[0])

        # physics cross-check: only a couple of channels deviating means the
        # sensor is wrong, not the engine
        looks_sensor = bool(_m2.sensor_or_engine(row)[0]) or bool(frozen)
        if frozen and cls not in SENSOR_CLASSES:
            cls, conf = "SENSOR_FAILURE", max(conf, 0.90)

        contrib = resid_now.abs().sort_values(ascending=False).head(3)
        total = float(resid_now.abs().sum()) or 1.0
        fault = {
            "class": cls,
            "confidence": round(conf, 3),
            "co_occurrence": bool((resid_now.abs() > 8).sum() > 12),
            "top_contributors": [
                {"channel": k, "contribution": round(float(v) / total, 3),
                 "residual": round(float(resid_now[k]), 3)}
                for k, v in contrib.items()],
        }

        rul = None
        if cls not in SENSOR_CLASSES:
            fc = pd.Series([cls], index=row.index)
            p10, p50, p90 = self.model3.predict(row, fault_class=fc)
            if not np.isnan(p50[0]):
                rul = {"minutes": int(round(float(p50[0]))),
                       "p10": int(round(float(p10[0]))),
                       "p90": int(round(float(p90[0]))),
                       "valid": True}

        sev = self._severity(health["overall_index"], rul)
        advisory = {
            "severity": sev,
            "message": ADVISORY_TEXT.get(cls, "Anomaly detected. Monitor engine."),
            "action_by_min": (rul["p10"] if rul else None),
        }
        sensor_health = {
            "all_valid": not (frozen or cls in SENSOR_CLASSES),
            "suspect_channels": list(frozen) or (
                [fault["top_contributors"][0]["channel"]]
                if cls in SENSOR_CLASSES else []),
        }
        return fault, rul, advisory, sensor_health

    @staticmethod
    def _severity(overall: float, rul) -> str:
        if rul and rul["p10"] <= 5:
            return "CRITICAL"
        if overall < 40 or (rul and rul["p10"] <= 15):
            return "WARNING"
        if overall < 70:
            return "CAUTION"
        return "ADVISORY"

    def _frame(self, record, row, resid_now, health, score, thr, run,
               detected, fault, rul, advisory, sensor_health) -> dict:
        chans = self.sur.targets
        measured = {c: round(float(record[c]), 3) for c in record
                    if c in chans or c in _sur.EXOGENOUS}
        pred = self.sur.predict(pd.DataFrame([record]))
        predicted = {c: round(float(pred[c].iloc[0]), 3) for c in chans}
        residuals = {c: round(float(resid_now.get(c, 0.0)), 3) for c in chans}
        r = row.iloc[0]
        return {
            "type": "tick",
            "schema_version": SCHEMA_VERSION,
            "meta": {
                "engine_id": record.get("engine_id"),
                "flight_id": record.get("flight_id"),
                "t_s": float(record.get("t_s", 0.0)),
                "engine_hours_h": float(record.get("engine_hours_h", 0.0)),
                "seq": int(record.get("seq", 0)),
                "wall_clock": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            },
            "measured": measured,
            "predicted": predicted,
            "residuals": residuals,
            "derived": {
                "cht_max_c": round(float(max(record[f"cht_{i}_c"] for i in range(1, 5))), 2),
                "egt_spread_z": round(float(r["egt_spread_z"]), 2),
                "cht_spread_z": round(float(r["cht_spread_z"]), 2),
                "mean_abs_z": round(float(r["mean_abs_z"]), 3),
                "n_hot_4": int(r["n_hot_4"]),
            },
            "health": health,
            "anomaly": {"detected": detected, "score": round(score, 3),
                        "threshold": round(thr, 3), "confirmed_for_s": int(run)},
            "fault": fault,
            "rul": rul,
            "advisory": advisory,
            "sensor_health": sensor_health,
        }


# ------------------------------------------------------------------ replay

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", default="artifacts")
    ap.add_argument("--data", default=".")
    ap.add_argument("--flight", default=None)
    ap.add_argument("--every", type=int, default=60)
    ap.add_argument("--limit", type=int, default=0,
                    help="stop after N ticks (0 = whole run)")
    a = ap.parse_args()

    eng = InferenceEngine.load(a.artifacts)
    t2 = pd.read_csv(Path(a.data) / "T2_degradation.csv")
    fid = a.flight or t2[t2.fault_class == "LUBRICATION_FAILURE"].flight_id.iloc[0]
    run = t2[t2.flight_id == fid].sort_values("t_s")
    truth = run[run.fault_class != "NORMAL"].fault_class.iloc[0]
    onset = float(run[run.fault_severity > 0].t_s.min())
    print(f"replaying {fid}   truth={truth}   onset={onset:.0f}s   "
          f"{len(run)} ticks\n")

    drop = ["fault_class", "fault_severity", "time_to_failure_s",
            "health_index_true"]
    first_alarm = None
    print(f"{'t_s':>6} {'health':>7} {'score':>7} {'det':>4} "
          f"{'fault':>22} {'conf':>5} {'RUL(p10-p90)':>16} {'sev':>9}")
    if a.limit:
        run = run.head(a.limit)
    for _, r in run.iterrows():
        rec = {k: v for k, v in r.to_dict().items() if k not in drop}
        f = eng.step(rec)
        if f["anomaly"]["detected"] and first_alarm is None:
            first_alarm = f["meta"]["t_s"]
        if int(r.t_s) % a.every == 0 or (first_alarm == f["meta"]["t_s"]):
            fa = f["fault"]["class"] if f["fault"] else "-"
            cf = f"{f['fault']['confidence']:.2f}" if f["fault"] else "-"
            ru = (f"{f['rul']['minutes']} ({f['rul']['p10']}-{f['rul']['p90']})"
                  if f["rul"] else "-")
            print(f"{f['meta']['t_s']:6.0f} {f['health']['overall_index']:7.1f} "
                  f"{f['anomaly']['score']:7.2f} "
                  f"{str(f['anomaly']['detected']):>4} {fa:>22} {cf:>5} "
                  f"{ru:>16} {f['advisory']['severity']:>9}")

    if first_alarm is None:
        print("\nno alarm raised in the replayed window")
    else:
        print(f"\nfirst alarm at t={first_alarm:.0f}s, "
              f"{(first_alarm - onset):.0f}s after fault onset")
    print("\nlast frame keys:", list(f.keys()))


if __name__ == "__main__":
    main()
