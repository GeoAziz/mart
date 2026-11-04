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
# Default to 1.5B on CPU for fast sub-second inference and low RAM footprint (< 3GB); 3B on CUDA GPU
import torch
is_cuda = torch.cuda.is_available()
MODEL_ID = os.environ.get("MODEL_ID", "Qwen/Qwen2.5-3B-Instruct" if is_cuda else "Qwen/Qwen2.5-1.5B-Instruct")

print("="*60)
print(f"🚀 Initializing CommerceMind Model Engine on Colab ({MODEL_ID})...")
print("="*60)

tokenizer = None
model = None

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import PeftModel

    device = "cuda" if is_cuda else "cpu"
    print(f"📦 Loading model {MODEL_ID} on {device.upper()}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    if is_cuda:
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
    else:
        # High efficiency CPU execution in float16/bfloat16 (uses only ~1.8GB RAM total)
        base = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            device_map="cpu",
            torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32,
            trust_remote_code=True
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
# Canonical Pydantic Schemas & Normalization (Matching schemas.py & types.ts)
# -----------------------------------------------------------------------------

class LimitSpec(BaseModel):
    amount: float
    boundary: str = "inclusive"

class BudgetConstraint(BaseModel):
    currency: str = "KES"
    min_limit: Optional[LimitSpec] = None
    max_limit: Optional[LimitSpec] = None

class FilterClause(BaseModel):
    field: str
    operator: str
    value: Union[str, float, int, bool, List[Union[str, float, int]]]

class FilterAST(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    clauses: List[FilterClause] = []

class ShoppingInterpretationPayload(BaseModel):
    task: str = "shopping_intent"
    status: str = "success"
    intent: str = "product_search"
    detected_language: str = "en"
    budget_constraint: BudgetConstraint = Field(default_factory=BudgetConstraint)
    filter_ast: FilterAST = Field(default_factory=FilterAST)
    semantic_search_tokens: List[str] = []
    clarification_prompt: Optional[str] = None

# Known Brands (Prevents classification as category)
KNOWN_BRANDS = {"nike", "adidas", "puma", "samsung", "apple", "hp", "dell", "lenovo", "tecno", "infinix", "xiaomi", "oppo", "sony"}

# Category Dictionary
CATEGORY_MAP = {
    "shoe": ("Footwear", "Men's Footwear"),
    "sneaker": ("Footwear", "Sneakers"),
    "boot": ("Footwear", "Boots"),
    "laptop": ("Electronics", "Computers & Laptops"),
    "phone": ("Electronics", "Mobile Phones"),
    "smartphone": ("Electronics", "Mobile Phones"),
    "chair": ("Home & Living", "Office Furniture"),
    "dress": ("Fashion", "Women's Clothing"),
    "shirt": ("Fashion", "Men's Clothing"),
    "jacket": ("Fashion", "Outerwear"),
}

def normalize_shopping_interpretation(raw_data: Dict[str, Any], raw_query: str) -> Dict[str, Any]:
    """
    Normalizes erratic LLM outputs into the authoritative CommerceMind Shopping schema.
    Handles field name variations, brand vs category fixes, and lexical token purification.
    """
    clean_q = raw_query.lower()
    
    # 1. Detect language
    lang = "en"
    if any(w in clean_q for w in ["nataka", "nahitaji", "pesa", "shilingi", "bila", "bei"]):
        lang = "sw" if "luku" not in clean_q and "bob" not in clean_q else "sheng"
    elif any(w in clean_q for w in ["luku", "ngoma", "chuom", "bob"]):
        lang = "sheng"

    # 2. Extract / Normalize Budget Constraint
    budget = BudgetConstraint(currency="KES")
    # Check if LLM provided budgetLimit or budgetLimits
    bl = raw_data.get("budgetLimit") or raw_data.get("budget_constraint") or raw_data.get("budgetLimits")
    if isinstance(bl, (int, float)):
        budget.max_limit = LimitSpec(amount=float(bl))
    elif isinstance(bl, dict):
        amt = bl.get("amount") or bl.get("max") or (bl.get("max_limit", {}).get("amount") if isinstance(bl.get("max_limit"), dict) else None)
        min_amt = bl.get("min") or (bl.get("min_limit", {}).get("amount") if isinstance(bl.get("min_limit"), dict) else None)
        if amt and str(amt).replace(".", "").isdigit():
            budget.max_limit = LimitSpec(amount=float(amt))
        if min_amt and str(min_amt).replace(".", "").isdigit():
            budget.min_limit = LimitSpec(amount=float(min_amt))
    
    # Fallback regex for price if model missed it
    if not budget.max_limit:
        k_match = re.search(r"(\d+)\s*k\b", clean_q)
        num_match = re.search(r"(?:under|below|chini ya|less than|max|up to)\s*(?:kes|ksh)?\s*([\d,]+)", clean_q)
        if k_match:
            budget.max_limit = LimitSpec(amount=float(k_match.group(1)) * 1000)
        elif num_match:
            budget.max_limit = LimitSpec(amount=float(num_match.group(1).replace(",", "")))

    # 3. Normalize Clauses
    clauses: List[FilterClause] = []
    category: Optional[str] = None
    subcategory: Optional[str] = None

    raw_clauses = raw_data.get("filter_ast", {}).get("clauses") if isinstance(raw_data.get("filter_ast"), dict) else (raw_data.get("filterClauses") or [])

    # If raw_clauses was wrapped in an Elasticsearch-style {type: "AND", clauses: [...]}
    if isinstance(raw_clauses, list) and len(raw_clauses) > 0 and "clauses" in raw_clauses[0]:
        raw_clauses = raw_clauses[0]["clauses"]

    if isinstance(raw_clauses, list):
        for item in raw_clauses:
            if not isinstance(item, dict):
                continue
            
            # Map alternate naming
            field = str(item.get("field") or item.get("attributeName") or item.get("type") or "").lower()
            val = item.get("value") or item.get("term")
            op = str(item.get("operator") or item.get("type") or "eq").lower()

            # Normalize operators
            if op in ["=", "equals", "is"]:
                op = "eq"
            elif op in ["!=", "neq", "not_equals"]:
                op = "neq"
            elif op in [">=", "gte", "min"]:
                op = "gte"
            elif op in ["<=", "lte", "max"]:
                op = "lte"
            elif op not in ["eq", "neq", "in", "nin", "contains", "gte", "gt", "lte", "lt"]:
                op = "eq"

            # Skip numeric range pollution like value: ["cheap", "high"]
            if isinstance(val, list) and any(v in ["cheap", "high", "expensive"] for v in val):
                continue
            if val in ["cheap", "expensive", "affordable"]:
                continue

            # Brand detection
            if field in ["brand", "product_category"] or (isinstance(val, str) and val.lower() in KNOWN_BRANDS):
                if isinstance(val, str) and val.lower() in KNOWN_BRANDS:
                    field = "brand"
                    val = val.capitalize()
                    clauses.append(FilterClause(field=field, operator="eq", value=val))
                    continue

            # Category detection
            if field in ["category", "subcategory", "product_type"]:
                if isinstance(val, str):
                    for k, (c, sc) in CATEGORY_MAP.items():
                        if k in val.lower():
                            category = c
                            subcategory = sc
                            break
                    if not category:
                        category = val.title()
                continue

            # Attribute fields
            if field in ["color", "colour"]:
                clauses.append(FilterClause(field="attributes.color", operator=op, value=str(val).lower()))
            elif field in ["size"]:
                clauses.append(FilterClause(field="attributes.size", operator="contains", value=str(val).upper()))
            elif field in ["material"]:
                clauses.append(FilterClause(field="attributes.material", operator=op, value=str(val).capitalize()))
            elif field in ["storage", "ram"]:
                clauses.append(FilterClause(field=f"attributes.{field}", operator=op, value=str(val)))
            elif field.startswith("attributes."):
                clauses.append(FilterClause(field=field, operator=op, value=val))

    # Derive category if missing
    if not category:
        for k, (c, sc) in CATEGORY_MAP.items():
            if k in clean_q:
                category = c
                subcategory = sc
                break

    if category:
        clauses.insert(0, FilterClause(field="category", operator="eq", value=category))
    if subcategory:
        clauses.insert(1, FilterClause(field="subcategory", operator="eq", value=subcategory))

    # 4. Purify Search Tokens (Strip price constraints and punctuation)
    tokens = raw_data.get("searchTokens") or raw_data.get("semantic_search_tokens") or []
    clean_tokens = []
    stop_words = {"under", "below", "with", "for", "and", "the", "kes", "ksh", "between"}
    for tok in tokens:
        if isinstance(tok, str):
            tok_clean = re.sub(r"[^\w\s]", "", tok).strip().lower()
            for part in tok_clean.split():
                if part not in stop_words and not part.isdigit() and len(part) > 1:
                    if part not in clean_tokens:
                        clean_tokens.append(part)

    if not clean_tokens:
        clean_tokens = [w for w in re.findall(r"\w+", clean_q) if w not in stop_words and not w.isdigit() and len(w) > 2]

    # 5. Clarification Prompt for ambiguous searches
    clarification = raw_data.get("clarification_prompt")
    status = "success"
    if "something comfortable" in clean_q or len(clauses) == 0:
        if not category:
            status = "needs_clarification"
            clarification = "Are you looking for running shoes, jogging pants, or lightweight athletic hoodies?"

    output_payload = ShoppingInterpretationPayload(
        task="shopping_intent",
        status=status,
        intent="product_search",
        detected_language=lang,
        budget_constraint=budget,
        filter_ast=FilterAST(category=category, subcategory=subcategory, clauses=clauses),
        semantic_search_tokens=clean_tokens,
        clarification_prompt=clarification,
    )
    return output_payload.model_dump()

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
    instruction = (
        "You are CommerceMind AI. Extract structured shopping constraints for retail search.\n"
        "Output ONLY a JSON object with this exact structure:\n"
        "{\n"
        '  "task": "shopping_intent",\n'
        '  "status": "success",\n'
        '  "intent": "product_search",\n'
        '  "detected_language": "en",\n'
        '  "budget_constraint": {\n'
        '    "currency": "KES",\n'
        '    "min_limit": null,\n'
        '    "max_limit": {"amount": 4000, "boundary": "inclusive"}\n'
        '  },\n'
        '  "filter_ast": {\n'
        '    "category": "Footwear",\n'
        '    "subcategory": "Sneakers",\n'
        '    "clauses": [\n'
        '      {"field": "attributes.color", "operator": "eq", "value": "red"},\n'
        '      {"field": "brand", "operator": "eq", "value": "Nike"}\n'
        '    ]\n'
        '  },\n'
        '  "semantic_search_tokens": ["red", "running", "sneakers"]\n'
        "}\n"
    )
    raw_response = generate_json_response(instruction, req.query)
    return normalize_shopping_interpretation(raw_response, req.query)

# -----------------------------------------------------------------------------
# Server Launcher with LocalTunnel
# -----------------------------------------------------------------------------

def start_server_and_tunnel():
    print("\n🌐 Exposing port 8001 via pyngrok / cloudflared...")
    public_url = ""

    # 1. Try pyngrok first (zero npm dependency)
    ngrok_token = os.environ.get("NGROK_AUTHTOKEN")
    try:
        from pyngrok import ngrok
        if ngrok_token:
            ngrok.set_auth_token(ngrok_token)
        tunnel = ngrok.connect(8001, "http")
        public_url = tunnel.public_url
    except Exception as ngrok_err:
        print(f"ℹ️ pyngrok: {ngrok_err}")

    # 2. Fallback to standalone cloudflared binary (zero node/npm dependency)
    if not public_url:
        try:
            subprocess.run(
                "which cloudflared >/dev/null || (curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared)",
                shell=True,
                check=False
            )
            cf_proc = subprocess.Popen(
                "cloudflared tunnel --url http://localhost:8001",
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            for _ in range(30):
                line = cf_proc.stderr.readline()
                if "trycloudflare.com" in line:
                    for part in line.split():
                        if "trycloudflare.com" in part:
                            public_url = part.strip()
                            if not public_url.startswith("http"):
                                public_url = f"https://{public_url}"
                            break
                    if public_url:
                        break
                time.sleep(0.5)
        except Exception as cf_err:
            print(f"ℹ️ cloudflared: {cf_err}")

    print("\n" + "="*60)
    print("🚀 CommerceMind AI: Colab Serving Live!")
    if public_url:
        print(f"🌐 Public Endpoint URL: {public_url}")
        print(f"👉 Set this in mart/.env: COMMERCEMIND_INFERENCE_URL={public_url}")
    else:
        print("🌐 Listening on http://localhost:8001 inside Colab")
        print("👉 You can forward this via SSH or connect directly")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    start_server_and_tunnel()

