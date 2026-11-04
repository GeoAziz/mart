'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CommerceMindQualityBadge } from './CommerceMindQualityBadge';
import {
  Sparkles,
  RotateCcw,
  Undo2,
  Check,
  X,
  Edit2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type {
  CommerceMindCatalogEnrichment,
  CommerceMindAttribute,
  CommerceMindProductMetadata,
  CommerceMindProvenanceHistoryItem,
  CommerceMindListingQuality,
} from '@/lib/types';
import { calculateListingQuality } from '@/lib/commercemind-quality';
import { useAuth } from '@/context/AuthContext';

export interface EnrichedProductOutput {
  name?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  tags?: string[];
  commercemind: CommerceMindProductMetadata;
}

interface CommerceMindEnricherProps {
  currentTitle: string;
  currentCategory: string;
  currentDescription: string;
  currentTags?: string[];
  onApplyEnrichment: (output: EnrichedProductOutput) => void;
  className?: string;
}

interface AttributeDecision {
  key: string;
  originalValue: string;
  suggestedValue: string;
  currentValue: string;
  provenance: CommerceMindAttribute['provenance'];
  normalizationState: CommerceMindAttribute['normalization_state'];
  isAccepted: boolean;
  isCustomEdited: boolean;
}

export function CommerceMindEnricher({
  currentTitle,
  currentCategory,
  currentDescription,
  currentTags = [],
  onApplyEnrichment,
  className = '',
}: CommerceMindEnricherProps) {
  const { currentUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Raw vendor text input for enrichment
  const [rawText, setRawText] = useState(
    `${currentTitle ? currentTitle + '. ' : ''}${currentDescription || ''}`.trim()
  );

  // Enrichment Response State
  const [enrichmentData, setEnrichmentData] = useState<CommerceMindCatalogEnrichment | null>(null);
  const [decisions, setDecisions] = useState<Record<string, AttributeDecision>>({});
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [isTitleAccepted, setIsTitleAccepted] = useState(true);
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [isDescriptionAccepted, setIsDescriptionAccepted] = useState(true);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [areTagsAccepted, setAreTagsAccepted] = useState(true);

  // Undo / Provenance History Stack
  const [historyStack, setHistoryStack] = useState<CommerceMindProvenanceHistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const formatAttrValue = (val: CommerceMindAttribute['value']): string => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  /**
   * Trigger AI Enrichment via POST /api/vendor/products/enrich
   */
  const handleEnrich = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please enter product details or a description to enrich.');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const token = currentUser ? await currentUser.getIdToken() : '';
        const res = await fetch('/api/vendor/products/enrich', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text: rawText,
            category: currentCategory || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Enrichment failed (HTTP ${res.status})`);
        }

        const json = await res.json();
        const data: CommerceMindCatalogEnrichment = json.data;

        setEnrichmentData(data);
        setSuggestedTitle(currentTitle || data.product_type || '');
        setSuggestedDescription(data.suggested_description?.text || currentDescription);
        setSuggestedTags(data.normalized_tags || []);

        // Initialize attribute decisions
        const initialDecisions: Record<string, AttributeDecision> = {};
        for (const [key, attr] of Object.entries(data.attributes || {})) {
          const formatted = formatAttrValue(attr.value);
          initialDecisions[key] = {
            key,
            originalValue: '',
            suggestedValue: formatted,
            currentValue: formatted,
            provenance: attr.provenance,
            normalizationState: attr.normalization_state,
            isAccepted: true,
            isCustomEdited: false,
          };
        }
        setDecisions(initialDecisions);
        setHistoryStack([]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error enriching product';
        setErrorMsg(msg);
      }
    });
  };

  /**
   * Toggle single attribute acceptance
   */
  const handleToggleAccept = (key: string) => {
    setDecisions((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const willBeAccepted = !existing.isAccepted;

      // Track provenance
      const historyItem: CommerceMindProvenanceHistoryItem = {
        field: `attributes.${key}`,
        action: willBeAccepted ? 'accept' : 'reject',
        old_value: existing.isAccepted ? existing.currentValue : null,
        new_value: willBeAccepted ? existing.currentValue : null,
        updated_at: new Date().toISOString(),
      };
      setHistoryStack((h) => [...h, historyItem]);

      return {
        ...prev,
        [key]: {
          ...existing,
          isAccepted: willBeAccepted,
        },
      };
    });
  };

  /**
   * Save custom edit for attribute
   */
  const handleSaveEdit = (key: string) => {
    setDecisions((prev) => {
      const existing = prev[key];
      if (!existing) return prev;

      const historyItem: CommerceMindProvenanceHistoryItem = {
        field: `attributes.${key}`,
        action: 'manual_edit',
        old_value: existing.currentValue,
        new_value: editValue,
        updated_at: new Date().toISOString(),
      };
      setHistoryStack((h) => [...h, historyItem]);

      return {
        ...prev,
        [key]: {
          ...existing,
          currentValue: editValue,
          isAccepted: true,
          isCustomEdited: true,
        },
      };
    });
    setEditingField(null);
    setEditValue('');
  };

  /**
   * Undo last decision
   */
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const lastAction = historyStack[historyStack.length - 1];
    setHistoryStack((h) => h.slice(0, -1));

    if (lastAction.field.startsWith('attributes.')) {
      const key = lastAction.field.replace('attributes.', '');
      setDecisions((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        return {
          ...prev,
          [key]: {
            ...existing,
            currentValue: String(lastAction.old_value || existing.suggestedValue),
            isAccepted: lastAction.action === 'reject', // Reverse previous action
            isCustomEdited: false,
          },
        };
      });
    }
  };

  /**
   * Accept all suggestions
   */
  const handleAcceptAll = () => {
    setIsTitleAccepted(true);
    setIsDescriptionAccepted(true);
    setAreTagsAccepted(true);
    setDecisions((prev) => {
      const updated: Record<string, AttributeDecision> = {};
      for (const [k, v] of Object.entries(prev)) {
        updated[k] = { ...v, isAccepted: true };
      }
      return updated;
    });
  };

  /**
   * Reject all suggestions
   */
  const handleRejectAll = () => {
    setIsTitleAccepted(false);
    setIsDescriptionAccepted(false);
    setAreTagsAccepted(false);
    setDecisions((prev) => {
      const updated: Record<string, AttributeDecision> = {};
      for (const [k, v] of Object.entries(prev)) {
        updated[k] = { ...v, isAccepted: false };
      }
      return updated;
    });
  };

  /**
   * Calculate live quality score reflecting current accepted attributes
   */
  const computeActiveQuality = (): CommerceMindListingQuality => {
    if (!enrichmentData) {
      return calculateListingQuality({
        title: currentTitle,
        category: currentCategory,
        description: currentDescription,
        tags: currentTags,
      });
    }

    const activeAttrs: Record<string, CommerceMindAttribute> = {};
    for (const [key, dec] of Object.entries(decisions)) {
      if (dec.isAccepted) {
        activeAttrs[key] = {
          value: dec.currentValue,
          provenance: dec.isCustomEdited ? 'explicitly_supplied' : dec.provenance,
          normalization_state: dec.isCustomEdited ? 'exact' : dec.normalizationState,
        };
      }
    }

    return calculateListingQuality({
      title: isTitleAccepted ? suggestedTitle : currentTitle,
      category: enrichmentData.category,
      description: isDescriptionAccepted ? suggestedDescription : currentDescription,
      attributes: activeAttrs,
      tags: areTagsAccepted ? suggestedTags : currentTags,
      ambiguities: enrichmentData.ambiguities_detected,
    });
  };

  const activeQuality = computeActiveQuality();

  /**
   * Apply accepted changes to the parent form
   */
  const handleApply = () => {
    if (!enrichmentData) return;

    const acceptedAttributes: Record<string, CommerceMindAttribute> = {};
    const rejectedAttributes: string[] = [];

    for (const [key, dec] of Object.entries(decisions)) {
      if (dec.isAccepted) {
        acceptedAttributes[key] = {
          value: dec.currentValue,
          provenance: dec.isCustomEdited ? 'explicitly_supplied' : dec.provenance,
          normalization_state: dec.isCustomEdited ? 'exact' : dec.normalizationState,
          raw_source: dec.suggestedValue,
        };
      } else {
        rejectedAttributes.push(key);
      }
    }

    const metadata: CommerceMindProductMetadata = {
      version: '1.0',
      enrichedAt: new Date().toISOString(),
      raw_vendor_input: rawText,
      subcategory: enrichmentData.subcategory,
      productType: enrichmentData.product_type,
      attributes: acceptedAttributes,
      accepted_attributes: acceptedAttributes,
      rejected_attributes: rejectedAttributes,
      normalizedTags: areTagsAccepted ? suggestedTags : currentTags,
      qualityScore: activeQuality.score,
      qualityGrade: activeQuality.grade,
      qualityBreakdown: activeQuality.breakdown,
      provenance_history: historyStack,
    };

    onApplyEnrichment({
      name: isTitleAccepted && suggestedTitle ? suggestedTitle : undefined,
      category: enrichmentData.category || undefined,
      subcategory: enrichmentData.subcategory || undefined,
      description: isDescriptionAccepted && suggestedDescription ? suggestedDescription : undefined,
      tags: areTagsAccepted ? suggestedTags : undefined,
      commercemind: metadata,
    });
  };

  const getProvenanceBadge = (prov: CommerceMindAttribute['provenance']) => {
    switch (prov) {
      case 'explicitly_supplied':
        return <Badge variant="success" className="text-[10px]">Explicit</Badge>;
      case 'normalized':
        return <Badge variant="info" className="text-[10px]">Normalized</Badge>;
      case 'inferred':
        return <Badge variant="warning" className="text-[10px]">Inferred</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Unknown</Badge>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="commercemind-enricher">
      {/* AI Extraction Trigger Section */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-50/50 via-background to-purple-50/50 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              <CardTitle className="text-base font-semibold">CommerceMind AI Catalog Enrichment</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono">Engine v1.0</Badge>
          </div>
          <CardDescription className="text-xs">
            Paste unformatted product specifications, title, or supplier notes. The AI will extract normalized
            attributes, compute search tags, and score your listing quality.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Ankara wrap dress with puff sleeves, 100% cotton, fits size 10 to 14, yellow and blue print, machine washable."
            rows={3}
            className="text-sm font-sans"
            data-testid="enricher-raw-text-input"
          />

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-2 rounded-md border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Original vendor text is preserved non-destructively.</span>
            <Button
              type="button"
              onClick={handleEnrich}
              disabled={isPending || !rawText.trim()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              size="sm"
              data-testid="enrich-action-button"
            >
              <Sparkles className="w-4 h-4" />
              {isPending ? 'Enriching...' : 'Enrich with AI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results & Field-Level Approval Studio */}
      {enrichmentData && (
        <div className="space-y-4">
          {/* Quality Audit Gauge */}
          <CommerceMindQualityBadge
            quality={activeQuality}
            missingSpecs={enrichmentData.missing_specifications}
            ambiguities={enrichmentData.ambiguities_detected}
          />

          {/* Granular Field Review Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Field-Level AI Suggestions</CardTitle>
                  <CardDescription className="text-xs">
                    Accept, reject, or fine-tune individual attributes before applying them to your product listing.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyStack.length === 0}
                    className="gap-1 h-8 text-xs"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Undo ({historyStack.length})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptAll}
                    className="gap-1 h-8 text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRejectAll}
                    className="gap-1 h-8 text-xs text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-3.5 h-3.5" /> Reject All
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* Category & Subcategory Header */}
              <div className="p-3 bg-muted/40 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-muted-foreground mr-1">Taxonomy:</span>
                  <span className="font-semibold text-foreground">{enrichmentData.category}</span>
                  <span className="mx-1.5 text-muted-foreground">›</span>
                  <span className="font-semibold text-foreground">{enrichmentData.subcategory}</span>
                  <span className="mx-1.5 text-muted-foreground">›</span>
                  <span className="font-medium text-foreground">{enrichmentData.product_type}</span>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  Status: {enrichmentData.status}
                </Badge>
              </div>

              {/* Attributes Table */}
              <div className="border rounded-md divide-y text-xs">
                {Object.entries(decisions).map(([key, dec]) => {
                  const isEditing = editingField === key;
                  return (
                    <div
                      key={key}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        dec.isAccepted ? 'bg-background' : 'bg-muted/30 opacity-70'
                      }`}
                      data-testid={`attr-row-${key}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={dec.isAccepted}
                          onCheckedChange={() => handleToggleAccept(key)}
                          id={`check-${key}`}
                          data-testid={`checkbox-${key}`}
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`check-${key}`}
                              className="font-medium capitalize cursor-pointer text-foreground"
                            >
                              {key.replace(/_/g, ' ')}
                            </label>
                            {getProvenanceBadge(dec.provenance)}
                            {dec.isCustomEdited && (
                              <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 text-xs w-48"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-emerald-600"
                                  onClick={() => handleSaveEdit(key)}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground"
                                  onClick={() => setEditingField(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span className="font-mono text-foreground font-semibold">
                                {dec.currentValue || '<Empty>'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingField(key);
                              setEditValue(dec.currentValue);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                        )}
                        <Badge
                          variant={dec.isAccepted ? 'success' : 'outline'}
                          className="text-[11px] cursor-pointer"
                          onClick={() => handleToggleAccept(key)}
                        >
                          {dec.isAccepted ? 'Accepted' : 'Rejected'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Suggested Description Card */}
              {suggestedDescription && (
                <div
                  className={`p-3 rounded-md border text-xs space-y-1.5 transition-colors ${
                    isDescriptionAccepted ? 'bg-background' : 'bg-muted/30 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isDescriptionAccepted}
                        onCheckedChange={() => setIsDescriptionAccepted((v) => !v)}
                        id="check-description"
                      />
                      <label htmlFor="check-description" className="font-semibold cursor-pointer">
                        Grounded AI Description
                      </label>
                      <Badge variant="outline" className="text-[10px]">
                        {enrichmentData.suggested_description?.style || 'professional'}
                      </Badge>
                    </div>
                    <Badge variant={isDescriptionAccepted ? 'success' : 'outline'} className="text-[11px]">
                      {isDescriptionAccepted ? 'Accepted' : 'Rejected'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground italic pl-6">{suggestedDescription}</p>
                </div>
              )}

              {/* Normalized Tags */}
              {suggestedTags.length > 0 && (
                <div
                  className={`p-3 rounded-md border text-xs space-y-1.5 transition-colors ${
                    areTagsAccepted ? 'bg-background' : 'bg-muted/30 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={areTagsAccepted}
                        onCheckedChange={() => setAreTagsAccepted((v) => !v)}
                        id="check-tags"
                      />
                      <label htmlFor="check-tags" className="font-semibold cursor-pointer">
                        Search Optimization Tags
                      </label>
                    </div>
                    <Badge variant={areTagsAccepted ? 'success' : 'outline'} className="text-[11px]">
                      {areTagsAccepted ? 'Accepted' : 'Rejected'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {suggestedTags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  {Object.values(decisions).filter((d) => d.isAccepted).length} of{' '}
                  {Object.keys(decisions).length} attributes accepted.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEnrich}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="apply-enrichment-button"
                >
                  <Check className="w-4 h-4" /> Apply Accepted Changes
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
