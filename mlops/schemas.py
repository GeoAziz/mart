import json
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

# ---------------------------------------------------------
# Engine 1: Catalog Intelligence Models
# ---------------------------------------------------------

class AttributeItem(BaseModel):
    value: Optional[Union[str, float, int, bool, List[Union[str, int]]]] = None
    provenance: str = Field(..., pattern="^(explicitly_supplied|normalized|inferred|unknown)$")
    normalization_state: str = Field(..., pattern="^(exact|approximate|unresolved|not_applicable)$")
    raw_source: Optional[str] = None

class AmbiguityItem(BaseModel):
    field: str
    raw_token: str
    possible_values: List[str]
    action_taken: str = Field(..., pattern="^(retained_all|flagged_for_review)$")

class SuggestedDescription(BaseModel):
    text: str
    style: str = Field(..., pattern="^(professional|technical|casual)$")
    grounded_on_facts_only: bool

class QualityBreakdown(BaseModel):
    title_clarity: int = Field(..., ge=0, le=25)
    attribute_completeness: int = Field(..., ge=0, le=45)
    description_depth: int = Field(..., ge=0, le=15)
    tag_coverage: int = Field(..., ge=0, le=15)

class ListingQuality(BaseModel):
    score: int = Field(..., ge=0, le=100)
    grade: str = Field(..., pattern="^(A|B|C|D|Incomplete)$")
    breakdown: QualityBreakdown

class CatalogEnrichmentPayload(BaseModel):
    task: str = Field("catalog_enrichment", pattern="^catalog_enrichment$")
    status: str = Field(..., pattern="^(success|needs_clarification|low_confidence|validation_failed)$")
    category: str
    subcategory: str
    product_type: str
    attributes: Dict[str, AttributeItem]
    ambiguities_detected: List[AmbiguityItem]
    missing_specifications: List[str]
    normalized_tags: List[str]
    suggested_description: SuggestedDescription
    listing_quality: ListingQuality

# ---------------------------------------------------------
# Engine 2: Shopping Intelligence Models
# ---------------------------------------------------------

class LimitSpec(BaseModel):
    amount: float
    boundary: str = Field(..., pattern="^(inclusive|exclusive)$")

class BudgetConstraint(BaseModel):
    currency: str = Field(..., pattern="^(KES|USD)$")
    min_limit: Optional[LimitSpec] = None
    max_limit: Optional[LimitSpec] = None

class FilterClause(BaseModel):
    field: str = Field(..., pattern="^(category|subcategory|price|attributes\\.size|attributes\\.color|attributes\\.material|attributes\\.style|attributes\\.fit|attributes\\.occasion)$")
    operator: str = Field(..., pattern="^(eq|neq|in|nin|contains|gte|gt|lte|lt)$")
    value: Union[str, float, int, bool, List[Union[str, float, int]]]

class FilterAST(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    clauses: List[FilterClause]

class ShoppingInterpretationPayload(BaseModel):
    task: str = Field("shopping_intent", pattern="^shopping_intent$")
    status: str = Field(..., pattern="^(success|needs_clarification|low_confidence|unsupported_task)$")
    intent: str = Field(..., pattern="^(product_search|product_comparison|compatibility_query|store_policy|chitchat)$")
    detected_language: str = Field(..., pattern="^(en|sw|sheng|mixed)$")
    budget_constraint: BudgetConstraint
    filter_ast: FilterAST
    semantic_search_tokens: List[str]
    clarification_prompt: Optional[str] = None

# ---------------------------------------------------------
# Full Training Sample Container
# ---------------------------------------------------------

class TrainingSample(BaseModel):
    id: str
    task: str
    cluster_id: str
    data_provenance: str = Field(..., pattern="^(human_curated|synthetic_reviewed)$")
    language: str = Field(..., pattern="^(en|sw|sheng|mixed)$")
    instruction: str
    input: str
    output: Union[CatalogEnrichmentPayload, ShoppingInterpretationPayload]

