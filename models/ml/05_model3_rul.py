"""
Person B — Step 5: Model 3, Remaining Useful Life.

"Innum evlo neram irukku" nu sollum. Moonu model-la ithu than kashtam.

    python 05_model3_rul.py --features features --splits splits.json \\
           --out artifacts/model3

Naalu design decision:

1. PIECEWISE-LINEAR LABEL
   Fault aarambikkura munnadi RUL-a predict panna mudiyaadhu — onnume
   degrade aagala, signal-e illa. Adhaanaala label-a oru horizon-la cap
   pannurom. Model "romba dooram irukku" nu sollum, appuram countdown
   aarambikkum. Idhu C-MAPSS-oda standard treatment.

2. FAULT CLASS ORU FEATURE
   Lubrication failure exponential-a odum, cooling degradation mani
   kanakku-la ooradum. Degradation dynamics fault-a poruthu vera.
   Workflow doc-la "fault-class-wise separate heads" nu sonnom, aana
   oru class-ku 4-5 runs than irukku — head-ku data podhaadhu. Adhaanaala
   oru model, fault class-a one-hot feature-a kudukkurom. Same information,
   data-va share pannudhu.

3. QUANTILE REGRESSION
   "38 nimisham" podhaadhu. Operator-ku "38 (P10 24, P90 57)" venum.
   Thirumbi porathukku decision P10 vechu than edukkuvaanga.

4. SENSOR FAULT-KU RUL ILLA
   Sensor keduthaa engine nalla irukku. RUL meaningless. null return
   pannum — frontend contract-lum adhae.
"""

from __future__ import annotations
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

try:
    from xgboost import XGBRegressor
    HAVE_XGB = True
except ImportError:
    from sklearn.ensemble import GradientBoostingRegressor
    HAVE_XGB = False

INDEX = ["engine_id", "flight_id", "t_s", "engine_hours_h"]
LABELS = ["fault_class", "fault_severity", "time_to_failure_s", "health_index_true"]
SENSOR_CLASSES = ["SENSOR_DRIFT", "SENSOR_FAILURE"]
RUL_CAP_S = 600.0          # 10 min horizon; beyond this we only say "far away"
MIN_SEVERITY = 0.05
QUANTILES = [0.1, 0.5, 0.9]


def piecewise_label(ttf_s: np.ndarray) -> np.ndarray:
    """Cap the label. Early on there is no signal, so asking the model to
    predict 900 s exactly just teaches it noise."""
    return np.minimum(ttf_s, RUL_CAP_S)


def asymmetric_score(err_min: np.ndarray) -> float:
    """
    err = predicted - actual, in minutes.
    Predicting MORE time than there really is (err > 0) is the dangerous
    direction: the operator keeps flying. Penalise it harder.
    """
    return float(np.mean(np.where(err_min > 0,
                                  np.exp(err_min / 6.0) - 1.0,
                                  np.exp(-err_min / 13.0) - 1.0)))


class RulModel:
    """
    Quantile regressor plus a single interval-width correction.

    The raw P10-P90 band only covers ~66% of cases instead of 80%, so the
    model understates its own uncertainty. Fix: widen the band by one scalar
    factor, fitted on the validation runs to hit the target coverage.

    A per-class correction (separate median shift and offsets for each fault
    mode) was tried first and made everything worse - coverage fell to 41%.
    With only ~1 validation run per fault class there is nothing to estimate
    from, so the "correction" was fitting noise. One global parameter over
    5,700 validation rows is estimable; nine per-class ones are not.
    """

    def __init__(self, models, cols, classes, calib=None):
        self.models, self.cols, self.classes = models, cols, list(classes)
        self.calib = calib or {}

    def _X(self, f: pd.DataFrame, fault_class: pd.Series | None = None):
        X = f[self.cols].copy()
        fc = f["fault_class"] if fault_class is None else fault_class
        for c in self.classes:
            X[f"is_{c}"] = (fc == c).astype(int).to_numpy()
        return X

    def predict(self, f: pd.DataFrame, fault_class: pd.Series | None = None,
                calibrated: bool = True):
        """Returns (p10, p50, p90) in MINUTES. NaN for sensor faults."""
        X = self._X(f, fault_class)
        out = {q: self.models[q].predict(X) / 60.0 for q in QUANTILES}
        p10, p50, p90 = out[0.1].copy(), out[0.5].copy(), out[0.9].copy()
        p10, p90 = np.minimum(p10, p50), np.maximum(p90, p50)

        if calibrated and self.calib:
            k = self.calib.get("width", 1.0)
            p10 = p50 - k * (p50 - p10)
            p90 = p50 + k * (p90 - p50)
        fc = (f["fault_class"] if fault_class is None else fault_class).to_numpy()
        sensor = np.isin(fc, SENSOR_CLASSES)
        for arr in (p10, p50, p90):
            arr[sensor] = np.nan
        return np.maximum(p10, 0), np.maximum(p50, 0), np.maximum(p90, 0)

    def save(self, p: Path):
        p.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, p / "model3.joblib")

    @staticmethod
    def load(p: Path):
        return joblib.load(Path(p) / "model3.joblib")


def fit_quantile(X, y, q, Xval, yval):
    if HAVE_XGB:
        m = XGBRegressor(
            n_estimators=600, max_depth=6, learning_rate=0.05,
            subsample=0.85, colsample_bytree=1.0, reg_lambda=1.5,
            objective="reg:quantileerror", quantile_alpha=q,
            tree_method="hist", n_jobs=-1, random_state=0,
            early_stopping_rounds=50)
        m.fit(X, y, eval_set=[(Xval, yval)], verbose=False)
    else:
        m = GradientBoostingRegressor(loss="quantile", alpha=q,
                                      n_estimators=400, max_depth=5,
                                      learning_rate=0.05, random_state=0)
        m.fit(X, y)
    return m


def evaluate(model: RulModel, split: pd.DataFrame, name: str) -> dict:
    p10, p50, p90 = model.predict(split)
    actual = piecewise_label(split.time_to_failure_s.to_numpy()) / 60.0
    ok = ~np.isnan(p50)
    if ok.sum() == 0:
        return {}

    err = p50[ok] - actual[ok]
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err ** 2)))
    cover = float(((actual[ok] >= p10[ok]) & (actual[ok] <= p90[ok])).mean())
    late = float((err > 0).mean())

    print(f"\n{name}   ({int(ok.sum()):,} rows with a valid RUL)")
    print(f"   MAE                    {mae:6.2f} min")
    print(f"   RMSE                   {rmse:6.2f} min")
    print(f"   asymmetric score       {asymmetric_score(err):6.3f}  (lower better)")
    print(f"   P10–P90 coverage       {100*cover:5.1f}%   (target ~80%)")
    print(f"   optimistic predictions {100*late:5.1f}%   (predicted MORE time "
          f"than there was)")
    return {"mae_min": round(mae, 3), "rmse_min": round(rmse, 3),
            "coverage": round(cover, 3), "optimistic_frac": round(late, 3),
            "asym": round(asymmetric_score(err), 3)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", default="features")
    ap.add_argument("--splits", default="splits.json")
    ap.add_argument("--out", default="artifacts/model3")
    a = ap.parse_args()

    F = Path(a.features)
    p = F / "T2_features.parquet"
    f2 = pd.read_parquet(p) if p.exists() else pd.read_csv(F / "T2_features.csv")
    splits = json.loads(Path(a.splits).read_text())

    # RUL only makes sense once a real engine fault has started.
    d = f2[(f2.fault_class != "NORMAL") &
           (~f2.fault_class.isin(SENSOR_CLASSES)) &
           (f2.fault_severity >= MIN_SEVERITY) &
           (f2.time_to_failure_s > 0)].copy()

    cols = [c for c in d.columns if c not in INDEX + LABELS]
    classes = sorted(d.fault_class.unique())

    tr = d[d.flight_id.isin(splits["T2"]["train"])]
    va = d[d.flight_id.isin(splits["T2"]["val"])]
    te = d[d.flight_id.isin(splits["T2"]["test"])]
    ho = d[d.flight_id.isin(splits["T2"]["holdout_engine"])]
    print(f"features {len(cols)} + {len(classes)} class flags")
    print(f"train {len(tr):,}  val {len(va):,}  test {len(te):,}  "
          f"holdout-engine {len(ho):,}")
    print(f"label capped at {RUL_CAP_S/60:.0f} min")

    stub = RulModel({}, cols, classes)
    Xtr, Xva = stub._X(tr), stub._X(va)
    ytr = piecewise_label(tr.time_to_failure_s.to_numpy())
    yva = piecewise_label(va.time_to_failure_s.to_numpy())

    models = {}
    for q in QUANTILES:
        models[q] = fit_quantile(Xtr, ytr, q, Xva, yva)
        print(f"  fitted quantile {q}")
    model = RulModel(models, cols, classes)

    # ---- interval-width calibration on the VALIDATION runs --------------
    p10v, p50v, p90v = model.predict(va, calibrated=False)
    actv = piecewise_label(va.time_to_failure_s.to_numpy()) / 60.0
    best_k, best_gap = 1.0, 9e9
    for k in np.arange(1.0, 6.01, 0.1):
        lo = p50v - k * (p50v - p10v)
        hi = p50v + k * (p90v - p50v)
        cov = float(((actv >= lo) & (actv <= hi)).mean())
        if abs(cov - 0.80) < best_gap:
            best_k, best_gap = float(k), abs(cov - 0.80)
    model.calib = {"width": best_k}
    print(f"\ninterval width factor fitted on validation: {best_k:.1f}x "
          f"(target 80% coverage)")

    print("\n" + "=" * 70)
    print("MODEL 3 — RUL")
    print("=" * 70)
    m_te = evaluate(model, te, "TEST (unseen runs)")
    m_ho = evaluate(model, ho, "HOLDOUT ENGINE (never seen)")

    # per fault class
    p10, p50, p90 = model.predict(te)
    act = piecewise_label(te.time_to_failure_s.to_numpy()) / 60.0
    tbl = pd.DataFrame({"cls": te.fault_class.to_numpy(),
                        "err": p50 - act,
                        "cov": (act >= p10) & (act <= p90)})
    print("\nper fault class (test):")
    g = tbl.groupby("cls").agg(rows=("err", "size"),
                               mae_min=("err", lambda s: np.mean(np.abs(s))),
                               bias_min=("err", "mean"),
                               coverage=("cov", "mean"))
    print(g.round(2).to_string())

    # how good is it when it matters — close to failure
    print("\naccuracy as failure approaches (test):")
    for lo, hi in ((0, 5), (5, 10), (10, 11)):
        m = (act >= lo) & (act < hi)
        if m.sum():
            print(f"   actual RUL {lo:2d}–{hi:2d} min : {int(m.sum()):6,} rows   "
                  f"MAE {np.mean(np.abs(p50[m]-act[m])):5.2f} min   "
                  f"optimistic {100*np.mean(p50[m] > act[m]):4.1f}%")

    out = Path(a.out)
    model.save(out)
    (out / "metrics.json").write_text(json.dumps(
        {"cap_min": RUL_CAP_S / 60, "test": m_te, "holdout_engine": m_ho},
        indent=2))
    print(f"\nsaved → {out}/model3.joblib")


if __name__ == "__main__":
    main()
