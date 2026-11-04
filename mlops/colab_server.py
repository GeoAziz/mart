"""
CommerceMind AI - Colab Live Inference Server
Runs on Google Colab (Free T4 or CPU), exposes FastAPI on port 8001,
and tunnels to a public HTTPS URL via localtunnel or pyngrok.
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="CommerceMind AI Serving Gateway",
    description="Live Colab Cloud Inference Endpoint for ZilaCart",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Model Initialization (T4 GPU Accelerated with 4-bit Fallback or GGUF)
# -----------------------------------------------------------------------------

WORKSPACE_DIR = Path("/content/commercemind_workspace")
FINAL_ADAPTER = WORKSPACE_DIR / "final_adapter"
MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"

print("="*60)
print("🚀 Initializing CommerceMind Model Engine on Colab...")
print("="*60)

tokenizer = None
model = None

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import PeftModel

    print(f"📦 Loading base model {MODEL_ID} in 4-bit...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )

    base = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16,
        trust_remote_code=True,
        attn_implementation="sdpa"
    )

    if FINAL_ADAPTER.exists():
        print(f"🔗 Loading trained LoRA adapter from {FINAL_ADAPTER}...")
        model = PeftModel.from_pretrained(base, str(FINAL_ADAPTER))
    else:
        print("⚠️ No adapter found; serving base model with zero-shot prompting...")
        model = base

    model.eval()
    print("✅ Model loaded and ready for inference!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

# -----------------------------------------------------------------------------
# Inference Helpers
# -----------------------------------------------------------------------------

def generate_json_response(instruction: str, user_input: str) -> Dict[str, Any]:
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model engine not loaded")

    messages = [
        {
            "role": "system",
            "content": "You are CommerceMind AI, an authoritative retail intelligence engine. You extract structured catalog attributes and parse shopping intent with zero speculation. Always output strict, valid JSON matching the requested schema."
        },
        {
            "role": "user",
            "content": f"{instruction}\n\nInput:\n{user_input}"
        }
    ]

    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda" if torch.cuda.is_available() else "cpu")

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=768,
            temperature=0.1,
            top_p=0.95,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )

    gen_tokens = output_ids[0][inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()

    # Extract JSON block if surrounded by markdown fences
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(response_text)
    except Exception as parse_err:
        print(f"JSON Parse fallback, raw output was:\n{response_text}")
        return {
            "status": "validation_failed",
            "raw_output": response_text,
            "error": str(parse_err)
        }

# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------

class EnrichRequest(BaseModel):
    text: str
    category_hint: Optional[str] = None

class InterpretRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

@app.get("/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "CommerceMind-3B-QLoRA",
        "device": "T4 GPU" if torch.cuda.is_available() else "CPU",
        "adapter_loaded": FINAL_ADAPTER.exists(),
        "timestamp": time.time()
    }

@app.post("/v1/catalog/enrich")
async def enrich_catalog(req: EnrichRequest):
    instruction = "Extract structured product catalog attributes, normalize values with provenance, flag unverified claims, and compute quality score."
    return generate_json_response(instruction, req.text)

@app.post("/v1/shopping/interpret")
async def interpret_shopping(req: InterpretRequest):
    instruction = "Parse conversational shopping requirements into structured AST filter clauses, budget limits, and search tokens."
    return generate_json_response(instruction, req.query)

# -----------------------------------------------------------------------------
# Server Launcher with LocalTunnel
# -----------------------------------------------------------------------------

def start_server_and_tunnel():
    print("\n🌐 Starting LocalTunnel to expose port 8001...")
    # Install localtunnel if needed
    subprocess.run("npm install -g localtunnel -s", shell=True)
    
    # Start localtunnel in background
    tunnel_proc = subprocess.Popen(
        "lt --port 8001",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Read the tunnel URL
    tunnel_url = ""
    for _ in range(20):
        line = tunnel_proc.stdout.readline()
        if "your url is:" in line.lower():
            tunnel_url = line.split("is:")[-1].strip()
            break
        time.sleep(0.5)

    print("\n" + "="*60)
    print("🚀 CommerceMind AI: Colab Serving Live!")
    if tunnel_url:
        print(f"🌐 Public Endpoint URL: {tunnel_url}")
        print(f"👉 Set this in mart/.env: COMMERCEMIND_INFERENCE_URL={tunnel_url}")
    else:
        print("⚠️ Tunnel URL pending; check port 8001")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    start_server_and_tunnel()

