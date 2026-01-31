// filepath: apps/mobile/src/screens/dashboard/DocumentsScreen.tsx
// description: Document management screen with preview, delete and camera features
// created: 2026-01-31
// creator: Claude Sonnet 4.5
// lastModified: 2026-01-31
// modifiedBy: Claude Sonnet 4.5

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DocumentUploader from '../../components/documents/DocumentUploader';
import DocumentPreview from '../../components/documents/DocumentPreview';
import DocumentViewer from '../../components/documents/DocumentViewer';
import DeleteConfirmDialog from '../../components/documents/DeleteConfirmDialog';
import OCRResultDialog from '../../components/documents/OCRResultDialog';
import { getUserDocuments, deleteDocument } from '../../services/documentService';
import { useRealtimeDocuments } from '../../hooks/useRealtimeDocuments';
import { supabase } from '../../lib/supabase';
import type { PropertyDocument, RealtimeStatus, DocumentUpdateEvent } from '../../types/documents';

interface DocumentsScreenProps {
  propertyId?: string;
  propertyType?: 'sales' | 'rentals';
}

export default function DocumentsScreen({ propertyId, propertyType }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<PropertyDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<PropertyDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ocrResultDocument, setOcrResultDocument] = useState<PropertyDocument | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Realtime subscription callback
  const handleDocumentUpdate = useCallback((event: DocumentUpdateEvent) => {
    console.log('[DocumentsScreen] Document updated:', event);

    // Update the document in the list
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === event.documentId
          ? {
              ...doc,
              ocr_status: event.newStatus,
              ocr_parsed_data: event.parsedData,
              ocr_engine: event.metadata?.engine,
              ocr_confidence_score: event.metadata?.confidence_score,
              ocr_processed_at: event.metadata?.processed_at,
            }
          : doc
      )
    );

    // Show notification if OCR completed
    if (event.oldStatus !== 'completed' && event.newStatus === 'completed') {
      Alert.alert('OCR 完成', '文件解析已完成');
    }

    // Show notification if OCR failed
    if (event.newStatus === 'failed') {
      Alert.alert('OCR 失敗', '文件解析失敗，請嘗試重新上傳或手動輸入');
    }
  }, []);

  // Realtime hook
  const { status: realtimeStatus, subscribe, unsubscribe } = useRealtimeDocuments(
    handleDocumentUpdate,
    userId || undefined
  );

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    if (userId) {
      subscribe();
    }
    return () => {
      unsubscribe();
    };
  }, [userId, subscribe, unsubscribe]);

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

  const handleDelete = async () => {
    if (!deletingDocument) return;

    setIsDeleting(true);
    const result = await deleteDocument(deletingDocument.id, deletingDocument.file_path);
    setIsDeleting(false);

    if (result.success) {
      Alert.alert('成功', '文件已刪除');
      setDeletingDocument(null);
      loadDocuments(); // Refresh list
    } else {
      Alert.alert('錯誤', result.error || '刪除失敗');
    }
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

      {/* Realtime Status Indicator */}
      <View style={styles.realtimeStatus}>
        <View style={[
          styles.realtimeIndicator,
          { backgroundColor: getRealtimeColor(realtimeStatus) }
        ]} />
        <Text style={styles.realtimeText}>
          {getRealtimeLabel(realtimeStatus)}
        </Text>
      </View>

      {/* Documents List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>已上傳文件 ({documents.length})</Text>

        {loading && documents.length === 0 ? (
          <Text style={styles.emptyText}>載入中...</Text>
        ) : documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="folder-open" size={48} color="#666" />
            <Text style={styles.emptyText}>尚未上傳任何文件</Text>
            <Text style={styles.emptySubtext}>點擊上方按鈕開始上傳</Text>
          </View>
        ) : (
          documents.map((doc) => (
            <DocumentPreview
              key={doc.id}
              document={doc}
              onPress={() => setViewingDocument(doc)}
              onMenuPress={() => setDeletingDocument(doc)}
              onViewOCRResult={(doc) => setOcrResultDocument(doc)}
              onOCRRetrySuccess={loadDocuments}
            />
          ))
        )}
      </View>

      {/* Document Viewer Modal */}
      <DocumentViewer
        visible={!!viewingDocument}
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        visible={!!deletingDocument}
        document={deletingDocument}
        onConfirm={handleDelete}
        onCancel={() => setDeletingDocument(null)}
        isDeleting={isDeleting}
      />

      {/* OCR Result Dialog */}
      <OCRResultDialog
        visible={!!ocrResultDocument}
        document={ocrResultDocument}
        onClose={() => setOcrResultDocument(null)}
      />
    </ScrollView>
  );
}

// Helper functions
function getRealtimeColor(status: RealtimeStatus): string {
  switch (status) {
    case 'connected': return '#10B981';
    case 'connecting': return '#F59E0B';
    case 'disconnected': return '#666';
    case 'error': return '#EF4444';
  }
}

function getRealtimeLabel(status: RealtimeStatus): string {
  switch (status) {
    case 'connected': return '已連線';
    case 'connecting': return '連線中...';
    case 'disconnected': return '未連線';
    case 'error': return '連線錯誤';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  realtimeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  realtimeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 16,
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
  emptySubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
});
