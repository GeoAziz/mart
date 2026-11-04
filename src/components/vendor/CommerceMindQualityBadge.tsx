'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import type { CommerceMindListingQuality, CommerceMindAmbiguity } from '@/lib/types';

interface QualityBadgeProps {
  quality: CommerceMindListingQuality;
  missingSpecs?: string[];
  ambiguities?: CommerceMindAmbiguity[];
  className?: string;
}

export function CommerceMindQualityBadge({
  quality,
  missingSpecs = [],
  ambiguities = [],
  className = '',
}: QualityBadgeProps) {
  const { score, grade, breakdown } = quality;

  const getGradeVariant = (g: string): 'success' | 'info' | 'warning' | 'destructive' => {
    switch (g) {
      case 'A':
        return 'success';
      case 'B':
        return 'info';
      case 'C':
        return 'warning';
      default:
        return 'destructive';
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (s >= 75) return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
    if (s >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <Card className={`border shadow-sm ${className}`} data-testid="commercemind-quality-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <CardTitle className="text-base font-semibold">Listing Quality Audit</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getGradeVariant(grade)} className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              Grade {grade}
            </Badge>
            <div
              className={`flex items-center justify-center font-mono font-bold text-sm px-2.5 py-1 rounded-md border ${getScoreColor(
                score
              )}`}
              data-testid="quality-score-value"
            >
              {score}/100
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Breakdown Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Title Clarity</span>
              <span className="font-medium text-foreground">{breakdown.title_clarity}/25</span>
            </div>
            <Progress value={(breakdown.title_clarity / 25) * 100} className="h-1.5" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Attribute Completeness</span>
              <span className="font-medium text-foreground">{breakdown.attribute_completeness}/45</span>
            </div>
            <Progress value={(breakdown.attribute_completeness / 45) * 100} className="h-1.5" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Description Depth</span>
              <span className="font-medium text-foreground">{breakdown.description_depth}/15</span>
            </div>
            <Progress value={(breakdown.description_depth / 15) * 100} className="h-1.5" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Tag Coverage</span>
              <span className="font-medium text-foreground">{breakdown.tag_coverage}/15</span>
            </div>
            <Progress value={(breakdown.tag_coverage / 15) * 100} className="h-1.5" />
          </div>
        </div>

        {/* Ambiguities Alert */}
        {ambiguities.length > 0 && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold">Unresolved Ambiguities Detected:</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                {ambiguities.map((amb, i) => (
                  <li key={i}>
                    Field <span className="font-mono font-medium">{amb.field}</span> has compound value &ldquo;
                    {amb.raw_token}&rdquo; ({amb.possible_values.join(', ')})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Missing Specifications */}
        {missingSpecs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Missing Recommended:
            </span>
            {missingSpecs.map((spec, i) => (
              <Badge key={i} variant="outline" className="text-xs text-muted-foreground border-dashed">
                +{spec.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
