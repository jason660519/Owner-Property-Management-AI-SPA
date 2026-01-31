// filepath: apps/mobile/src/screens/dashboard/DocumentsScreen.tsx
// description: Document management screen with preview, delete and camera features
// created: 2026-01-31
// creator: Claude Sonnet 4.5
// lastModified: 2026-01-31
// modifiedBy: Claude Sonnet 4.5

import React, { useState, useEffect } from 'react';
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
import { getUserDocuments, deleteDocument } from '../../services/documentService';
import type { PropertyDocument } from '../../types/documents';

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
  emptySubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
});
