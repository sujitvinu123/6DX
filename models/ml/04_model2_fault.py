"""
Person B — Step 4: Model 2, fault isolation.

Model 1 "fault irukka?" nu sollum. Model 2 "enna fault?" nu sollum.

    python 04_model2_fault.py --features features --splits splits.json \\
           --out artifacts/model2

Moonu design decision, ovvondrukkum karanam irukku:

1. NORMAL class ILLA.
   Model 1 gate-a irukku. Anomaly illaana Model 2 odave odaadhu. Adhaanaala
   12-vadhu NORMAL class thevai illa — architecture-e adha solve pannudhu.

2. LOW SEVERITY la accuracy than mukkiyam.
   Model 1 severity 0.18 la fire aagudhu. Appo Model 2 correct-a solla
   mudiyanum. Severity 0.9 la 99% accuracy vandhaalum payanilla — appo
   engine already kettu poidum. Adhaanaala evaluation severity band-wise.

3. SENSOR vs ENGINE explicit rule.
   Learned model illa. Oru channel mattum periya-a deviate aagi, matha
   ellam amaidhiya irundhaa → sensor. Pala channel sethu naganthaa → engine.
   `hot_concentration` + `n_hot_4` andha rendaiyum encode pannudhu.
"""

from __future__ import annotations
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

try:
    from xgboost import XGBClassifier
    HAVE_XGB = True
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    HAVE_XGB = False

INDEX = ["engine_id", "flight_id", "t_s", "engine_hours_h"]
LABELS = ["fault_class", "fault_severity", "time_to_failure_s", "health_index_true"]
MIN_SEVERITY = 0.05          # below this the fault has not physically started
SENSOR_CLASSES = {"SENSOR_DRIFT", "SENSOR_FAILURE"}
# Faults that starve or heat every cylinder equally. A misfire is a SINGLE
# cylinder failing, so these are exactly the confusions the physics rule fixes.
MISFIRE_CONFUSED_WITH = ["INTAKE_RESTRICTION", "COOLING_DEGRADATION",
                         "COMBUSTION_INSTABILITY", "FUEL_SYSTEM_FAULT"]


def feature_cols(f: pd.DataFrame) -> list[str]:
    return [c for c in f.columns if c not in INDEX + LABELS]


class FaultModel:
    def __init__(self, clf, cols, classes):
        self.clf, self.cols, self.classes = clf, cols, list(classes)

    def predict(self, f: pd.DataFrame, apply_rules: bool = True):
        p = self.clf.predict_proba(f[self.cols])
        idx = p.argmax(axis=1)
        yhat = np.array([self.classes[i] for i in idx])
        conf = p.max(axis=1)
        if apply_rules and "MISFIRE" in self.classes:
            # Apply the rule only where the classifier picked one of the classes
            # it is known to confuse with misfire (all-cylinder faults). A
            # clogged injector also kills one cylinder, and the classifier
            # already isolates that correctly, so leave those predictions alone.
            m = misfire_rule(f) & np.isin(yhat, MISFIRE_CONFUSED_WITH)
            yhat[m] = "MISFIRE"
            conf[m] = np.maximum(conf[m], 0.90)
        return yhat, conf, p

    def save(self, p: Path):
        p.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, p / "model2.joblib")

    @staticmethod
    def load(p: Path):
        return joblib.load(Path(p) / "model2.joblib")


def sensor_or_engine(f: pd.DataFrame) -> np.ndarray:
    """
    Physics rule, not a learned model. Only ONE channel far out of line while
    the rest agree => the sensor is wrong, not the engine. A real engine fault
    moves the coupled state, so several channels move together.
    """
    # Concentration alone misses a FROZEN sensor: nothing is hot at all, so
    # there is no channel to concentrate on. The reliable signal is simply how
    # FEW channels are deviating.
    n_hot = f["n_hot_4"].to_numpy()
    conc = f["hot_concentration"].to_numpy()
    return ((n_hot <= 2) & ((conc >= 0.50) | (n_hot <= 1))).astype(bool)


def misfire_rule(f: pd.DataFrame) -> np.ndarray:
    """
    Physics rule, not a learned model.

    A misfire is one cylinder failing intermittently. That produces three
    things at once, and nothing else produces all three:
      - that cylinder's EGT collapses while the others stay normal
      - the crankshaft becomes rough (jitter, not a smooth droop)
      - a 1x-order vibration appears from the firing imbalance

    An intake restriction starves every cylinder equally: rpm falls smoothly,
    EGT stays balanced. Tree ensembles kept confusing the two because the
    misfire signature lives in only a few of 243 columns and the split choice
    was unstable across library versions. This rule is deterministic and
    explainable, which is also what the problem statement asks for.
    """
    return ((f["vib_1x_g_m30"].to_numpy() > 3.0) &
            (f["egt_spread_z"].to_numpy() > 3.0) &
            (f["egt_coldest_dev_z"].to_numpy() < -3.0))


def report_by_severity(y, yhat, sev, bands=((0.05, 0.25), (0.25, 0.5), (0.5, 1.01))):
    print(f"\n{'severity band':>16s} {'rows':>8s} {'accuracy':>10s}")
    for lo, hi in bands:
        m = (sev >= lo) & (sev < hi)
        if m.sum():
            print(f"   {lo:.2f} – {hi:.2f}   {int(m.sum()):8,} "
                  f"{100*(y[m] == yhat[m]).mean():9.1f}%")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", default="features")
    ap.add_argument("--splits", default="splits.json")
    ap.add_argument("--out", default="artifacts/model2")
    a = ap.parse_args()

    F = Path(a.features)
    p = F / "T2_features.parquet"
    f2 = pd.read_parquet(p) if p.exists() else pd.read_csv(F / "T2_features.csv")
    splits = json.loads(Path(a.splits).read_text())

    # Only genuinely-faulted rows. NORMAL rows never reach Model 2 in
    # production because Model 1 gates them out.
    d = f2[(f2.fault_class != "NORMAL") & (f2.fault_severity >= MIN_SEVERITY)]

    tr = d[d.flight_id.isin(splits["T2"]["train"])]
    va = d[d.flight_id.isin(splits["T2"]["val"])]
    te = d[d.flight_id.isin(splits["T2"]["test"])]
    ho = d[d.flight_id.isin(splits["T2"]["holdout_engine"])]

    cols = feature_cols(d)
    classes = sorted(d.fault_class.unique())
    cmap = {c: i for i, c in enumerate(classes)}
    import sklearn, sys as _s
    print(f"python {_s.version.split()[0]}  sklearn {sklearn.__version__}", end="")
    if HAVE_XGB:
        import xgboost
        print(f"  xgboost {xgboost.__version__}", end="")
    print()
    print(f"features {len(cols)}   classes {len(classes)}")
    print(f"train {len(tr):,}  val {len(va):,}  test {len(te):,}  "
          f"holdout-engine {len(ho):,}")

    ytr = tr.fault_class.map(cmap).to_numpy()

    # NOTE: severity-weighting and class-balancing were both tried here and both
    # made things worse (early-band accuracy 94.5% -> 86.1%). The severity bands
    # are already well represented; reweighting just distorted the decision
    # boundary. Left unweighted deliberately.

    if HAVE_XGB:
        # colsample_bytree < 1.0 was tried and removed. The misfire signature
        # lives in a handful of columns (rpm roughness, coldest-cylinder EGT
        # deviation); with feature subsampling many trees never see them, and
        # misfire recall then swings wildly between library versions. Showing
        # every tree every column costs a little speed and buys stability.
        clf = XGBClassifier(
            n_estimators=500, max_depth=6, learning_rate=0.08,
            subsample=0.85, colsample_bytree=1.0, reg_lambda=1.5,
            objective="multi:softprob", num_class=len(classes),
            tree_method="hist",
            eval_metric="mlogloss", n_jobs=-1, random_state=0,
            early_stopping_rounds=40)
        clf.fit(tr[cols], ytr,
                eval_set=[(va[cols], va.fault_class.map(cmap).to_numpy())],
                verbose=False)
        print(f"trained XGBoost, best iteration {clf.best_iteration}")
    else:
        clf = HistGradientBoostingClassifier(
            max_iter=400, learning_rate=0.08, random_state=0)
        clf.fit(tr[cols], ytr)
        print("trained HistGradientBoosting (xgboost not installed)")

    model = FaultModel(clf, cols, classes)

    for name, split in (("TEST (unseen runs)", te),
                        ("HOLDOUT ENGINE (never seen)", ho)):
        if not len(split):
            continue
        yhat, conf, _ = model.predict(split)
        y = split.fault_class.to_numpy()
        print("\n" + "=" * 72)
        print(f"{name}   overall accuracy {100*(y == yhat).mean():.1f}%")
        print("=" * 72)
        report_by_severity(y, yhat, split.fault_severity.to_numpy())

    yhat, conf, _ = model.predict(te)
    y = te.fault_class.to_numpy()

    print("\nper-class (test runs, all severities):")
    print(classification_report(y, yhat, digits=3, zero_division=0))

    print("confusion (rows = truth):")
    cm = pd.DataFrame(confusion_matrix(y, yhat, labels=classes),
                      index=[c[:14] for c in classes],
                      columns=[c[:9] for c in classes])
    print(cm.to_string())

    # ---- the operationally important number ----------------------------
    print("\n" + "=" * 72)
    print("EARLY ISOLATION — accuracy in the band where Model 1 actually fires")
    print("=" * 72)
    early = te[(te.fault_severity >= 0.10) & (te.fault_severity <= 0.30)]
    if len(early):
        yh, cf, _ = model.predict(early)
        ye = early.fault_class.to_numpy()
        print(f"   rows {len(early):,}   accuracy {100*(ye == yh).mean():.1f}%"
              f"   mean confidence {cf.mean():.3f}")
        acc = pd.DataFrame({"true": ye, "ok": ye == yh}).groupby("true").ok.mean()
        print("\n   per class:")
        for k, v in acc.sort_values().items():
            print(f"      {k:24s} {100*v:5.1f}%")

    # ---- sensor vs engine physics rule ---------------------------------
    print("\n" + "=" * 72)
    print("MISFIRE PHYSICS RULE")
    print("=" * 72)
    yraw0, _, _ = model.predict(te, apply_rules=False)
    mr = misfire_rule(te) & np.isin(yraw0, MISFIRE_CONFUSED_WITH)
    is_mis = y == "MISFIRE"
    print(f"   misfire rows the rule catches : {int((mr & is_mis).sum()):,} "
          f"({100*(mr & is_mis).sum()/max(1,is_mis.sum()):.1f}%)")
    print(f"   non-misfire rows it wrongly claims : {int((mr & ~is_mis).sum()):,} "
          f"({100*(mr & ~is_mis).sum()/max(1,(~is_mis).sum()):.2f}%)")
    yraw, _, _ = model.predict(te, apply_rules=False)
    print(f"   classifier alone, misfire recall  : "
          f"{100*(yraw[is_mis] == 'MISFIRE').mean():.1f}%")
    print(f"   with the rule applied             : "
          f"{100*(yhat[is_mis] == 'MISFIRE').mean():.1f}%")

    print("\n" + "=" * 72)
    print("SENSOR-vs-ENGINE RULE (physics, not learned)")
    print("=" * 72)
    flag = sensor_or_engine(te)
    is_sensor = np.isin(y, list(SENSOR_CLASSES))
    tp = int((flag & is_sensor).sum())
    fp = int((flag & ~is_sensor).sum())
    fn = int((~flag & is_sensor).sum())
    print(f"   sensor faults correctly called sensor : {tp:,} "
          f"({100*tp/max(1,is_sensor.sum()):.1f}% of sensor rows)")
    print(f"   engine faults wrongly called sensor   : {fp:,} "
          f"({100*fp/max(1,(~is_sensor).sum()):.1f}% of engine rows)")
    print(f"   sensor faults missed by the rule      : {fn:,}")

    out = Path(a.out)
    model.save(out)
    (out / "metrics.json").write_text(json.dumps({
        "classes": classes,
        "test_accuracy": round(float((y == yhat).mean()), 4),
        "early_accuracy": round(float((ye == yh).mean()), 4) if len(early) else None,
        "n_features": len(cols),
    }, indent=2))
    print(f"\nsaved → {out}/model2.joblib")


if __name__ == "__main__":
    main()
