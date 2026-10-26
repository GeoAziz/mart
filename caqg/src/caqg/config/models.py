from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DateWindowConfig(BaseModel):
    model_config = ConfigDict(frozen=True)
    type: str = Field(default="completed_days")
    days: int = Field(default=28, ge=1, le=365)
    lag_days: int = Field(default=2, ge=0, le=14)


class QualityRulesConfig(BaseModel):
    model_config = ConfigDict(frozen=True)
    max_session_drop_percent: float = Field(default=40.0, ge=0.0, le=100.0)
    max_unassigned_share_percent: float = Field(default=20.0, ge=0.0, le=100.0)
    min_session_volume_threshold: int = Field(default=50, ge=0)
    reconciliation_grace_period_hours: int = Field(default=72, ge=1)
    revenue_tolerance_kes: float = Field(default=1.0, ge=0.0)


class PropertyConfig(BaseModel):
    model_config = ConfigDict(frozen=True)
    key: str
    ga4_property_id: str
    timezone: str = Field(default="Africa/Nairobi")
    enabled: bool = Field(default=True)
    reports: List[str] = Field(default_factory=lambda: ["acquisition_overview", "commerce_overview", "commerce_transactions"])
    rules: QualityRulesConfig = Field(default_factory=QualityRulesConfig)


class CAQGGlobalConfig(BaseModel):
    schema_version: str = Field(default="1.0")
    defaults: DateWindowConfig = Field(default_factory=DateWindowConfig)
    properties: List[PropertyConfig] = Field(default_factory=list)

    def get_property(self, key: str) -> Optional[PropertyConfig]:
        for prop in self.properties:
            if prop.key == key:
                return prop
        return None

    def get_enabled_properties(self) -> List[PropertyConfig]:
        return [p for p in self.properties if p.enabled]

