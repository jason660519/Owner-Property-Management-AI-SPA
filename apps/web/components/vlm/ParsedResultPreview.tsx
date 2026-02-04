/**
 * @file ParsedResultPreview.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-04
 * @modifiedBy Claude Sonnet 4.5
 */

// filepath: apps/web/components/vlm/ParsedResultPreview.tsx
// description: Preview component for VLM parsing results

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Edit2,
  ArrowRight,
} from 'lucide-react';

interface FieldValidation {
  is_valid: boolean;
  error_message?: string;
  confidence?: number;
}

interface ParsedData {
  owner_name?: string;
  property_address?: string;
  building_number?: string;
  land_lot_number?: string;
}

interface ParsedResultPreviewProps {
  data: {
    extracted_data: ParsedData;
    field_validations?: Record<string, FieldValidation>;
    confidence_score?: number;
    warnings?: string[];
  };
  onAutoFill?: (mode: 'one_click' | 'selective', data: Partial<ParsedData>) => void;
}

/**
 * Preview component for displaying VLM parsing results
 *
 * Features:
 * - Show extracted fields with validation status
 * - Allow manual editing of extracted data
 * - One-click or selective auto-fill options
 * - Display confidence scores and warnings
 */
export function ParsedResultPreview({ data, onAutoFill }: ParsedResultPreviewProps) {
  const [editableData, setEditableData] = useState<ParsedData>(data.extracted_data);

  const handleFieldChange = (field: keyof ParsedData, value: string) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOneClickFill = () => {
    onAutoFill?.('one_click', editableData);
  };

  const handleSelectiveFill = () => {
    // For now, same as one-click
    // In future, can add checkbox UI for field selection
    onAutoFill?.('selective', editableData);
  };

  const getValidationIcon = (fieldName: string) => {
    const validation = data.field_validations?.[fieldName];
    if (!validation) return null;

    if (validation.is_valid) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;

    const variant =
      score >= 0.9 ? 'default' : score >= 0.75 ? 'secondary' : 'destructive';
    const label = score >= 0.9 ? '高信度' : score >= 0.75 ? '中信度' : '低信度';

    return (
      <Badge variant={variant} className="ml-2">
        {label} ({(score * 100).toFixed(0)}%)
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              文件解析完成
            </CardTitle>
            <CardDescription>請檢查解析結果，並選擇要填入表單的欄位</CardDescription>
          </div>
          {getConfidenceBadge(data.confidence_score)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {data.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Parsed Fields */}
        <div className="space-y-3">
          {/* Owner Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="owner_name" className="flex items-center gap-2">
                所有權人姓名
                {getValidationIcon('owner_name')}
              </Label>
              {data.field_validations?.owner_name?.confidence &&
                getConfidenceBadge(data.field_validations.owner_name.confidence)}
            </div>
            <Input
              id="owner_name"
              value={editableData.owner_name || ''}
              onChange={(e) => handleFieldChange('owner_name', e.target.value)}
              className={
                data.field_validations?.owner_name?.is_valid === false
                  ? 'border-red-500'
                  : ''
              }
            />
            {data.field_validations?.owner_name?.error_message && (
              <p className="text-xs text-red-600">
                {data.field_validations.owner_name.error_message}
              </p>
            )}
          </div>

          {/* Property Address */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="property_address" className="flex items-center gap-2">
                物件地址
                {getValidationIcon('property_address')}
              </Label>
              {data.field_validations?.property_address?.confidence &&
                getConfidenceBadge(data.field_validations.property_address.confidence)}
            </div>
            <Input
              id="property_address"
              value={editableData.property_address || ''}
              onChange={(e) => handleFieldChange('property_address', e.target.value)}
              className={
                data.field_validations?.property_address?.is_valid === false
                  ? 'border-red-500'
                  : ''
              }
            />
            {data.field_validations?.property_address?.error_message && (
              <p className="text-xs text-red-600">
                {data.field_validations.property_address.error_message}
              </p>
            )}
          </div>

          {/* Building Number (Optional) */}
          {editableData.building_number && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="building_number" className="flex items-center gap-2">
                  建號
                  {getValidationIcon('building_number')}
                </Label>
              </div>
              <Input
                id="building_number"
                value={editableData.building_number || ''}
                onChange={(e) => handleFieldChange('building_number', e.target.value)}
              />
            </div>
          )}

          {/* Land Lot Number (Optional) */}
          {editableData.land_lot_number && (
            <div className="space-y-1">
              <Label htmlFor="land_lot_number">地號</Label>
              <Input
                id="land_lot_number"
                value={editableData.land_lot_number || ''}
                onChange={(e) => handleFieldChange('land_lot_number', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleOneClickFill}
            className="flex-1"
            disabled={!data.field_validations?.owner_name?.is_valid}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            一鍵帶入全部
          </Button>
          <Button onClick={handleSelectiveFill} variant="outline" className="flex-1">
            <Edit2 className="mr-2 h-4 w-4" />
            選擇性帶入
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-600">
          提示：您可以手動修改上方欄位後再帶入表單
        </p>
      </CardContent>
    </Card>
  );
}
