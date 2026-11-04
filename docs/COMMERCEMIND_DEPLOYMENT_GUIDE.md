# CommerceMind AI: Deployment & Serving Guide

This document outlines the two supported inference serving patterns for CommerceMind AI:
- **Option 1 (Current Active):** Free Google Colab Cloud Inference via FastAPI + LocalTunnel (Zero Local Hardware Requirements).
- **Option 2 (Local Edge):** Standalone Local CPU Serving via Ollama (Zero Cloud Bills, 0ms Network Latency).

---

## Option 1: Live Cloud Inference on Google Colab (Free Tier)

This pattern allows you to run the fine-tuned model directly inside a Google Colab session and expose it as a live HTTPS endpoint accessible by ZilaCart (`mart`).

```
┌────────────────────────────────────────┐
│      Google Colab Free Environment     │
│                                        │
│  [ CommerceMind FastAPI Service ]      │  Runs on port 8001
│                  ▲                     │  Loads GGUF / 4-bit Adapter
│                  │                     │
│         [ LocalTunnel / Ngrok ]        │  Exposes 8001 -> Public HTTPS URL
└──────────────────┬─────────────────────┘
                   │
                   ▼ (HTTPS Webhook)
┌────────────────────────────────────────┐
│    ZilaCart Next.js Application        │
│  COMMERCEMIND_INFERENCE_URL=<url>     │
└────────────────────────────────────────┘
```

### Setup & Launch Instructions (Colab)

1. Launch a Colab session:
   ```bash
   colab new --gpu T4
   ```
2. Upload and execute the Colab serving script (`mlops/colab_server.py`):
   ```bash
   colab upload mlops/colab_server.py /content/colab_server.py
   colab exec -f mlops/colab_server.py
   ```
3. The server prints a public HTTPS tunnel URL:
   ```
   ============================================================
   🚀 CommerceMind AI: Colab Serving Live
   🌐 Public Endpoint: https://commercemind-api.loca.lt
   ============================================================
   ```
4. In your ZilaCart `.env.local` or `.env`, set:
   ```env
   COMMERCEMIND_INFERENCE_URL=https://commercemind-api.loca.lt
   ```
5. Test the connection from your terminal:
   ```bash
   curl -X GET "https://commercemind-api.loca.lt/v1/health"
   ```

---

## Option 2: Local CPU Serving via Ollama (100% Free & Offline)

Because CommerceMind AI was quantized to **`Q4_K_M` (1.8 GB)** and **`Q5_K_M` (2.1 GB)**, it does not require a GPU for production inference. It runs on any standard 4-core CPU at 30+ tokens per second.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Local Machine                   │
│                                                         │
│   [ Ollama Runtime ]                                    │
│   Serves `commercemind` on http://localhost:11434       │
│                                                         │
│   [ ZilaCart Next.js Server ]                           │
│   COMMERCEMIND_INFERENCE_URL=http://localhost:8001      │
└─────────────────────────────────────────────────────────┘
```

### Setup Instructions (Local)

1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. Download the quantized artifact from Colab:
   ```bash
   colab download /content/commercemind_workspace/gguf/commercemind-3b-q4_k_m.gguf ./models/
   colab download /content/commercemind_workspace/gguf/Modelfile ./models/
   ```
3. Register the model in Ollama:
   ```bash
   cd models
   ollama create commercemind -f Modelfile
   ```
4. Test the model in your terminal:
   ```bash
   ollama run commercemind "Extract attributes: Kitenge yellow dress size M cotton"
   ```
5. In `.env.local`:
   ```env
   COMMERCEMIND_INFERENCE_URL=http://localhost:11434
   ```

---

## API Endpoints Reference

Both serving patterns expose the exact same REST API contract:

### 1. Health Check
* **Endpoint:** `GET /v1/health`
* **Response:**
  ```json
  {
    "status": "healthy",
    "model": "CommerceMind-3B-Q4_K_M",
    "version": "1.1.0"
  }
  ```

### 2. Engine 1: Catalog Intelligence
* **Endpoint:** `POST /v1/catalog/enrich`
* **Request:**
  ```json
  {
    "text": "Ankara ladies top, yellow/brown, cotton blend, size M/L, good for wedding or office work, waterproof look."
  }
  ```
* **Response:** Returns `CommerceMindCatalogEnrichment` with field-level provenance, 3-state normalization (`exact`, `approximate`, `unresolved`), and listing quality score.

### 3. Engine 2: Shopping Intelligence
* **Endpoint:** `POST /v1/shopping/interpret`
* **Request:**
  ```json
  {
    "query": "Nahitaji official shoes size 42 zisizozidi 4k lakini sitaki za suede"
  }
  ```
* **Response:** Returns `CommerceMindShoppingInterpretation` with allowlisted `filter_ast` clauses and budget constraints.

