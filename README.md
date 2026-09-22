# 6DX / AERO-TWIN — AI-Enabled Real-Time Digital Twin Platform

[![Architecture](https://img.shields.io/badge/Architecture-Digital%20Twin%20%7C%20ML%20%7C%20Three.js-blue.svg)](#architecture)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](#backend)
[![ThreeJS](https://img.shields.io/badge/Frontend-Three.js%20%2F%20HTML5-orange.svg)](#frontend)

**AI-Enabled Real-Time Digital Twin for Health Monitoring, Fault Prediction, and Mission Reliability Enhancement of Aero-Piston Engines Used in MALE UAV Applications.**

---

## 🏛️ System Architecture & Organization

The repository is modularly structured into clear layers for the **Frontend**, **Backend**, **Models** (3D Assets & ML Pipelines), and **Database** (Datasets & Samples):

```
6DX/
├── frontend/                     # Web dashboards, 3D viewers, and UI assets
│   ├── index.html                # Platform landing page
│   ├── digital-twin.html         # Primary 3D Twin dashboard & diagnostics
│   ├── overview.html             # Multi-subsystem real-time monitor
│   ├── engineer.html             # Detailed telemetry, predictions & residuals
│   ├── maintenance.html          # Fault classification, RUL & maintenance advisories
│   ├── replay.html               # Synchronized mission timeline replay
│   ├── css/                      # Dashboard styling & UI design tokens
│   ├── js/                       # Core state store (AeroState), WS client, charts
│   ├── assets/                   # Static UI assets and icons
│   ├── draco/                    # Google Draco 3D geometry decompression workers
│   ├── piston/                   # Three.js 3D Aero-Piston engine interactive app
│   ├── nine-systems/             # Specialized 9-subsystem 3D visualizers
│   └── src/                      # Reusable components, hooks, and types
│
├── backend/                      # Telemetry servers, twin runtime & validation
│   ├── start.py                  # Single-command platform launcher
│   ├── mock_stream_server.py     # Continuous runtime server with ML inference
│   ├── serve.ps1                 # High-performance PowerShell HTTP/CORS static server
│   ├── test_e2e.py               # End-to-end integration test suite
│   ├── validate_production.py    # Production integrity verification suite
│   ├── copy_systems.py           # Asset synchronizer utility
│   └── requirements.txt          # Python dependencies
│
├── models/                       # 3D GLB CAD models & trained ML pipelines
│   ├── 3d/                       # High-fidelity 3D assets
│   │   ├── engine.glb            # Core Aero-Piston engine model
│   │   ├── combustionsys.glb     # Combustion subsystem 3D assembly
│   │   ├── fuelsys.glb           # Fuel rail & injection 3D assembly
│   │   ├── lubrication.glb       # Lubrication circuit 3D assembly
│   │   ├── coolingsys.glb        # Thermal cooling circuit 3D assembly
│   │   ├── mechanicalsys.glb     # Crankcase, connecting rods & piston assembly
│   │   ├── airintakesys.glb      # Air intake & induction manifold
│   │   ├── exhaustsys.glb        # Exhaust manifold assembly
│   │   ├── electrical.glb        # FADEC & alternator assembly
│   │   └── propulsionsys.glb     # Propeller & reduction gear assembly
│   └── ml/                       # Machine Learning training & inference pipelines
│       ├── artifacts/            # Trained Joblib model weights & scalers
│       ├── 01_surrogate_baseline.py # Physics surrogate baseline model
│       ├── 02_features.py        # Feature engineering pipeline
│       ├── 03_model1_anomaly.py  # Model 1: Anomaly detection
│       ├── 04_model2_fault.py    # Model 2: XGBoost 11-class fault classification
│       ├── 05_model3_rul.py      # Model 3: Quantile Remaining Useful Life (RUL)
│       ├── inference.py          # Stateful per-engine InferenceEngine
│       └── serve.py              # Real ML WebSocket replay stream server
│
├── database/                     # Telemetry flight datasets and test samples
│   ├── datasets/                 # Synthetic & physics-based UAV telemetry datasets
│   │   ├── T1_healthy.csv        # Baseline healthy flight cycles
│   │   └── T2_degradation.csv    # Multi-scenario fault degradation cycles
│   └── samples/                  # JSON telemetry payloads for testing
│       ├── sample_healthy.json   # Nominal baseline JSON frame
│       ├── sample_critical.json  # Multi-subsystem critical warning frame
│       └── sample_sensor.json    # Sensor drift / suspect telemetry frame
│
├── .gitignore                    # Git ignore configuration
└── README.md                     # Documentation
```

---

## 🚀 Quick Start Guide

### 1. Frontend (No Python Required)
Double-click or open `frontend/digital-twin.html` or `frontend/overview.html` in any modern web browser.
- The built-in client simulation (`AeroMockSim`) auto-starts in 3 seconds to provide immediate interactive telemetry if no backend server is connected.

### 2. Local HTTP Server (Windows PowerShell)
To serve the full web app with 3D model streaming and CORS support:
```powershell
cd backend
.\serve.ps1 -Port 8080
```
Open **`http://localhost:8080/overview.html`** or **`http://localhost:8080/digital-twin.html`**.

### 3. Backend & ML Twin Runtime (Python)
Install dependencies and launch the digital twin streaming server:
```bash
pip install -r backend/requirements.txt

# Start backend twin runtime server on ws://localhost:8765
python backend/start.py --scenario healthy --web
```

---

## 🧠 Machine Learning Architecture

```
TELEMETRY INGESTION (27 Channels @ 1 Hz)
         │
         ▼
   InferenceEngine (models/ml/inference.py)
   ├── SurrogateBaseline → Nominal Target State Estimation
   ├── Residual Analysis (Z-Score Standardized)
   ├── Model 1: Anomaly Detector (Threshold 2.219)
   ├── Model 2: Fault Classifier (XGBoost 11 Classes)
   └── Model 3: RUL Predictor (P10 / P50 / P90 Quantiles)
         │
         ▼
   Inference Frame Broadcast (ws://localhost:8765)
         │
         ▼
   AeroState Canonical Store (frontend/js/engine-state.js)
         │
 ┌───────┼────────────────────────┬────────────────────────┐
 ▼       ▼                        ▼                        ▼
3D Mesh  Diagnostic Gauges  Health Analytics  Mission Replay Timeline
```

### 11 Fault Classification Classes:
1. `BEARING_WEAR`
2. `COMBUSTION_INSTABILITY`
3. `COOLING_DEGRADATION`
4. `ELECTRICAL_FAULT`
5. `FUEL_SYSTEM_FAULT`
6. `INJECTOR_ABNORMALITY`
7. `INTAKE_RESTRICTION`
8. `LUBRICATION_FAILURE`
9. `MISFIRE`
10. `SENSOR_DRIFT`
11. `SENSOR_FAILURE`

---

## 🛠️ Testing & Validation

```bash
# Run End-to-End System Continuity & Multi-Client Tests
python backend/test_e2e.py

# Verify ML Inference Pipeline Loads
python -c "import sys; sys.path.insert(0, 'models/ml'); from inference import InferenceEngine; e = InferenceEngine.load('models/ml/artifacts'); print('ML Engine OK')"
```

---

## 📦 GitHub Repository

- **Remote URL**: [https://github.com/sujitvinu123/6DX.git](https://github.com/sujitvinu123/6DX.git)
