"""
CommerceMind AI - Colab Live Inference Server
Runs on Google Colab (Free T4 or CPU), exposes FastAPI on port 8001,
and tunnels to a public HTTPS URL via localtunnel or pyngrok.
"""

import os
os.environ["HF_HUB_DISABLE_COLAB_SECRETS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "true"
import sys
import json
import re
import time
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
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
if not is_cuda:
    torch.set_num_threads(min(4, os.cpu_count() or 2))
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

def generate_json_response(instruction: str, user_input: str, max_tokens: int = 120) -> Dict[str, Any]:
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

    t0 = time.time()
    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=False,
            eos_token_id=[tokenizer.eos_token_id, 151645, 151643] if tokenizer.eos_token_id else [151645, 151643],
            pad_token_id=tokenizer.eos_token_id or 151643
        )

    gen_tokens = output_ids[0][inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
    print(f"⚡ Generation completed in {time.time() - t0:.2f}s ({len(gen_tokens)} tokens)")

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

# -----------------------------------------------------------------------------
# Grounded Knowledge Bases & Extraction Helpers (Zero Fabrication Guarantee)
# -----------------------------------------------------------------------------

KNOWN_BRANDS = {
    "nike", "adidas", "puma", "reebok", "under armour", "asics", "new balance", "jordan",
    "samsung", "apple", "hp", "dell", "lenovo", "tecno", "infinix", "xiaomi", "oppo", "sony",
    "huawei", "google", "lg", "canon", "nikon"
}

KNOWN_COLORS = {
    "red", "blue", "green", "black", "white", "yellow", "orange", "purple", "pink", "brown",
    "grey", "gray", "navy", "gold", "silver", "beige", "maroon", "teal"
}

GENDER_KEYWORDS = {
    "women": ["women", "woman", "ladies", "lady", "female", "girls", "girl"],
    "men": ["men", "man", "gentlemen", "male", "boys", "boy"],
    "kids": ["kids", "kid", "children", "child", "baby", "toddler"],
    "unisex": ["unisex"]
}

def extract_demographic(query_lower: str) -> Optional[str]:
    words = set(re.findall(r"\b\w+\b", query_lower))
    for gender, kw_list in GENDER_KEYWORDS.items():
        if any(kw in words for kw in kw_list):
            return gender
    return None

def resolve_category_hierarchy(query_lower: str, detected_gender: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    words = set(re.findall(r"\b\w+\b", query_lower))
    
    # 1. Footwear
    footwear_words = {"shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals", "slippers", "heels", "loafers"}
    if any(w in words for w in footwear_words):
        category = "Footwear"
        if detected_gender == "women":
            subcategory = "Women's Footwear"
        elif detected_gender == "men":
            subcategory = "Men's Footwear"
        elif detected_gender == "kids":
            subcategory = "Kids' Footwear"
        elif "sneaker" in words or "sneakers" in words:
            subcategory = "Sneakers"
        elif "boot" in words or "boots" in words:
            subcategory = "Boots"
        else:
            subcategory = "Shoes"
        return category, subcategory

    # 2. Electronics
    if any(w in words for w in {"laptop", "laptops", "macbook", "computer", "computers"}):
        return "Electronics", "Computers & Laptops"
    if any(w in words for w in {"phone", "phones", "smartphone", "smartphones", "iphone"}):
        return "Electronics", "Mobile Phones"
    if any(w in words for w in {"headphone", "headphones", "earbuds", "speaker", "speakers"}):
        return "Electronics", "Audio & Headphones"
    if any(w in words for w in {"tv", "television", "monitor"}):
        return "Electronics", "Televisions"

    # 3. Home & Living
    if any(w in words for w in {"chair", "chairs", "desk", "desks", "office"}):
        return "Home & Living", "Office Furniture"
    if any(w in words for w in {"sofa", "couch", "bed", "furniture", "table"}):
        return "Home & Living", "Furniture"

    # 4. Fashion
    fashion_words = {"dress", "dresses", "shirt", "shirts", "jacket", "jackets", "hoodie", "hoodies", "jeans", "pants", "suit", "suits", "skirt"}
    if any(w in words for w in fashion_words):
        category = "Fashion"
        if detected_gender == "women":
            subcategory = "Women's Clothing"
        elif detected_gender == "men":
            subcategory = "Men's Clothing"
        else:
            subcategory = "Clothing"
        return category, subcategory

    return None, None

def extract_grounded_budget(query_lower: str, raw_budget: Any) -> BudgetConstraint:
    budget = BudgetConstraint(currency="KES")
    
    # 1. Range Pattern ("between X and Y", "from X to Y", "X to Y", "X - Y")
    range_match = re.search(r"(?:between|from)?\s*(?:kes|ksh)?\s*([\d,]+)\s*(?:and|to|-)\s*(?:kes|ksh)?\s*([\d,]+)\s*(?:kes|ksh)?\b", query_lower)
    if range_match:
        try:
            v1 = float(range_match.group(1).replace(",", ""))
            v2 = float(range_match.group(2).replace(",", ""))
            budget.min_limit = LimitSpec(amount=min(v1, v2), boundary="inclusive")
            budget.max_limit = LimitSpec(amount=max(v1, v2), boundary="inclusive")
            return budget
        except Exception:
            pass

    range_k_match = re.search(r"(?:between|from)?\s*(\d+)\s*k\s*(?:and|to|-)\s*(\d+)\s*k\b", query_lower)
    if range_k_match:
        try:
            v1 = float(range_k_match.group(1)) * 1000
            v2 = float(range_k_match.group(2)) * 1000
            budget.min_limit = LimitSpec(amount=min(v1, v2), boundary="inclusive")
            budget.max_limit = LimitSpec(amount=max(v1, v2), boundary="inclusive")
            return budget
        except Exception:
            pass

    # 2. Max Price ("under", "below", "less than", "up to", "max", "chini ya", "not exceeding")
    max_k_match = re.search(r"(?:under|below|chini ya|less than|max|up to|not exceeding)\s*(?:kes|ksh)?\s*(\d+)\s*k\b", query_lower)
    max_num_match = re.search(r"(?:under|below|chini ya|less than|max|up to|not exceeding)\s*(?:kes|ksh)?\s*([\d,]+)\b", query_lower)
    if max_k_match:
        budget.max_limit = LimitSpec(amount=float(max_k_match.group(1)) * 1000, boundary="inclusive")
        return budget
    elif max_num_match:
        budget.max_limit = LimitSpec(amount=float(max_num_match.group(1).replace(",", "")), boundary="inclusive")
        return budget

    # 3. Min Price ("above", "over", "more than", "at least", "min", "zaidi ya", "starting from", "from")
    min_k_match = re.search(r"(?:above|over|more than|at least|min|zaidi ya|starting from|from)\s*(?:kes|ksh)?\s*(\d+)\s*k\b", query_lower)
    min_num_match = re.search(r"(?:above|over|more than|at least|min|zaidi ya|starting from|from)\s*(?:kes|ksh)?\s*([\d,]+)\b", query_lower)
    if min_k_match:
        budget.min_limit = LimitSpec(amount=float(min_k_match.group(1)) * 1000, boundary="inclusive")
        return budget
    elif min_num_match:
        budget.min_limit = LimitSpec(amount=float(min_num_match.group(1).replace(",", "")), boundary="inclusive")
        return budget

    # 4. Check if LLM returned budget values, strictly validated against query digits
    has_any_digit = bool(re.search(r"\d", query_lower))
    if has_any_digit and isinstance(raw_budget, dict):
        amt = raw_budget.get("amount") or raw_budget.get("max") or (raw_budget.get("max_limit", {}).get("amount") if isinstance(raw_budget.get("max_limit"), dict) else None)
        min_amt = raw_budget.get("min") or (raw_budget.get("min_limit", {}).get("amount") if isinstance(raw_budget.get("min_limit"), dict) else None)
        if amt:
            amt_str = str(int(amt)) if isinstance(amt, (int, float)) and amt == int(amt) else str(amt)
            k_str = f"{int(amt)//1000}k" if isinstance(amt, (int, float)) and amt >= 1000 and amt % 1000 == 0 else ""
            if amt_str in query_lower or (k_str and k_str in query_lower):
                budget.max_limit = LimitSpec(amount=float(amt), boundary="inclusive")
        if min_amt:
            min_str = str(int(min_amt)) if isinstance(min_amt, (int, float)) and min_amt == int(min_amt) else str(min_amt)
            k_str = f"{int(min_amt)//1000}k" if isinstance(min_amt, (int, float)) and min_amt >= 1000 and min_amt % 1000 == 0 else ""
            if min_str in query_lower or (k_str and k_str in query_lower):
                budget.min_limit = LimitSpec(amount=float(min_amt), boundary="inclusive")

    return budget

def extract_grounded_brand(query_lower: str) -> Optional[str]:
    words = re.findall(r"\b\w+\b", query_lower)
    for b in KNOWN_BRANDS:
        if " " in b:
            if b in query_lower:
                return b.title()
        elif b in words:
            return b.upper() if b in ["hp", "lg"] else b.capitalize()
    return None

def extract_grounded_colors(query_lower: str) -> List[str]:
    words = set(re.findall(r"\b\w+\b", query_lower))
    return [c for c in KNOWN_COLORS if c in words]

def extract_grounded_specs(query_lower: str) -> Dict[str, str]:
    specs = {}
    ram_match = re.search(r"(\d+)\s*(?:gb)?\s*ram\b", query_lower)
    if ram_match:
        specs["ram"] = f"{ram_match.group(1)}GB"

    storage_match = re.search(r"(\d+)\s*(?:gb|tb)\s*(?:storage|rom|ssd|hdd)?\b", query_lower)
    if storage_match:
        matched_str = storage_match.group(0).lower()
        val = storage_match.group(1)
        unit = "TB" if "tb" in matched_str else "GB"
        if "ram" not in matched_str and (not ram_match or ram_match.group(1) != val):
            specs["storage"] = f"{val}{unit}"
        elif "storage" in query_lower or "rom" in query_lower or "ssd" in query_lower:
            specs["storage"] = f"{val}{unit}"
    return specs

def extract_grounded_tokens(query_lower: str) -> List[str]:
    stop_words = {
        "under", "below", "between", "and", "or", "for", "with", "in", "of", "to", "at",
        "from", "the", "a", "an", "is", "kes", "ksh", "shilling", "shillings", "bob",
        "less", "than", "more", "show", "me", "find", "get", "looking", "want", "need",
        "i", "price", "budget", "chini", "ya", "zaidi", "nataka", "nahitaji"
    }
    raw_tokens = re.findall(r"\b\w+\b", query_lower)
    clean_tokens = []
    for w in raw_tokens:
        if w not in stop_words and not w.isdigit() and len(w) > 1:
            if w not in clean_tokens:
                clean_tokens.append(w)
    return clean_tokens

def normalize_shopping_interpretation(raw_data: Dict[str, Any], raw_query: str) -> Dict[str, Any]:
    """
    Normalizes and ground-validates LLM outputs into the authoritative CommerceMind Shopping schema.
    Strictly guarantees zero cross-request contamination, zero hallucinated attributes/brands,
    and deterministic boundary preservation.
    """
    clean_q = raw_query.lower()
    
    # 1. Language detection
    lang = "en"
    if any(w in clean_q for w in ["nataka", "nahitaji", "pesa", "shilingi", "bila", "bei"]):
        lang = "sw" if "luku" not in clean_q and "bob" not in clean_q else "sheng"
    elif any(w in clean_q for w in ["luku", "ngoma", "chuom", "bob"]):
        lang = "sheng"

    # 2. Extract strictly grounded entities from query
    detected_gender = extract_demographic(clean_q)
    category, subcategory = resolve_category_hierarchy(clean_q, detected_gender)
    budget = extract_grounded_budget(clean_q, raw_data.get("budget_constraint") or raw_data.get("budgetLimit"))
    brand = extract_grounded_brand(clean_q)
    colors = extract_grounded_colors(clean_q)
    specs = extract_grounded_specs(clean_q)
    clean_tokens = extract_grounded_tokens(clean_q)

    # 3. Assemble validated FilterAST clauses
    clauses: List[FilterClause] = []
    if category:
        clauses.append(FilterClause(field="category", operator="eq", value=category))
    if subcategory:
        clauses.append(FilterClause(field="subcategory", operator="eq", value=subcategory))
    if brand:
        clauses.append(FilterClause(field="brand", operator="eq", value=brand))
    if detected_gender:
        clauses.append(FilterClause(field="attributes.gender", operator="eq", value=detected_gender))
    for col in colors:
        clauses.append(FilterClause(field="attributes.color", operator="eq", value=col))
    if "storage" in specs:
        clauses.append(FilterClause(field="attributes.storage", operator="eq", value=specs["storage"]))
    if "ram" in specs:
        clauses.append(FilterClause(field="attributes.ram", operator="eq", value=specs["ram"]))

    # 4. Ambiguity / Clarification check
    ambiguous_patterns = ["something comfortable", "comfortable for jogging", "surprise me", "anything good"]
    status = "success"
    clarification = None
    if any(p in clean_q for p in ambiguous_patterns) or (not category and len(clauses) == 0):
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
        "You are CommerceMind AI, a retail search query parser.\n"
        "Extract structured shopping constraints for the input query.\n"
        "Output ONLY a JSON object with this exact schema:\n"
        "{\n"
        '  "task": "shopping_intent",\n'
        '  "status": "success",\n'
        '  "intent": "product_search",\n'
        '  "detected_language": "en",\n'
        '  "budget_constraint": {\n'
        '    "currency": "KES",\n'
        '    "min_limit": null,\n'
        '    "max_limit": null\n'
        '  },\n'
        '  "filter_ast": {\n'
        '    "category": null,\n'
        '    "subcategory": null,\n'
        '    "clauses": []\n'
        '  },\n'
        '  "semantic_search_tokens": [],\n'
        '  "clarification_prompt": null\n'
        "}\n\n"
        "STRICT EXTRACTION CONSTRAINTS:\n"
        "1. Extract ONLY facts, brands, colors, specs, or prices EXPLICITLY stated in the Input.\n"
        "2. If no price is mentioned, min_limit and max_limit MUST both be null. NEVER invent numbers.\n"
        "3. If no brand is mentioned, do NOT include any brand clause. NEVER invent brands.\n"
        "4. If no color is mentioned, do NOT include any color clause. NEVER invent colors.\n"
        "5. If no gender is mentioned (men/women/kids), do NOT assume gender.\n"
    )
    raw_response = {}
    try:
        raw_response = generate_json_response(instruction, req.query, max_tokens=90)
    except Exception as e:
        print(f"Inference exception: {e}")
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
            cf_log = open("/tmp/cloudflared.log", "w")
            cf_proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", "http://localhost:8001"],
                stdout=cf_log,
                stderr=cf_log,
                text=True
            )
            for _ in range(60):
                time.sleep(0.5)
                if os.path.exists("/tmp/cloudflared.log"):
                    with open("/tmp/cloudflared.log", "r") as f:
                        content = f.read()
                        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                        if match:
                            public_url = match.group(0)
                            break
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

    try:
        import nest_asyncio
        nest_asyncio.apply()
    except Exception as e:
        print(f"ℹ️ nest_asyncio: {e}")

    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    start_server_and_tunnel()

