"""
CommerceMind AI - Local Standalone Inference Engine
Provides immediate, zero-GPU, zero-cloud deterministic inference
implementing the exact RFC v1.1 schemas for Engine 1 and Engine 2.
"""

import re
import time
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="CommerceMind Local Inference Engine",
    description="Stand-alone local rule & pattern inference matching RFC v1.1 schemas",
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
# Dictionaries & Taxonomy
# -----------------------------------------------------------------------------

CATEGORIES = {
    "shoe": ("Footwear", "Men's Footwear", "Shoes"),
    "boot": ("Footwear", "Men's Footwear", "Boots"),
    "sneaker": ("Footwear", "Men's Footwear", "Sneakers"),
    "ngoma": ("Footwear", "Men's Footwear", "Canvas Sneaker"),
    "dress": ("Fashion", "Women's Clothing", "Dress"),
    "skirt": ("Fashion", "Women's Clothing", "Skirt"),
    "top": ("Fashion", "Women's Clothing", "Blouse & Tops"),
    "blouse": ("Fashion", "Women's Clothing", "Blouse & Tops"),
    "shirt": ("Fashion", "Men's Clothing", "Button-down Shirt"),
    "trouser": ("Fashion", "Men's Clothing", "Trousers / Chino"),
    "chino": ("Fashion", "Men's Clothing", "Chino"),
    "bag": ("Bags & Accessories", "Handbags & Totes", "Bag"),
    "backpack": ("Bags & Accessories", "Handbags & Totes", "Backpack"),
    "handbag": ("Bags & Accessories", "Handbags & Totes", "Handbag"),
    "briefcase": ("Bags & Accessories", "Handbags & Totes", "Briefcase"),
    "belt": ("Bags & Accessories", "Accessories", "Belt"),
    "watch": ("Bags & Accessories", "Accessories", "Watch")
}

COLORS = [
    ("Black", ["black", "jet black", "blk"]),
    ("Navy Blue", ["navy blue", "navy", "navy bl"]),
    ("Brown", ["brown", "deep brown"]),
    ("Yellow", ["yellow", "bright yellow"]),
    ("Burgundy", ["burgundy", "maroon", "wine"]),
    ("White", ["white", "pure white"]),
    ("Green", ["green", "olive green", "army green"])
]

MATERIALS = [
    ("Cotton", ["cotton", "pure cotton", "100% cotton"]),
    ("Cotton Blend", ["cotton blend", "poly cotton"]),
    ("Genuine Leather", ["genuine leather", "leather hide", "pure leather"]),
    ("Synthetic PU Leather", ["leatherette", "pu leather", "faux leather"]),
    ("Linen", ["linen", "breathable linen"]),
    ("Denim", ["denim", "jean"]),
    ("Canvas", ["canvas"]),
    ("Suede", ["suede"])
]

class EnrichRequest(BaseModel):
    text: str
    category_hint: Optional[str] = None

class InterpretRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/v1/health")
async def health():
    return {
        "status": "healthy",
        "engine": "CommerceMind Local Rule & Pattern Engine",
        "version": "1.1.0",
        "mode": "standalone_cpu",
        "timestamp": time.time()
    }

@app.post("/v1/catalog/enrich")
async def enrich(req: EnrichRequest):
    text = req.text.lower()
    
    # 1. Detect Category & Type
    cat, subcat, ptype = ("Fashion", "General Apparel", "Apparel")
    for keyword, (c, sc, pt) in CATEGORIES.items():
        if keyword in text:
            cat, subcat, ptype = (c, sc, pt)
            break
            
    # 2. Extract Color
    detected_color, color_raw = "Multi-color", None
    for canonical, synonyms in COLORS:
        for syn in synonyms:
            if syn in text:
                detected_color = canonical
                color_raw = syn
                break
        if color_raw:
            break

    # 3. Extract Material
    detected_mat, mat_raw, mat_state = "Standard Fabric", None, "exact"
    for canonical, synonyms in MATERIALS:
        for syn in synonyms:
            if syn in text:
                detected_mat = canonical
                mat_raw = syn
                break
        if mat_raw:
            break

    # 4. Extract Size & Handle Ambiguity
    size_val, size_raw, size_state = "Standard", None, "exact"
    ambiguities = []
    
    if "m/l" in text or "l/xl" in text:
        possible = ["M", "L"] if "m/l" in text else ["L", "XL"]
        raw = "m/l" if "m/l" in text else "l/xl"
        size_val = possible
        size_raw = raw
        size_state = "unresolved"
        ambiguities.append({
            "field": "size",
            "raw_token": raw,
            "possible_values": possible,
            "action_taken": "retained_all"
        })
    else:
        for s in ["xxl", "xl", "l", "m", "s", "40", "41", "42", "43", "44", "45"]:
            if re.search(rf"\b{s}\b", text):
                size_val = s.upper()
                size_raw = s
                break

    # 5. Check Water Resistance Claims
    water_val = None
    water_prov = "unknown"
    water_state = "not_applicable"
    raw_water = None
    if "waterproof look" in text or "waterproof-looking" in text:
        water_val = None
        water_prov = "unknown"
        water_state = "unresolved"
        raw_water = "waterproof look"
        ambiguities.append({
            "field": "water_resistance",
            "raw_token": "waterproof look",
            "possible_values": ["Water-resistant finish", "Aesthetic sheen only"],
            "action_taken": "flagged_for_review"
        })
    elif "waterproof" in text:
        water_val = True
        water_prov = "explicitly_supplied"
        water_state = "exact"
        raw_water = "waterproof"

    # 6. Attributes mapping with provenance
    attributes = {
        "color": {
            "value": detected_color,
            "provenance": "explicitly_supplied" if color_raw else "inferred",
            "normalization_state": "exact",
            "raw_source": color_raw
        },
        "material": {
            "value": detected_mat,
            "provenance": "explicitly_supplied" if mat_raw else "inferred",
            "normalization_state": mat_state,
            "raw_source": mat_raw
        },
        "size": {
            "value": size_val,
            "provenance": "explicitly_supplied" if size_raw else "unknown",
            "normalization_state": size_state,
            "raw_source": size_raw
        }
    }
    if raw_water:
        attributes["water_resistance"] = {
            "value": water_val,
            "provenance": water_prov,
            "normalization_state": water_state,
            "raw_source": raw_water
        }

    # Normalized tags
    tags = list(set([cat.lower(), subcat.lower(), ptype.lower(), detected_color.lower(), "kenya retail"]))

    # Grounded description
    desc = f"Authentic {ptype} in {detected_color.lower()} crafted with {detected_mat.lower()}."

    return {
        "task": "catalog_enrichment",
        "status": "success",
        "category": cat,
        "subcategory": subcat,
        "product_type": ptype,
        "attributes": attributes,
        "ambiguities_detected": ambiguities,
        "missing_specifications": ["care_instructions", "country_of_origin"],
        "normalized_tags": tags,
        "suggested_description": {
            "text": desc,
            "style": "professional",
            "grounded_on_facts_only": True
        },
        "listing_quality": {
            "score": 85 if not ambiguities else 78,
            "grade": "B" if not ambiguities else "C",
            "breakdown": {
                "title_clarity": 20,
                "attribute_completeness": 35 if not ambiguities else 28,
                "description_depth": 15,
                "tag_coverage": 15
            }
        }
    }

@app.post("/v1/shopping/interpret")
async def interpret(req: InterpretRequest):
    q = req.query.lower()
    
    # 1. Language detection
    lang = "en"
    if any(w in q for w in ["nataka", "nahitaji", "pesa", "shilingi", "bila", "lakini"]):
        lang = "sw" if "bob" not in q and "luku" not in q else "sheng"
    elif any(w in q for w in ["luku", "ngoma", "chuom", "bob"]):
        lang = "sheng"

    # 2. Extract Category
    cat, subcat = None, None
    for keyword, (c, sc, _) in CATEGORIES.items():
        if keyword in q:
            cat, subcat = c, sc
            break

    # 3. Extract Budget
    max_price, min_price = None, None
    # match patterns like "under 4000", "4k", "4,000", "below 5000", "not exceeding 4500"
    k_match = re.search(r"(\d+)\s*k\b", q)
    num_match = re.search(r"(?:under|below|zisizozidi|chini ya|less than)\s*(?:kes|ksh)?\s*([\d,]+)", q)
    
    if k_match:
        max_price = float(k_match.group(1)) * 1000
    elif num_match:
        max_price = float(num_match.group(1).replace(",", ""))
    else:
        # direct number extraction
        direct_nums = re.findall(r"\b(\d{3,6})\b", q)
        if direct_nums:
            max_price = float(direct_nums[-1])

    # 4. Negative filter (e.g. sitaki suede, no leatherette)
    neg_material = []
    if "sitaki suede" in q or "no suede" in q or "bila suede" in q:
        neg_material.append("Suede")
    if "sitaki mtumba" in q or "no second hand" in q:
        neg_material.append("Used / Mitumba")

    # 5. Extract Size
    detected_size = None
    size_match = re.search(r"\bsize\s*(\d{2}|[smlx]+)\b", q)
    if size_match:
        detected_size = size_match.group(1).upper()

    # 6. Build Filter AST clauses
    clauses = []
    if cat:
        clauses.append({"field": "category", "operator": "eq", "value": cat})
    if subcat:
        clauses.append({"field": "subcategory", "operator": "eq", "value": subcat})
    if detected_size:
        clauses.append({"field": "attributes.size", "operator": "contains", "value": detected_size})
    if neg_material:
        clauses.append({"field": "attributes.material", "operator": "nin", "value": neg_material})

    return {
        "task": "shopping_intent",
        "status": "success",
        "intent": "product_search",
        "detected_language": lang,
        "budget_constraint": {
            "currency": "KES",
            "min_limit": None,
            "max_limit": {"amount": max_price, "boundary": "inclusive"} if max_price else None
        },
        "filter_ast": {
            "category": cat,
            "subcategory": subcat,
            "clauses": clauses
        },
        "semantic_search_tokens": [w for w in re.findall(r"\w+", q) if len(w) > 2],
        "clarification_prompt": None
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)

