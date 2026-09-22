"""
Person B — Step 3: Model 1, anomaly detection.

Idhu than mudhal ACTUAL model. Healthy data mattum paathu train aagudhu.
Fault-a paakkave paakkaadhu — adhaanaala edhirpaakkaadha puthu fault kooda
pidikkum.

    python 03_model1_anomaly.py --features features --splits splits.json \\
           --data "E:\\SIH26\\ML" --out artifacts/model1

Moonu vishayam pannudhu:

1. FROZEN SENSOR FIX
   Frozen channel residual la theriyaadhu — kadaisi healthy value-la nikkum.
   Aana healthy sensor eppavum konjam move aagum. Rolling variance ~0 aana,
   adhu frozen. Idhu learned model illa, explicit check.

2. THRESHOLD CALIBRATION
   F1 vechu threshold set panna KOODAADHU. Healthy holdout la
   "oru flight hour-ku evlo false alarm" nu vechu set pannanum. Operator
   accept panra number adhu than.

3. LEAD TIME
   Namma detector eppo fire aagudhu vs conventional threshold alarm eppo
   fire aagum. Andha difference than unga headline number.
"""

from __future__ import annotations
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.covariance import MinCovDet
from sklearn.ensemble import IsolationForest

# Rotax 912 iS limits — conventional threshold alarm baseline
LIMITS = {
    "rpm":                  (1400, 5800, "high"),
    "cht_1_c":              (None, 135, "high"), "cht_2_c": (None, 135, "high"),
    "cht_3_c":              (None, 135, "high"), "cht_4_c": (None, 135, "high"),
    "egt_1_c":              (None, 900, "high"), "egt_2_c": (None, 900, "high"),
    "egt_3_c":              (None, 900, "high"), "egt_4_c": (None, 900, "high"),
    "coolant_temp_c":       (None, 120, "high"),
    "oil_temp_c":           (None, 130, "high"),
    "oil_pressure_bar":     (0.8, None, "low"),
    "fuel_pressure_bar":    (1.8, None, "low"),
    "vib_rms_g":            (None, 5.0, "high"),
    "battery_voltage_v":    (11.8, None, "low"),
    "alternator_current_a": (None, 32, "high"),
}

DEBOUNCE_S = 30                  # consecutive seconds above threshold
TARGET_FA_PER_HOUR = 0.10        # one false alarm per 10 flight hours
FROZEN_WINDOW = 60
FROZEN_EPS = 1e-4

RAW_CHANNELS = [c for c in LIMITS] + ["map_kpa", "fuel_flow_lph",
                                      "injection_timing_deg", "vib_high_g"]


# ---------------------------------------------------------------- frozen check

def learn_noise_floor(raw_healthy: pd.DataFrame) -> dict:
    """
    Each channel has its own natural jitter. A fixed threshold flags a quiet
    channel as frozen and a noisy one as never frozen. Learn the healthy
    rolling-std distribution instead and call it frozen only well below it.
    """
    floors = {}
    g = raw_healthy.groupby("flight_id", sort=False)
    for c in RAW_CHANNELS:
        if c not in raw_healthy.columns:
            continue
        sd = g[c].transform(lambda s: s.rolling(FROZEN_WINDOW, min_periods=20).std())
        sdv = sd.dropna()
        # If a channel sits still even when healthy, a "frozen" test on it is
        # meaningless and will fire constantly. Exclude it.
        if float((sdv <= 1e-9).mean()) > 0.02:
            continue
        floors[c] = max(1e-9, 0.25 * float(np.nanpercentile(sdv, 1)))
    return floors


def frozen_flags(raw: pd.DataFrame, floors: dict) -> pd.DataFrame:
    """A live sensor always jitters. Rolling std far below its own healthy
    noise floor = frozen."""
    out = {}
    g = raw.groupby("flight_id", sort=False)
    for c in RAW_CHANNELS:
        if c not in raw.columns or c not in floors:
            continue
        sd = g[c].transform(lambda s: s.rolling(FROZEN_WINDOW, min_periods=20).std())
        out[f"frozen_{c}"] = (sd.fillna(1.0) < floors[c]).astype(int)
    df = pd.DataFrame(out, index=raw.index)
    df["n_frozen"] = df.sum(axis=1)
    return df


# ---------------------------------------------------------------- scorers

SCORE_COLS = ["mean_abs_z", "max_abs_z", "n_hot_2", "n_hot_4",
              "hot_concentration", "egt_spread_z", "cht_spread_z"]


def window_cols(f: pd.DataFrame) -> list[str]:
    return [c for c in f.columns if c.endswith("_m30") or c.endswith("_m300")]


class AnomalyModel:
    def __init__(self, method, cols, threshold, extra=None):
        self.method, self.cols, self.threshold = method, cols, threshold
        self.extra = extra or {}

    def score(self, f: pd.DataFrame) -> np.ndarray:
        if self.method == "simple":
            return f["mean_abs_z"].to_numpy()
        if self.method == "mahalanobis":
            d = f[self.cols].to_numpy() - self.extra["mu"]
            return np.sqrt(np.einsum("ij,jk,ik->i", d, self.extra["inv"], d))
        return -self.extra["iforest"].score_samples(f[self.cols])

    def save(self, p: Path):
        p.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, p / "model1.joblib")

    @staticmethod
    def load(p: Path):
        return joblib.load(Path(p) / "model1.joblib")


def fit_all(tr: pd.DataFrame) -> dict:
    wc = window_cols(tr)
    models = {}

    models["simple"] = AnomalyModel("simple", ["mean_abs_z"], None)

    X = tr[wc].to_numpy()
    mcd = MinCovDet(support_fraction=0.9, random_state=0).fit(
        X[np.random.default_rng(0).choice(len(X), min(6000, len(X)), replace=False)])
    models["mahalanobis"] = AnomalyModel(
        "mahalanobis", wc, None,
        {"mu": mcd.location_, "inv": np.linalg.pinv(mcd.covariance_)})

    iso = IsolationForest(n_estimators=250, contamination=1e-4,
                          random_state=0, n_jobs=-1).fit(tr[SCORE_COLS])
    models["iforest"] = AnomalyModel("iforest", SCORE_COLS, None, {"iforest": iso})
    return models


def calibrate(model: AnomalyModel, healthy_val: pd.DataFrame) -> float:
    """Pick the threshold that yields the target false-alarm rate on healthy data."""
    s = model.score(healthy_val)
    hours = len(healthy_val) / 3600.0
    allowed = max(1, int(TARGET_FA_PER_HOUR * hours * DEBOUNCE_S))
    q = 1.0 - allowed / len(s)
    return float(np.quantile(s, min(0.99999, q)))


def debounce(flags: np.ndarray, n: int = DEBOUNCE_S) -> np.ndarray:
    """True only after n consecutive True samples."""
    out = np.zeros_like(flags, dtype=bool)
    run = 0
    for i, v in enumerate(flags):
        run = run + 1 if v else 0
        out[i] = run >= n
    return out


# ---------------------------------------------------------------- evaluation

def threshold_alarm_time(raw_run: pd.DataFrame) -> float:
    """When a conventional limit-based alarm would first fire. inf = never."""
    first = np.inf
    for ch, (lo, hi, direction) in LIMITS.items():
        if ch not in raw_run.columns:
            continue
        v = raw_run[ch].to_numpy()
        bad = v <= lo if direction == "low" else v >= hi
        bad = debounce(bad, 5)
        if bad.any():
            first = min(first, float(raw_run.t_s.to_numpy()[bad.argmax()]))
    return first


def evaluate(model: AnomalyModel, name: str, f2: pd.DataFrame, raw2: pd.DataFrame,
             healthy_test: pd.DataFrame, frozen2: pd.DataFrame) -> dict:
    """healthy_test must be data never used for fitting or calibration."""
    s = model.score(healthy_test)
    fa = debounce(s > model.threshold).sum() / (len(healthy_test) / 3600.0)

    rows, detected, total, contaminated = [], 0, 0, 0
    for fid, g in f2.groupby("flight_id", sort=False):
        onset = g.loc[g.fault_severity > 0, "t_s"]
        if onset.empty:
            continue
        onset = onset.min()
        total += 1

        sc = model.score(g)
        fired = debounce(sc > model.threshold)
        frozen = frozen2.loc[g.index, "n_frozen"].to_numpy() > 0
        fired = fired | debounce(frozen, 10)          # frozen-sensor path

        t = g.t_s.to_numpy()
        if fired[np.searchsorted(t, onset)]:
            contaminated += 1          # already alarming before the fault began
            continue
        post = fired & (t >= onset)
        if not post.any():
            continue
        detected += 1
        t_det = float(t[post.argmax()])

        t_thr = threshold_alarm_time(raw2[raw2.flight_id == fid])
        run_end = float(t[-1])
        # If a conventional alarm never fires at all inside the run, the lead
        # time is at least the remaining run length. That is a floor, not a NaN.
        lead = ((t_thr if np.isfinite(t_thr) else run_end) - t_det) / 60.0
        sev_at_det = float(g.fault_severity.to_numpy()[post.argmax()])
        rows.append({"flight_id": fid, "cls": g.fault_class.iloc[-1],
                     "t_det": t_det - onset, "lead_min": lead,
                     "sev_at_det": sev_at_det,
                     "thr_fired": bool(np.isfinite(t_thr))})

    r = pd.DataFrame(rows)
    lead = r.lead_min.dropna()
    n_thr_never = int((~r.thr_fired).sum()) if len(r) else 0
    res = {
        "method": name,
        "threshold": round(model.threshold, 4),
        "false_alarms_per_hour": round(float(fa), 4),
        "detection_rate": round(detected / max(1, total), 4),
        "median_detect_delay_s": round(float(r.t_det.median()), 1) if len(r) else None,
        "median_lead_min": round(float(lead.median()), 1) if len(lead) else None,
        "median_severity_at_detection": round(float(r.sev_at_det.median()), 3) if len(r) else None,
        "runs_threshold_never_fired": n_thr_never,
        "runs_total": total,
        "runs_alarming_before_onset": contaminated,
    }
    return res, r


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", default="features")
    ap.add_argument("--data", default=".")
    ap.add_argument("--splits", default="splits.json")
    ap.add_argument("--out", default="artifacts/model1")
    a = ap.parse_args()

    F = Path(a.features)

    def read(stem):
        p = F / f"{stem}.parquet"
        return pd.read_parquet(p) if p.exists() else pd.read_csv(F / f"{stem}.csv")

    f1, f2 = read("T1_features"), read("T2_features")
    splits = json.loads(Path(a.splits).read_text())
    raw2 = pd.read_csv(Path(a.data) / "T2_degradation.csv").sort_values(
        ["flight_id", "t_s"]).reset_index(drop=True)

    tr = f1[f1.flight_id.isin(splits["T1"]["train"])]
    va = f1[f1.flight_id.isin(splits["T1"]["val"])]
    te = f1[f1.flight_id.isin(splits["T1"]["test"])]
    print(f"train {len(tr):,}   val {len(va):,}   test {len(te):,}  (healthy only)")

    print("\nlearning per-channel noise floors from healthy data...")
    raw1 = pd.read_csv(Path(a.data) / "T1_healthy.csv").sort_values(
        ["flight_id", "t_s"]).reset_index(drop=True)
    floors = learn_noise_floor(raw1[raw1.flight_id.isin(splits["T1"]["train"])])
    frozen1 = frozen_flags(raw1, floors)
    fa_frozen = float((frozen1.n_frozen > 0).mean())
    print(f"  false 'frozen' rate on healthy data: {fa_frozen*100:.3f}%  "
          f"(must be near zero)")
    frozen2 = frozen_flags(raw2, floors)
    print(f"  T2 rows with a frozen channel: {int((frozen2.n_frozen>0).sum()):,} "
          f"({(frozen2.n_frozen>0).mean()*100:.1f}%)")

    # Healthy calibration pool: T1 val + the pre-onset (genuinely healthy)
    # portion of the T2 TRAIN runs. Calibrating on 3 flights alone gives an
    # optimistic threshold and the detector then fires before fault onset.
    pre_train = f2[(f2.fault_severity == 0) &
                   (f2.flight_id.isin(splits["T2"]["train"]))]
    cal = pd.concat([va, pre_train], ignore_index=True)
    print(f"\ncalibration pool: {len(va):,} T1-val + {len(pre_train):,} "
          f"T2 pre-onset = {len(cal):,} healthy rows")

    print("fitting three detectors on healthy data...")
    models = fit_all(tr)
    for name, m in models.items():
        m.threshold = calibrate(m, cal)

    print("\n" + "=" * 78)
    print("MODEL 1 COMPARISON  (threshold calibrated to "
          f"{TARGET_FA_PER_HOUR}/hr on healthy val)")
    print("=" * 78)
    results, best, best_key = [], None, -1
    for name, m in models.items():
        res, per_run = evaluate(m, name, f2, raw2, te, frozen2)
        results.append(res)
        print(f"\n{name}")
        print(f"   threshold                 {res['threshold']}")
        print(f"   false alarms / flight hr  {res['false_alarms_per_hour']}")
        print(f"   detection rate            {res['detection_rate']*100:.1f}%")
        print(f"   median detect delay       {res['median_detect_delay_s']} s after onset")
        print(f"   severity at detection     {res['median_severity_at_detection']} "
              f"(1.0 = full failure)")
        print(f"   alarming before onset     {res['runs_alarming_before_onset']}"
              f"/{res['runs_total']} runs (false alarms)")
        print(f"   threshold never fired in  {res['runs_threshold_never_fired']}"
              f"/{res['runs_total']} runs")
        print(f"   MEDIAN LEAD TIME          {res['median_lead_min']} min")
        key = res["detection_rate"] - 0.5 * min(1.0, res["false_alarms_per_hour"])
        if key > best_key:
            best, best_key, best_run = m, key, per_run
            best_name = name

    print("\n" + "=" * 78)
    print(f"SELECTED: {best_name}")
    print("=" * 78)
    print("\nper-class lead time (minutes before a conventional alarm):")
    t = best_run.groupby("cls").agg(runs=("lead_min", "size"),
                                    median_lead=("lead_min", "median"),
                                    detect_delay_s=("t_det", "median"),
                                    sev_at_det=("sev_at_det", "median"),
                                    thr_ever_fired=("thr_fired", "sum"))
    print(t.round(1).to_string())

    out = Path(a.out)
    best.save(out)
    (out / "metrics.json").write_text(json.dumps(
        {"selected": best_name, "all": results}, indent=2))
    print(f"\nsaved → {out}/model1.joblib")


if __name__ == "__main__":
    main()
