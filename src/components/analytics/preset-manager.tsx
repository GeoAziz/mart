import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ReportTemplate, DynamicReportFilter } from '@/lib/types/analytics';

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: DynamicReportFilter;
}

interface PresetManagerProps {
  templates: ReportTemplate[];
  filterPresets: FilterPreset[];
  currentFilter: DynamicReportFilter;
  onLoadTemplate: (template: ReportTemplate) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  onSaveTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSavePreset: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function PresetManager({
  templates,
  filterPresets,
  currentFilter,
  onLoadTemplate,
  onLoadPreset,
  onSaveTemplate,
  onSavePreset,
}: PresetManagerProps) {
  const { toast } = useToast();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  const handleSaveTemplate = () => {
    if (!newTemplateName) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    onSaveTemplate({
      name: newTemplateName,
      description: newTemplateDesc,
      charts: [], // This should be populated with current chart configurations
      sections: ['overview', 'products', 'categories', 'customers'],
      filters: currentFilter,
    });

    setNewTemplateName('');
    setNewTemplateDesc('');
  };

  const handleSavePreset = () => {
    if (!newPresetName) {
      toast({
        title: "Error",
        description: "Preset name is required",
        variant: "destructive",
      });
      return;
    }

    onSavePreset({
      name: newPresetName,
      description: newPresetDesc,
      filter: currentFilter,
    });

    setNewPresetName('');
    setNewPresetDesc('');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateDesc">Description</Label>
            <Textarea
              id="templateDesc"
              value={newTemplateDesc}
              onChange={(e) => setNewTemplateDesc(e.target.value)}
              placeholder="Enter template description"
            />
          </div>
          <Button onClick={handleSaveTemplate}>Save Template</Button>

          <div className="mt-4 space-y-2">
            <Label>Saved Templates</Label>
            <div className="space-y-2">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => onLoadTemplate(template)}>
                      Load
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="presetName">Preset Name</Label>
            <Input
              id="presetName"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Enter preset name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presetDesc">Description</Label>
            <Textarea
              id="presetDesc"
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
              placeholder="Enter preset description"
            />
          </div>
          <Button onClick={handleSavePreset}>Save Preset</Button>

          <div className="mt-4 space-y-2">
            <Label>Saved Presets</Label>
            <div className="space-y-2">
              {filterPresets.map((preset) => (
                <Card key={preset.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{preset.name}</h4>
                      {preset.description && (
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => onLoadPreset(preset)}>
                      Load
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
