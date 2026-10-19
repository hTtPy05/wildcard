# BlindSpot AI 🔍

**Evidence-Backed Risk, Missing Assumption & Constraint Audit Engine**

> Built for hackathons, engineering reviews, and architecture audits. BlindSpot AI reads project documents, tabular datasets, and workflow diagrams to detect **what the team has NOT said or NOT considered**. Every single finding is backed by clickable verbatim text spans, dataset column statistics, or workflow graph nodes.

---

## 🎯 Core Principle: Zero Hallucinations, 100% Tangible Evidence

Generic advice that could apply to any project (e.g., *"Make sure to write unit tests"*) is strictly banned. BlindSpot AI only outputs findings that point to:
1. **Document Text Spans**: Exact verbatim quotes with start and end character offsets.
2. **Dataset Statistics**: Computed metrics (missingness %, PII patterns, target leakage, class imbalance ratio, temporal skew).
3. **Workflow Graph Nodes**: Specific unowned steps, missing rollback edges, or single points of failure.

---

## 🏗️ Architecture & Pipeline

```
                                  BLINDSPOT AI PIPELINE
                                            │
  ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
  ▼                   ▼                     ▼                     ▼                   ▼
Stage 1             Stage 2               Stage 3a              Stage 3b            Stage 4
INGEST              EXTRACT               DETERMINISTIC         LLM GAP REASONING   RANK & PLAN
- Text with offsets - Goals & metrics     - DataRiskAnalyzer    - 10 Taxonomies     - Score Formula
- Dataset Profiler  - Stated assumptions  - WorkflowRiskAnalyzer- Contradictions    - Evidence Check
- Workflow DAG      - Constraints/risks   - NetworkX topology   - Gemini Structured - Action Plan
```

### 1. Stage 1: Ingest & Offset Preservation
- Normalizes documents (`.pdf`, `.docx`, `.md`, `.txt`) while recording precise line and character offsets.
- Profiles datasets (`.csv`, `.xlsx`) for missingness, distributions, duplicates, and PII.
- Parses workflow definitions (`.json`, `.yaml`) into NetworkX directed graphs.

### 2. Stage 2: Extraction
- Extracts structured Project Model JSON: goals, stakeholders, features, stated assumptions, stated constraints, dependencies, metrics, timeline, budget, and risks with verbatim source quotes.

### 3. Stage 3: Dual-Engine Detection
- **Deterministic Data Risk**: Class imbalance (<10%), high missingness (>20%), duplicate rows, target leakage features, PII patterns (email, phone, SSN, Aadhaar), and single-cohort temporal skew.
- **Deterministic Workflow Risk**: Unowned steps, missing rollback/error transitions on payment, single operators controlling packing & dispatch, and irreversible actions lacking approval.
- **LLM Gap Reasoning**: Cross-references materials against 10 domain taxonomies (Security & Privacy, Compliance, Scalability, Adoption, Failure Recovery).
- **Cross-Artifact Contradiction Pass**: Mathematical check of document claims against physical reality (e.g. 20-minute delivery SLA vs 2-person courier fleet).

### 4. Stage 4: Scoring & Action Plan
- **Impact Formula**:
  $$\text{Impact} = 100 \times (0.35 \times \text{sev} + 0.25 \times \text{lik} + 0.20 \times \text{brd} + 0.10 \times \text{irr} + 0.10 \times \text{time})$$
- **Confidence**: Computed from evidence count, directness (verbatim quote vs inference), and rule-LLM consensus.
- **Priority**:
  $$\text{Priority} = \text{Impact} \times (0.5 + 0.5 \times \text{Confidence})$$
- **Tiers**: Critical ($\ge 75$), High ($55\text{--}74$), Medium ($35\text{--}54$), Low ($< 35$).
- Dynamic live re-weighting via API without re-invoking the LLM.

---

## 🚀 Quick Start & Setup

### Option A: Local Development (Recommended)

#### 1. Backend Setup (FastAPI + Python 3.11)
```bash
cd blindspot/backend

# Create and activate virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server (starts on http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup (Next.js 14 + Tailwind CSS)
```bash
cd blindspot/frontend

# Install dependencies
npm install

# Start Next.js development server (starts on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Docker Compose
```bash
cd blindspot
docker-compose up --build
```
Access the application at [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Offline / No-Key Demo Mode

BlindSpot AI is built to be **100% resilient during live presentations**:
- If `GEMINI_API_KEY` is not provided, the app automatically switches to **Demo Mode**.
- A small **Demo Mode** indicator pill is displayed in the navigation bar.
- Precomputed, realistic analysis results (`app/samples/precomputed_results.json`) load instantly with zero latency and zero external network calls.

---

## 🧪 Built-in Benchmark Test Projects

Three realistic sample projects with planted vulnerabilities are included:

1. **QuickBite Campus Food Delivery (`startup_prd.md`)**:
   - *Throughput Contradiction*: 20-minute SLA vs 2 bicycle couriers for 1,000 orders/day.
   - *Budget Infeasibility*: ₹2 Lakh runway vs paid Google Maps API and 3-month development.
   - *Privacy Violation*: Background GPS tracking without student consent.
   - *Missing State*: Zero payment failure, timeout, or refund handling.

2. **Student Academic Risk Prediction (`student_performance.csv`)**:
   - *Target Leakage*: Column `final_result_label_copy` mirrors ground-truth label.
   - *Exposed PII*: Plain-text student emails across all 1,500 records.
   - *Class Imbalance*: Only 6% positive at-risk cohort.
   - *High Missingness*: 25% missing records in `attendance_rate`.
   - *Temporal Bias*: Data restricted to a single semester (`Fall 2024`).

3. **E-Commerce Order Fulfillment (`order_fulfillment.json`)**:
   - *Unowned Step*: Step 4 ("Generate Pick List") has `owner: null`.
   - *Missing Rollback*: Step 2 ("Authorize Payment") has no payment decline branch.
   - *Segregation of Duties*: Single operator owns both packing (Step 5) and dispatch (Step 6).
   - *Irreversible Action*: Step 6 hands over trailers without approval checks.

---

## 🎤 Hackathon 2-Minute Pitch & Demo Script

Read this pitch during your live presentation:

> **"Judges, every software post-mortem tells the same story: the disaster wasn’t caused by the code we wrote—it was caused by the assumptions we never documented and the constraints we completely overlooked.**
>
> **Meet BlindSpot AI: an automated architectural auditor that flags what your team hasn't said.**
>
> *(Click 'QuickBite Campus Delivery' on the Landing Page)*
>
> **Notice our core design principle: zero hallucinations. We never give generic advice. Take a look at this Critical finding:**
>
> **The PRD promises a 20-minute delivery SLA for 1,000 daily orders, but specifies a delivery fleet of only 2 student couriers on bicycles. BlindSpot AI cross-references these claims, highlights the exact sentences in the source text, and calculates that each courier would have to complete a dorm delivery every 86 seconds. That's a physical impossibility.**
>
> *(Click the 'Evidence' tab in the side drawer to show the highlighted text)*
>
> **When we audit datasets, it detects target leakage and class imbalance down to the exact column statistics. When we audit workflows, NetworkX maps unowned steps and missing payment failure rollbacks.**
>
> **Teams can tune risk weight sliders live to re-rank findings for their specific risk appetite, review critical questions to grill engineering leads, and export executive PDF reports in one click.**
>
> **BlindSpot AI turns invisible blind spots into an actionable, prioritized mitigation plan before launch day."**

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:
```bash
cd blindspot/backend
PYTHONPATH=. ./venv/bin/pytest tests/ -v
```
All 12 unit tests verify data risk heuristics, workflow graph algorithms, scoring formulas, and export endpoints.
