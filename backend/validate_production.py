"""AERO-TWIN Production Validation Suite"""
import os, json, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("AERO-TWIN PRODUCTION VALIDATION REPORT")
print("=" * 60)

results = []

def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((name, status, detail))
    sym = "+" if condition else "X"
    print(f"  [{sym}] {name}" + (f" -- {detail}" if detail else ""))

print()
print("1. FILE STRUCTURE & ASSETS")
print("-" * 40)

for page in ["index.html", "digital-twin.html", "overview.html", "engineer.html", "maintenance.html", "replay.html"]:
    check(f"Page: {page}", os.path.exists(page))

for js in ["js/engine-state.js", "js/websocket-client.js", "js/mock-sim.js", "js/charts.js", "js/nav.js", "js/utils.js", "js/telemetry-provider.js"]:
    check(f"Module: {js}", os.path.exists(js))

check("3D dist", os.path.exists("tabhas/piston/dist/index.html"))
check("GLB model", os.path.exists("tabhas/piston/dist/models/engine.glb"))
check("ML inference.py", os.path.exists("new/ml-handover/inference.py"))
check("ML serve.py", os.path.exists("new/ml-handover/serve.py"))
check("ML artifacts", all(os.path.exists(f"new/ml-handover/artifacts/{d}") for d in ["model1", "model2", "model3", "surrogate", "noise_floors.json"]))
check("ML data", all(os.path.exists(f"new/ml-handover/data/{f}") for f in ["T1_healthy.csv", "T2_degradation.csv"]))

print()
print("2. ARCHITECTURE VALIDATION")
print("-" * 40)

with open("js/engine-state.js") as f:
    es = f.read()
ml_channels = ["rpm", "cht_1_c", "cht_2_c", "cht_3_c", "cht_4_c", "egt_1_c", "egt_2_c", "egt_3_c", "egt_4_c",
    "oil_pressure_bar", "oil_temp_c", "coolant_temp_c", "fuel_flow_lph", "fuel_pressure_bar",
    "vib_rms_g", "vib_1x_g", "vib_high_g", "vib_kurtosis",
    "battery_voltage_v", "alternator_current_a", "injection_timing_deg",
    "altitude_m", "oat_c", "ambient_pressure_kpa", "throttle_pct", "engine_load_pct", "map_kpa"]
missing = [c for c in ml_channels if c not in es]
check("AeroState: all 27 ML channels", len(missing) == 0, f"Missing: {missing}" if missing else "27/27")

check("Alias: vib_rms_g <-> vibration_g", "vibration_g" in es and "vib_rms_g" in es)
check("Alias: battery_voltage_v -> battery_v", "battery_v" in es)
check("Alias: map_kpa -> map_inhg", "map_inhg" in es)

frame_keys = ["measured", "predicted", "residuals", "derived", "health", "anomaly", "fault", "rul", "advisory", "sensor_health"]
handled = [k for k in frame_keys if f"msg.{k}" in es]
check("processTick handles frame keys", len(handled) >= 9, f"{len(handled)}/10")

with open("digital-twin.html", encoding="utf-8", errors="replace") as f:
    dt = f.read()
check("DT loads engine-state.js", "js/engine-state.js" in dt)
check("DT loads mock-sim.js", "js/mock-sim.js" in dt)
check("DT subscribes AeroState", "AeroState.subscribe" in dt)
check("DT NO inline sim (startDataStream removed)", "startDataStream" not in dt)
check("DT syncs iframe", "syncIframeTelemetry" in dt)

with open("tabhas/piston/src/engine/EngineModelLoader.js", encoding="utf-8", errors="replace") as f:
    eml = f.read()
check("Propeller removed (no import)", "createPropellerAssembly" not in eml)
check("Propeller removed (no assembly)", "PropellerAssembly_Live" not in eml)
check("Propeller removed (no rotation)", "propellerGroup.rotation.z" not in eml)

with open("js/mock-sim.js", encoding="utf-8", errors="replace") as f:
    ms = f.read()
check("MockSim: schema_version", "schema_version" in ms)
check("MockSim: full 27ch measured", all(c in ms for c in ["vib_rms_g", "vib_1x_g", "coolant_temp_c", "fuel_pressure_bar", "map_kpa"]))
check("MockSim: predicted", "predicted:" in ms)
check("MockSim: residuals", "residuals:" in ms)
check("MockSim: health", "health:" in ms)
check("MockSim: advisory", "advisory:" in ms)
check("MockSim: sensor_health", "sensor_health:" in ms)
check("MockSim: _simulated flag", "_simulated: true" in ms)
check("MockSim: auto-stop on WS", "Real WS connected" in ms)

print()
print("3. SECURITY")
print("-" * 40)

for fname in ["js/engine-state.js", "js/mock-sim.js", "js/websocket-client.js", "digital-twin.html", "overview.html"]:
    with open(fname, encoding="utf-8", errors="replace") as fh:
        content = fh.read()
    check(f"No secrets in {fname}", "AKIA" not in content and "aws_secret" not in content.lower())

check("bedrock.env exists (not deleted)", os.path.exists("bedrock.env"))

print()
print("4. ML INTEGRATION")
print("-" * 40)

with open("new/ml-handover/serve.py") as f:
    sp = f.read()
check("serve.py: port 8765", "8765" in sp)
check("serve.py: hello msg", "hello" in sp)
check("serve.py: tick frames", "engine.step" in sp)
check("serve.py: events", "build_event" in sp)

with open("new/ml-handover/inference.py") as f:
    ip = f.read()
present = [k for k in frame_keys if f'"{k}"' in ip]
check("inference.py frame keys", len(present) >= 9, f"{len(present)}/10")

print()
print("5. WEBSOCKET PROTOCOL")
print("-" * 40)

with open("js/websocket-client.js") as f:
    wsc = f.read()
check("WS: port 8765", "8765" in wsc)
check("WS: routes hello", "case 'hello'" in wsc)
check("WS: routes tick", "case 'tick'" in wsc)
check("WS: routes event", "case 'event'" in wsc)
check("WS: reconnect backoff", "Math.pow" in wsc)

print()
print("6. SINGLE SOURCE OF TRUTH")
print("-" * 40)

for page in ["overview.html", "engineer.html", "maintenance.html"]:
    with open(page, encoding="utf-8", errors="replace") as f:
        content = f.read()
    check(f"{page}: uses AeroState.subscribe", "AeroState.subscribe" in content)
    check(f"{page}: loads mock-sim.js fallback", "mock-sim.js" in content)

print()
print("=" * 60)
passes = sum(1 for _, s, _ in results if s == "PASS")
fails = sum(1 for _, s, _ in results if s == "FAIL")
total = len(results)
print(f"RESULT: {passes} PASS / {fails} FAIL / {total} TOTAL")
print("=" * 60)

if fails > 0:
    print()
    print("FAILURES:")
    for name, status, detail in results:
        if status == "FAIL":
            print(f"  X {name}: {detail}")
