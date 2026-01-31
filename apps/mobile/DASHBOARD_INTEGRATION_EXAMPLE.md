# Dashboard 整合範例

> **創建日期**: 2026-01-31
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## 📋 整合方式說明

本文檔展示如何將文件上傳功能整合至現有的 `LandlordDashboard.tsx`。

---

## 🎯 方案 1: 添加快捷操作按鈕（推薦）

### 步驟 1: 導入 DocumentsScreen

在 `LandlordDashboard.tsx` 頂部添加：

```typescript
import DocumentsScreen from './DocumentsScreen';
```

### 步驟 2: 添加狀態管理

在 `LandlordDashboard` 函數內添加：

```typescript
export default function LandlordDashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');
  const [showDocuments, setShowDocuments] = useState(false); // ✅ 新增
  const screenWidth = Dimensions.get('window').width;
```

### 步驟 3: 修改 ActionItem 使其可點擊

```typescript
type ActionItemProps = {
  icon: string;
  label: string;
  onPress?: () => void; // ✅ 新增 onPress
};

const ActionItem = ({ icon, label, onPress }: ActionItemProps) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress}> {/* ✅ 添加 onPress */}
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View style={styles.actionIconBg}>
            <FontAwesome5 name={icon} size={14} color="#7C3AED" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#666" />
  </TouchableOpacity>
);
```

### 步驟 4: 在 QUICK ACTIONS 中添加文件上傳按鈕

找到 QUICK ACTIONS 區塊（約第 184 行），修改為：

```typescript
<View style={styles.sectionContainer}>
    <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
    </View>
    <View>
        <ActionItem icon="search" label="Screen Tenant" />
        <ActionItem icon="file-contract" label="Create Lease" />
        <ActionItem icon="receipt" label="Record Expense" />
        <ActionItem icon="tools" label="Request Repair" />
        {/* ✅ 新增文件上傳按鈕 */}
        <ActionItem
          icon="file-upload"
          label="Upload Documents"
          onPress={() => setShowDocuments(true)}
        />
    </View>
</View>
```

### 步驟 5: 添加文件管理畫面（Modal 或 Conditional Render）

#### 選項 A: 使用 Modal（推薦）

在 `</ScrollView>` 之後，`</View>` 之前添加：

```typescript
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Dimensions, Modal } from 'react-native';

// ... 在 return 的最後
      </ScrollView>

      {/* ✅ 文件管理 Modal */}
      <Modal
        visible={showDocuments}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
          {/* 關閉按鈕 */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>
              文件管理
            </Text>
            <TouchableOpacity onPress={() => setShowDocuments(false)}>
              <FontAwesome5 name="times" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* 文件管理畫面 */}
          <DocumentsScreen />
        </View>
      </Modal>
    </View>
  );
}
```

#### 選項 B: 使用條件渲染（更簡單）

```typescript
export default function LandlordDashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');
  const [showDocuments, setShowDocuments] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // ✅ 條件渲染：顯示文件畫面時隱藏 Dashboard
  if (showDocuments) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        {/* 返回按鈕 */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#333'
        }}>
          <TouchableOpacity
            onPress={() => setShowDocuments(false)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#7C3AED" />
            <Text style={{ fontSize: 16, color: '#7C3AED' }}>返回</Text>
          </TouchableOpacity>
        </View>

        {/* 文件管理畫面 */}
        <DocumentsScreen />
      </View>
    );
  }

  // 原本的 Dashboard
  return (
    <View style={styles.container}>
      <ScrollView ...>
        ...
      </ScrollView>
    </View>
  );
}
```

---

## 🎯 方案 2: 獨立導航頁面（需要導航系統）

如果專案使用 React Navigation 或 Expo Router：

### Expo Router 範例

```typescript
// app/dashboard/documents.tsx
import DocumentsScreen from '../../src/screens/dashboard/DocumentsScreen';

export default function DocumentsPage() {
  return <DocumentsScreen />;
}
```

### 在 LandlordDashboard 中導航

```typescript
import { useRouter } from 'expo-router';

export default function LandlordDashboard() {
  const router = useRouter();

  return (
    // ...
    <ActionItem
      icon="file-upload"
      label="Upload Documents"
      onPress={() => router.push('/dashboard/documents')}
    />
  );
}
```

---

## 🎯 方案 3: 僅添加上傳組件（最小化整合）

只需要上傳功能，不需要完整列表：

```typescript
import DocumentUploader from '../components/documents/DocumentUploader';

// 在 Dashboard 中某個區塊添加
<View style={styles.sectionContainer}>
    <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>UPLOAD DOCUMENTS</Text>
    </View>
    <DocumentUploader
      onUploadComplete={() => {
        console.log('上傳完成');
        // 可選：顯示成功訊息
      }}
    />
</View>
```

---

## 📝 完整整合範例代碼

### 修改後的 LandlordDashboard.tsx（關鍵部分）

```typescript
// filepath: apps/mobile/src/screens/dashboard/LandlordDashboard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  Modal // ✅ 新增
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import DocumentsScreen from './DocumentsScreen'; // ✅ 新增

// Types
type StatCardProps = {
  icon: string;
  label: string;
  count: number;
};

type ActionItemProps = {
  icon: string;
  label: string;
  onPress?: () => void; // ✅ 新增
};

// ... (其他組件保持不變)

const ActionItem = ({ icon, label, onPress }: ActionItemProps) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress}> {/* ✅ 添加 onPress */}
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View style={styles.actionIconBg}>
            <FontAwesome5 name={icon} size={14} color="#7C3AED" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#666" />
  </TouchableOpacity>
);

// --- Main Component ---

export default function LandlordDashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');
  const [showDocuments, setShowDocuments] = useState(false); // ✅ 新增
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ... 現有內容 ... */}

        {/* QUICK ACTIONS 區塊 */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
            </View>
            <View>
                <ActionItem icon="search" label="Screen Tenant" />
                <ActionItem icon="file-contract" label="Create Lease" />
                <ActionItem icon="receipt" label="Record Expense" />
                <ActionItem icon="tools" label="Request Repair" />
                {/* ✅ 新增文件上傳按鈕 */}
                <ActionItem
                  icon="file-upload"
                  label="Upload Documents"
                  onPress={() => setShowDocuments(true)}
                />
            </View>
        </View>

        {/* ... 其餘內容 ... */}
      </ScrollView>

      {/* ✅ 文件管理 Modal */}
      <Modal
        visible={showDocuments}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
          {/* Header with close button */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            paddingTop: Platform.OS === 'ios' ? 50 : 16,
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF' }}>
              文件管理
            </Text>
            <TouchableOpacity onPress={() => setShowDocuments(false)}>
              <FontAwesome5 name="times" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Document management screen */}
          <DocumentsScreen />
        </View>
      </Modal>
    </View>
  );
}

// ... (styles 保持不變)
```

---

## ✅ 整合檢查清單

完成整合後，請檢查：

- [ ] `DocumentsScreen` 已正確導入
- [ ] `Modal` 已從 `react-native` 導入
- [ ] `showDocuments` 狀態已添加
- [ ] `ActionItem` 支援 `onPress` 回調
- [ ] QUICK ACTIONS 中已添加上傳按鈕
- [ ] Modal 可正常開啟/關閉
- [ ] DocumentsScreen 在 Modal 中正確顯示
- [ ] 無 TypeScript 錯誤

---

## 🧪 測試步驟

1. **啟動應用**
   ```bash
   npm run ios  # 或 npm run android
   ```

2. **測試導航**
   - 點擊 Dashboard 中的「Upload Documents」按鈕
   - 確認 Modal 開啟
   - 確認可以關閉 Modal

3. **測試上傳**
   - 在 Modal 中選擇文件類型
   - 點擊「選擇並上傳文件」
   - 選擇一個測試文件
   - 確認上傳成功

4. **測試列表**
   - 確認已上傳文件顯示在列表中
   - 確認 OCR 狀態正確顯示
   - 測試下拉刷新功能

---

## 🎨 UI 自定義

### 修改按鈕樣式

```typescript
<ActionItem
  icon="file-upload"
  label="Upload Documents"
  onPress={() => setShowDocuments(true)}
/>
```

可以改為使用不同圖標：
- `"cloud-upload-alt"` - 雲端上傳
- `"folder-plus"` - 新增文件夾
- `"file-pdf"` - PDF 文件

### 修改 Modal 樣式

```typescript
<Modal
  visible={showDocuments}
  animationType="slide"        // 可選: "fade", "none"
  presentationStyle="pageSheet" // iOS: "fullScreen", "formSheet", "overFullScreen"
>
```

---

## 🔧 故障排除

### 問題 1: Modal 無法關閉

**解決方案**: 確認 `setShowDocuments(false)` 正確綁定到關閉按鈕

### 問題 2: DocumentsScreen 不顯示

**解決方案**: 檢查導入路徑是否正確
```typescript
import DocumentsScreen from './DocumentsScreen'; // ✅ 同一目錄
// 或
import DocumentsScreen from '../screens/dashboard/DocumentsScreen'; // ✅ 從其他位置
```

### 問題 3: TypeScript 錯誤「onPress does not exist」

**解決方案**: 確認 `ActionItemProps` 已添加 `onPress?` 屬性

---

## 📚 相關文檔

- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - 詳細整合指南
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md) - 測試檢查清單
- [DOCUMENT_UPLOAD_README.md](DOCUMENT_UPLOAD_README.md) - 功能總覽

---

**整合完成後，即可開始使用文件上傳功能！** 🎉
