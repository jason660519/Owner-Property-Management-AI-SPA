// filepath: apps/mobile/src/screens/dashboard/DocumentsScreen.tsx
// description: Document management screen integrating uploader component
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DocumentUploader from '../../components/documents/DocumentUploader';
import { getUserDocuments } from '../../services/documentService';
import type { PropertyDocument } from '../../types/documents';

interface DocumentsScreenProps {
  propertyId?: string;
  propertyType?: 'sales' | 'rentals';
}

export default function DocumentsScreen({ propertyId, propertyType }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    const result = await getUserDocuments(propertyId);
    if (result.success && result.data) {
      setDocuments(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [propertyId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const getOCRStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'processing': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      case 'manual_review': return '#F59E0B';
      default: return '#999';
    }
  };

  const getOCRStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '等待處理';
      case 'processing': return '處理中';
      case 'completed': return '已完成';
      case 'failed': return '失敗';
      case 'manual_review': return '待審核';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Upload Component */}
      <DocumentUploader
        propertyId={propertyId}
        propertyType={propertyType}
        onUploadComplete={loadDocuments}
      />

      {/* Documents List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>已上傳文件 ({documents.length})</Text>

        {loading && documents.length === 0 ? (
          <Text style={styles.emptyText}>載入中...</Text>
        ) : documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="folder-open" size={48} color="#666" />
            <Text style={styles.emptyText}>尚未上傳任何文件</Text>
          </View>
        ) : (
          documents.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <FontAwesome5 name="file-alt" size={20} color="#7C3AED" />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{doc.document_name}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size'} • {doc.file_extension?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.documentFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getOCRStatusColor(doc.ocr_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getOCRStatusColor(doc.ocr_status) }]}>
                    OCR: {getOCRStatusLabel(doc.ocr_status)}
                  </Text>
                </View>
                <Text style={styles.uploadDate}>
                  {new Date(doc.created_at).toLocaleDateString('zh-TW')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  documentCard: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#999',
  },
  documentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
  },
});
