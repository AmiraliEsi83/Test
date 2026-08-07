# DSMP v2.6 — Tester Quick Start (Maha / Aneela)

Use this one-pager together with the full guide: [`DSMP_User_Guide_v2.6.md`](DSMP_User_Guide_v2.6.md).

## Goal of this test pass

1. Confirm the written guide is clear enough for someone without DSMP experience.
2. Exercise **MLP** changes in v2.6.
3. Confirm a **new dataset** can be converted to the Twitter **follower–followee** six-column format.

## Setup

```bash
git clone https://github.com/aabhari/SocialNetworkSimulatorV3.1.git
cd SocialNetworkSimulatorV3.1
git checkout v2.6
python3.9 build.py setup   # Windows: py -3.9 build.py setup
python3.9 build.py run
```

## Test 1 — Existing Twitter file

1. Performance Measurement
2. File → Dataset From Text → `Dataset/Reduced_14k.txt`
3. Nodes = 1, Algorithm = MLP (defaults)
4. Get Users → Initialize → Run Simulation
5. Record accuracy + time

## Test 2 — Existing Retail file + MLP settings

1. Load `Dataset/Retail.txt`
2. Algorithm = MLP → **MLP Settings**
3. Enable custom settings; try Legacy Neuroph with **max iterations = 50**
4. Initialize → Run
5. Switch engine to **Sparse Federated MLP (experimental)** with defaults → Initialize → Run

## Test 3 — MLP Auto Search

1. Algorithm = MLP → **MLP Auto Search**
2. Dataset = `Dataset/Retail.txt` (or Reduced_14k)
3. Profile = **Fast bounded search**
4. Run → Apply best → re-run Performance Measurement

## Test 4 — New dataset conversion (critical)

1. From User Gen screen open **Dataset Import Lab**
2. Kind = Retail (or your new file type)
3. Inspect raw source
4. Mapping for retail MLP: **Retail: smart product category**
5. Build into `Dataset/`
6. Use Output → Get Users → Initialize → Run with MLP

## Pass / fail notes to send back

For each run, note:

- dataset path
- algorithm / MLP engine
- layers, neurons, LR, max iterations or sparse epochs
- nodes
- finished? (yes/no)
- accuracy
- wall-clock time
- any UI step that was confusing in the guide
