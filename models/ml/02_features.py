"""
Person B — Step 2: feature builder.

Raw telemetry → residual → windowed features. Idhu than Model 1, 2, 3
moonukkum input. Ovvoru model-um thaniya feature build panna KOODAADHU.

    python 02_features.py --data "E:\\SIH26\\ML" --splits splits.json \\
           --surrogate artifacts/surrogate --out features/

Yen window thevai:
    Oru instant-oda residual la noise irukkum. 30 second-ku mean edutha
    noise poidum. Innum mukkiyam — **slope**. Residual mela poitae irukka
    illaya nu adhu solludhu. Adhu than lead time kudukkuradhu: threshold
    cross panradhukku munnadiye trend theriyum.

Output columns:
    <channel>_m30, _s30, _sd30, _x30     30 s window: mean, slope, std, max|z|
    <channel>_m300, _s300, _sd300, _x300  5 min window
    egt_spread_z, cht_spread_z            cylinder imbalance (misfire signal)
    max_abs_z, mean_abs_z                 overall severity
    n_hot_2, n_hot_4, n_hot_8             how many channels are deviating
    hot_concentration                     top channel share of total deviation
"""

from __future__ import annotations
import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd

import importlib.util
spec = importlib.util.spec_from_file_location(
    "sur", Path(__file__).with_name("01_surrogate_baseline.py"))
sur_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sur_mod)
SurrogateBaseline = sur_mod.SurrogateBaseline

WINDOWS = [30, 300]
LABEL_COLS = ["fault_class", "fault_severity", "time_to_failure_s", "health_index_true"]
KEEP_INDEX = ["engine_id", "flight_id", "t_s", "engine_hours_h"]


def rolling_features(res: pd.DataFrame, fid: pd.Series) -> pd.DataFrame:
    """Windowed stats over the residual matrix, never crossing a flight."""
    out = {}
    g = res.groupby(fid, sort=False)
    absres = res.abs()
    gabs = absres.groupby(fid, sort=False)

    for w in WINDOWS:
        m = g.rolling(w, min_periods=1).mean().reset_index(level=0, drop=True)
        sd = g.rolling(w, min_periods=1).std().reset_index(level=0, drop=True).fillna(0.0)
        mx = gabs.rolling(w, min_periods=1).max().reset_index(level=0, drop=True)
        # slope over the window: (now - w seconds ago) / w, per unit time
        sl = g.transform(lambda s: (s - s.shift(w)) / w).fillna(0.0)

        for c in res.columns:
            base = c.replace("residual_", "")
            out[f"{base}_m{w}"] = m[c].to_numpy()
            out[f"{base}_sd{w}"] = sd[c].to_numpy()
            out[f"{base}_x{w}"] = mx[c].to_numpy()
            out[f"{base}_s{w}"] = sl[c].to_numpy()

    # ROUGHNESS: std of the first difference over a short window. This is
    # cycle-to-cycle jitter, and it is what separates a misfire (one cylinder
    # failing intermittently, so rpm and EGT are RAGGED) from an intake
    # restriction (every cylinder equally starved, so rpm falls SMOOTHLY).
    # A plain rolling std cannot tell these apart because it also picks up the
    # slow droop that both faults share.
    dif = res.diff().fillna(0.0)
    gd = dif.groupby(fid, sort=False)
    rough = gd.rolling(30, min_periods=5).std().reset_index(level=0, drop=True)
    for c in res.columns:
        out[f"{c.replace('residual_','')}_r30"] = rough[c].fillna(0.0).to_numpy()

    return pd.DataFrame(out, index=res.index)


def physics_features(res: pd.DataFrame) -> pd.DataFrame:
    """Cross-channel features. These carry the engine physics the models
    cannot infer from single channels."""
    egt = res[[f"residual_egt_{i}_c" for i in range(1, 5)]].to_numpy()
    cht = res[[f"residual_cht_{i}_c" for i in range(1, 5)]].to_numpy()
    a = res.abs().to_numpy()

    tot = a.sum(axis=1)
    top1 = a.max(axis=1)

    out = pd.DataFrame(index=res.index)
    # cylinder imbalance in residual space — the misfire / injector signal
    out["egt_spread_z"] = egt.max(axis=1) - egt.min(axis=1)
    out["cht_spread_z"] = cht.max(axis=1) - cht.min(axis=1)
    out["egt_worst_dev_z"] = np.abs(egt - egt.mean(axis=1, keepdims=True)).max(axis=1)
    out["cht_worst_dev_z"] = np.abs(cht - cht.mean(axis=1, keepdims=True)).max(axis=1)
    # Signed deviation matters: a misfiring cylinder runs COLD while the others
    # are normal. An intake restriction moves all four the same direction.
    ed = egt - egt.mean(axis=1, keepdims=True)
    out["egt_coldest_dev_z"] = ed.min(axis=1)
    out["egt_hottest_dev_z"] = ed.max(axis=1)
    out["egt_asymmetry"] = np.abs(ed.min(axis=1)) / (np.abs(ed.max(axis=1)) + 1e-6)

    # overall severity
    out["max_abs_z"] = top1
    out["mean_abs_z"] = a.mean(axis=1)

    # how many channels are deviating, and how concentrated the deviation is.
    # ONE huge channel + everything else quiet  → sensor fault
    # MANY channels moving together              → engine fault
    out["n_hot_2"] = (a > 2.0).sum(axis=1)
    out["n_hot_4"] = (a > 4.0).sum(axis=1)
    out["n_hot_8"] = (a > 8.0).sum(axis=1)
    out["hot_concentration"] = top1 / np.maximum(tot, 1e-6)
    return out


def build(df: pd.DataFrame, sur: SurrogateBaseline) -> pd.DataFrame:
    df = df.sort_values(["flight_id", "t_s"]).reset_index(drop=True)
    res = sur.residuals(df, normalize=True)

    feats = pd.concat([
        df[KEEP_INDEX].reset_index(drop=True),
        rolling_features(res, df.flight_id),
        physics_features(res),
        res.add_suffix("_now"),
    ], axis=1)

    for c in LABEL_COLS:
        if c in df.columns:
            feats[c] = df[c].to_numpy()
    return feats


def save(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        df.to_parquet(path.with_suffix(".parquet"), index=False)
        print(f"  saved {path.with_suffix('.parquet')}  ({len(df):,} rows, "
              f"{df.shape[1]} cols)")
    except Exception:
        df.to_csv(path.with_suffix(".csv"), index=False)
        print(f"  saved {path.with_suffix('.csv')}  ({len(df):,} rows, "
              f"{df.shape[1]} cols)  [parquet unavailable, used csv]")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/v1")
    ap.add_argument("--splits", default="splits.json")
    ap.add_argument("--surrogate", default="artifacts/surrogate")
    ap.add_argument("--out", default="features")
    a = ap.parse_args()

    d, out = Path(a.data), Path(a.out)
    sur = SurrogateBaseline.load(Path(a.surrogate))
    splits = json.loads(Path(a.splits).read_text())

    for tier, fname in (("T1", "T1_healthy.csv"), ("T2", "T2_degradation.csv")):
        print(f"\n{tier}: building features...")
        t0 = time.time()
        df = pd.read_csv(d / fname)
        f = build(df, sur)
        print(f"  {time.time()-t0:.1f}s")
        save(f, out / f"{tier}_features")

    # quick separation check on the features themselves
    print("\n" + "=" * 62)
    print("FEATURE SANITY — do the key features separate the classes?")
    print("=" * 62)
    f2 = pd.read_parquet(out / "T2_features.parquet") if \
        (out / "T2_features.parquet").exists() else \
        pd.read_csv(out / "T2_features.csv")

    cols = ["mean_abs_z", "max_abs_z", "n_hot_4", "hot_concentration",
            "egt_spread_z", "oil_pressure_bar_s300"]
    sub = f2[f2.fault_severity > 0.5]
    print(f"\n{'class':24s}" + "".join(f"{c[:16]:>18s}" for c in cols))
    normal = f2[f2.fault_class == "NORMAL"]
    print(f"{'NORMAL':24s}" + "".join(f"{normal[c].mean():18.2f}" for c in cols))
    for cls, g in sub.groupby("fault_class"):
        print(f"{cls:24s}" + "".join(f"{g[c].mean():18.2f}" for c in cols))

    print("\nSENSOR vs ENGINE discriminator (hot_concentration):")
    for cls in ["SENSOR_DRIFT", "SENSOR_FAILURE", "LUBRICATION_FAILURE",
                "COOLING_DEGRADATION", "MISFIRE"]:
        g = sub[sub.fault_class == cls]
        if len(g):
            print(f"   {cls:22s} concentration={g.hot_concentration.mean():.3f}  "
                  f"n_hot_4={g.n_hot_4.mean():5.1f}  max|z|={g.max_abs_z.mean():8.1f}")


if __name__ == "__main__":
    main()
