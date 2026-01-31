// filepath: apps/mobile/src/components/documents/OCRResultDialog.tsx
// description: Dialog for viewing OCR results with formatted display
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { PropertyDocument, OCRParsedData, OCRMetadata } from '../../types/documents';

interface OCRResultDialogProps {
  visible: boolean;
  document: PropertyDocument | null;
  onClose: () => void;
}

export default function OCRResultDialog({
  visible,
  document,
  onClose,
}: OCRResultDialogProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  if (!document) return null;

  const parsedData = document.ocr_parsed_data as OCRParsedData | null;
  const metadata: OCRMetadata = {
    engine: document.ocr_engine,
    confidence_score: document.ocr_confidence_score,
    processed_at: document.ocr_processed_at,
  };

  const renderFormattedView = () => {
    if (!parsedData) {
      return (
        <View style={styles.emptyState}>
          <FontAwesome5 name="file-alt" size={48} color="#666" />
          <Text style={styles.emptyText}>尚未解析 OCR 資料</Text>
        </View>
      );
    }

    return (
      <View style={styles.formattedContainer}>
        {/* Basic Info */}
        {parsedData.basic_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本資訊</Text>
            {parsedData.basic_info.document_number && (
              <DataRow label="文件編號" value={parsedData.basic_info.document_number} />
            )}
            {parsedData.basic_info.issue_date && (
              <DataRow label="發行日期" value={parsedData.basic_info.issue_date} />
            )}
            {parsedData.basic_info.location && (
              <DataRow label="位置" value={parsedData.basic_info.location} />
            )}
          </View>
        )}

        {/* Ownership */}
        {parsedData.ownership && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>所有權資訊</Text>
            {parsedData.ownership.owner_name && (
              <DataRow label="所有者姓名" value={parsedData.ownership.owner_name} />
            )}
            {parsedData.ownership.owner_id && (
              <DataRow label="身分證字號" value={parsedData.ownership.owner_id} />
            )}
            {parsedData.ownership.ownership_ratio && (
              <DataRow label="持分比例" value={parsedData.ownership.ownership_ratio} />
            )}
          </View>
        )}

        {/* Building Profile */}
        {parsedData.building_profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>建物資訊</Text>
            {parsedData.building_profile.building_type && (
              <DataRow label="建物類型" value={parsedData.building_profile.building_type} />
            )}
            {parsedData.building_profile.construction_date && (
              <DataRow label="建造日期" value={parsedData.building_profile.construction_date} />
            )}
            {parsedData.building_profile.floor_info && (
              <DataRow label="樓層資訊" value={parsedData.building_profile.floor_info} />
            )}
          </View>
        )}

        {/* Area Summary */}
        {parsedData.area_summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>面積摘要</Text>
            {parsedData.area_summary.area_sqm && (
              <DataRow label="面積（平方公尺）" value={`${parsedData.area_summary.area_sqm} m²`} />
            )}
            {parsedData.area_summary.area_ping && (
              <DataRow label="面積（坪）" value={`${parsedData.area_summary.area_ping} 坪`} />
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRawView = () => {
    if (!parsedData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>無 JSON 資料</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.rawContainer}>
        <Text style={styles.jsonText}>
          {JSON.stringify(parsedData, null, 2)}
        </Text>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FontAwesome5 name="file-contract" size={24} color="#7C3AED" />
            <Text style={styles.headerTitle}>OCR 結果</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome5 name="times" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Metadata Bar */}
        <View style={styles.metadataBar}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>引擎</Text>
            <Text style={styles.metadataValue}>
              {metadata.engine || 'N/A'}
            </Text>
          </View>
          {metadata.confidence_score !== undefined && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>信心分數</Text>
              <Text style={[
                styles.metadataValue,
                { color: getConfidenceColor(metadata.confidence_score) }
              ]}>
                {metadata.confidence_score.toFixed(1)}%
              </Text>
            </View>
          )}
          {metadata.processed_at && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>處理時間</Text>
              <Text style={styles.metadataValue}>
                {new Date(metadata.processed_at).toLocaleString('zh-TW')}
              </Text>
            </View>
          )}
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'formatted' && styles.tabActive]}
            onPress={() => setViewMode('formatted')}
          >
            <Text style={[styles.tabText, viewMode === 'formatted' && styles.tabTextActive]}>
              格式化
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'raw' && styles.tabActive]}
            onPress={() => setViewMode('raw')}
          >
            <Text style={[styles.tabText, viewMode === 'raw' && styles.tabTextActive]}>
              JSON 原始
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {viewMode === 'formatted' ? renderFormattedView() : renderRawView()}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Helper component
function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

function getConfidenceColor(score: number): string {
  if (score >= 90) return '#10B981'; // Green
  if (score >= 70) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    padding: 8,
  },
  metadataBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#262626',
  },
  metadataItem: {
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    padding: 4,
    margin: 16,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formattedContainer: {
    gap: 16,
  },
  section: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dataLabel: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  rawContainer: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FFF',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
