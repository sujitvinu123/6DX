"""
Person B — Step 1: surrogate baseline (residual generator).

Idhu than unga **insurance**. Twin core (Person A) varradhukku munnadi,
ithu residual kudukkum. Twin vandhaa, same interface-a vechu swap pannalaam.

    python 01_surrogate_baseline.py --data data/v1 --splits ml/splits.json \\
                                    --out ml/artifacts/surrogate

Idea:
    Healthy data la irundhu "indha condition la healthy engine enna panna
    vendum" nu kathukkudhu. Appuram:

        residual = measured - predicted

    Prediction-ku **commands + environment mattum** input. rpm, MAP, EGT —
    idhellam engine-oda RESPONSE. Adha input-a kuduthaa, fault-a model
    thaanae compensate pannidum, residual zero aagidum, entire system dead.

    Thermal channels-ku history thevai (oil temp tau ~52 s). Adhaanaala
    exogenous inputs-oda rolling means use panrom — engine outputs illa.
"""

from __future__ import annotations
import argparse
import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

EXOGENOUS = ["throttle_pct", "altitude_m", "oat_c", "ambient_pressure_kpa"]
INDEX = ["engine_id", "flight_id", "t_s", "engine_hours_h", "seq"]
GT = ["fault_class", "fault_severity", "time_to_failure_s", "health_index_true"]

ROLL_WINDOWS = [30, 120, 600]        # seconds — captures thermal history
RHO_SL = 1.225
R_AIR = 287.05


# ---------------------------------------------------------------- features

def build_inputs(df: pd.DataFrame) -> pd.DataFrame:
    """
    Exogenous-only input matrix. Grouped by flight_id so no rolling window
    ever crosses a flight boundary.
    """
    out = df[EXOGENOUS].copy()

    rho = (df.ambient_pressure_kpa * 1000.0) / (R_AIR * (df.oat_c + 273.15))
    out["air_density_ratio"] = rho / RHO_SL
    out["throttle_x_density"] = df.throttle_pct * out["air_density_ratio"]

    g = df.groupby("flight_id", sort=False)
    for w in ROLL_WINDOWS:
        out[f"throttle_mean_{w}"] = g.throttle_pct.transform(
            lambda s: s.rolling(w, min_periods=1).mean())
        out[f"alt_mean_{w}"] = g.altitude_m.transform(
            lambda s: s.rolling(w, min_periods=1).mean())
        out[f"oat_mean_{w}"] = g.oat_c.transform(
            lambda s: s.rolling(w, min_periods=1).mean())

    out["throttle_rate"] = g.throttle_pct.transform(lambda s: s.diff().fillna(0.0))
    out["time_since_start"] = g.t_s.transform(lambda s: s - s.min())
    return out


def target_columns(df: pd.DataFrame) -> list[str]:
    skip = set(EXOGENOUS + INDEX + GT)
    return [c for c in df.columns if c not in skip]


# ---------------------------------------------------------------- model

class SurrogateBaseline:
    """Healthy-behaviour predictor. Same interface the TwinCore will expose."""

    def __init__(self, targets: list[str], models: dict, input_cols: list[str],
                 resid_sigma: dict):
        self.targets = targets
        self.models = models
        self.input_cols = input_cols
        self.resid_sigma = resid_sigma      # healthy residual std per channel

    # -- the interface Person A's TwinCore must also implement --------------
    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        X = build_inputs(df)[self.input_cols]
        return pd.DataFrame(
            {t: self.models[t].predict(X) for t in self.targets},
            index=df.index)

    def residuals(self, df: pd.DataFrame, normalize: bool = True) -> pd.DataFrame:
        pred = self.predict(df)
        res = df[self.targets] - pred
        if normalize:
            for c in self.targets:
                res[c] = res[c] / max(1e-6, self.resid_sigma[c])
        return res.add_prefix("residual_")
    # ----------------------------------------------------------------------

    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path / "surrogate.joblib")
        (path / "meta.json").write_text(json.dumps({
            "type": "SurrogateBaseline",
            "targets": self.targets,
            "input_cols": self.input_cols,
            "residual_sigma": {k: round(v, 5) for k, v in self.resid_sigma.items()},
        }, indent=2))

    @staticmethod
    def load(path: Path) -> "SurrogateBaseline":
        return joblib.load(Path(path) / "surrogate.joblib")


def train(t1: pd.DataFrame, splits: dict, quiet: bool = False,
          t2: pd.DataFrame | None = None) -> SurrogateBaseline:
    """
    Healthy training pool = T1 train flights PLUS the pre-onset (genuinely
    healthy) portion of the T2 TRAIN runs. Using T1 alone leaves the surrogate
    blind to operating conditions that only appear in T2, and it then reports
    large residuals on perfectly healthy data.
    """
    tr = t1[t1.flight_id.isin(splits["T1"]["train"])]
    va = t1[t1.flight_id.isin(splits["T1"]["val"])]
    if t2 is not None:
        pre = t2[(t2.fault_severity == 0) & (t2.flight_id.isin(splits["T2"]["train"]))]
        tr = pd.concat([tr, pre], ignore_index=True)
        if not quiet:
            print(f"  healthy pool: {len(tr):,} rows "
                  f"({len(pre):,} from T2 pre-onset)")

    Xtr, Xva = build_inputs(tr), build_inputs(va)
    input_cols = list(Xtr.columns)
    targets = target_columns(t1)

    models, sigma = {}, {}
    t0 = time.time()
    for i, tgt in enumerate(targets, 1):
        m = HistGradientBoostingRegressor(
            max_iter=260, learning_rate=0.07, max_depth=None,
            min_samples_leaf=25, l2_regularization=1.0, random_state=0)
        m.fit(Xtr, tr[tgt])
        models[tgt] = m
        r = va[tgt].to_numpy() - m.predict(Xva)
        sigma[tgt] = float(np.std(r))
        if not quiet:
            rng = float(tr[tgt].max() - tr[tgt].min())
            print(f"  [{i:2d}/{len(targets)}] {tgt:22s} "
                  f"resid_sigma={sigma[tgt]:8.4f}   "
                  f"({sigma[tgt]/max(rng,1e-9)*100:5.2f}% of healthy range)")
    if not quiet:
        print(f"  trained {len(targets)} channel models in {time.time()-t0:.1f}s")

    return SurrogateBaseline(targets, models, input_cols, sigma)


# ---------------------------------------------------------------- evaluation

def evaluate(sur: SurrogateBaseline, t1: pd.DataFrame, t2: pd.DataFrame,
             splits: dict) -> None:
    print("\n" + "=" * 70)
    print("DOES THE RESIDUAL ACTUALLY SEPARATE HEALTHY FROM FAULTED?")
    print("=" * 70)

    healthy = t1[t1.flight_id.isin(splits["T1"]["test"])]
    hres = sur.residuals(healthy).abs()
    h_score = hres.mean(axis=1)
    print(f"\nHealthy test flights ({len(healthy):,} rows)")
    print(f"   mean |z| across channels : {h_score.mean():.3f}")
    print(f"   95th percentile          : {np.percentile(h_score, 95):.3f}")

    print("\nFaulted rows by class (severity > 0.5), mean |z|:")
    print(f"   {'class':24s} {'mean|z|':>9s} {'ratio':>7s}  top channels")
    rows = []
    for cls, g in t2[t2.fault_severity > 0.5].groupby("fault_class"):
        if cls == "NORMAL" or len(g) < 50:
            continue
        g = g.sample(min(2500, len(g)), random_state=0)
        r = sur.residuals(g).abs()
        score = r.mean(axis=1).mean()
        top = r.mean(axis=0).nlargest(3)
        tops = ", ".join(f"{c.replace('residual_','')}({v:.0f})"
                         for c, v in top.items())
        rows.append((cls, score, score / h_score.mean(), tops))
    for cls, s, ratio, tops in sorted(rows, key=lambda x: -x[2]):
        print(f"   {cls:24s} {s:9.2f} {ratio:6.1f}x  {tops}")

    print("\nSANITY: sensor-only faults must move ONE channel, engine faults many.")
    for cls in ("SENSOR_DRIFT", "LUBRICATION_FAILURE"):
        g = t2[(t2.fault_class == cls) & (t2.fault_severity > 0.6)]
        if not len(g):
            continue
        r = sur.residuals(g.sample(min(1500, len(g)), random_state=0)).abs()
        ch = r.mean(axis=0)
        n_hot = int((ch > 4.0).sum())
        print(f"   {cls:22s} channels with mean|z| > 4 : {n_hot:2d} / {len(ch)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/v1")
    ap.add_argument("--splits", default="ml/splits.json")
    ap.add_argument("--out", default="ml/artifacts/surrogate")
    a = ap.parse_args()

    d = Path(a.data)
    t1 = pd.read_csv(d / "T1_healthy.csv")
    t2 = pd.read_csv(d / "T2_degradation.csv")
    splits = json.loads(Path(a.splits).read_text())

    print("Training surrogate baseline on healthy flights only...")
    sur = train(t1, splits, t2=t2)
    sur.save(Path(a.out))
    evaluate(sur, t1, t2, splits)
    print(f"\nsaved → {a.out}/surrogate.joblib")


if __name__ == "__main__":
    main()
