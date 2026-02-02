# 移除 Expo Web 實施計劃

> **創建日期**: 2026-02-02  
> **創建者**: Claude Sonnet 4.5  
> **預計工時**: 4-6 小時  
> **風險等級**: 低 (不影響 Mobile App 功能)  
> **版本**: 1.0

---

## 📋 目標

**主要目標**:
- 移除 Expo Web 功能 (因 Next.js 已提供完整 Web App)
- 保留 Expo Mobile 功能 (iOS + Android)
- 清理不必要的依賴和配置

**預期效果**:
- ✅ 簡化專案結構
- ✅ 減少依賴包大小 (~5MB)
- ✅ 避免維護重複的 Web 代碼
- ✅ 加快 Mobile 開發環境啟動速度

---

## 🎯 實施步驟

### **Phase 1: 備份與準備 (30 分鐘)**

#### **Step 1.1: 創建備份**
```bash
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA

# 備份整個 mobile 目錄
cp -r apps/mobile apps/mobile.backup.$(date +%Y%m%d_%H%M%S)

# 或使用 Git 創建分支
git checkout -b remove-expo-web
git add .
git commit -m "Backup before removing Expo Web"
```

#### **Step 1.2: 確認當前狀態**
```bash
cd apps/mobile

# 檢查當前依賴
npm list react-native-web
npm list @expo/webpack-config

# 確認當前腳本
cat package.json | grep "web"
```

---

### **Phase 2: 移除 Web 依賴 (1 小時)**

#### **Step 2.1: 移除 package.json 中的 Web 腳本**

**檔案**: `apps/mobile/package.json`

**修改前**:
```json
{
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"  // ← 刪除此行
  }
}
```

**修改後**:
```json
{
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  }
}
```

#### **Step 2.2: 移除 react-native-web 依賴**

```bash
cd apps/mobile

# 移除 Web 相關依賴
npm uninstall react-native-web

# 如果有安裝這些，也一併移除
npm uninstall @expo/webpack-config
npm uninstall react-dom  # 保留！Mobile 也需要 (用於某些組件)
```

**注意**: `react-dom` 可能被某些 Expo 組件使用，先保留，稍後測試。

---

### **Phase 3: 更新 Expo 配置 (30 分鐘)**

#### **Step 3.1: 修改 app.json**

**檔案**: `apps/mobile/app.json`

**修改前**:
```json
{
  "expo": {
    "name": "frontend",
    "slug": "frontend",
    // ... 其他配置
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro",
      "build": {
        "babel": {
          "include": ["@babel/preset-env"]
        }
      }
    }
  }
}
```

**修改後**:
```json
{
  "expo": {
    "name": "frontend",
    "slug": "frontend",
    // ... 其他配置
    // ← 完全移除 "web" 區塊
  }
}
```

#### **Step 3.2: 移除 Web 相關資源 (可選)**

```bash
cd apps/mobile

# 移除 Web 專用的 favicon (如果不需要)
# rm -f assets/favicon.png  # 謹慎！可能其他地方也用到

# 檢查是否有其他 Web 專用檔案
find . -name "*web*" -type f
```

---

### **Phase 4: 更新啟動腳本 (30 分鐘)**

#### **Step 4.1: 修改根目錄的 start-dev.sh**

**檔案**: `start-dev.sh`

**修改前** (Line 65-72):
```bash
start_mobile() {
    echo -e "${BLUE}📱 啟動 Expo Mobile 應用...${NC}"
    cd "$PROJECT_ROOT/apps/mobile"
    
    osascript -e 'tell application "Terminal"
        do script "cd \"'\"$PROJECT_ROOT\"'/apps/mobile\" && npx expo start --web --port 8081"
        set custom title of front window to \"Expo Mobile - Port 8081\"
    end tell' &> /dev/null &
    
    echo -e "${GREEN}✅ Mobile 服務啟動中... (http://localhost:8081)${NC}"
    echo -e "${YELLOW}💡 Web 版本會自動在 http://localhost:8081 啟動${NC}"
}
```

**修改後**:
```bash
start_mobile() {
    echo -e "${BLUE}📱 啟動 Expo Mobile 應用...${NC}"
    cd "$PROJECT_ROOT/apps/mobile"
    
    # 移除 --web 參數，只啟動 Metro bundler
    osascript -e 'tell application "Terminal"
        do script "cd \"'\"$PROJECT_ROOT\"'/apps/mobile\" && npx expo start --port 8081"
        set custom title of front window to \"Expo Mobile - Port 8081\"
    end tell' &> /dev/null &
    
    echo -e "${GREEN}✅ Mobile 服務啟動中... (http://localhost:8081)${NC}"
    echo -e "${YELLOW}💡 請使用 Expo Go App 或模擬器測試${NC}"
}
```

#### **Step 4.2: 修改 apps/mobile/start-web.sh**

**選項 A: 刪除檔案** (推薦)
```bash
rm apps/mobile/start-web.sh
```

**選項 B: 重命名為 start-mobile.sh**
```bash
mv apps/mobile/start-web.sh apps/mobile/start-mobile.sh

# 並修改內容
cat > apps/mobile/start-mobile.sh << 'EOF'
#!/bin/bash
# Start Expo mobile dev server (iOS + Android)

cd "$(dirname "$0")"

# Clean up any existing process on port 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Expo without --web flag
exec npx expo start --port 8081
EOF

chmod +x apps/mobile/start-mobile.sh
```

---

### **Phase 5: 更新文檔 (1 小時)**

#### **Step 5.1: 更新 README.md**

**檔案**: `apps/mobile/README.md`

**新增說明**:
```markdown
# Mobile App (Expo)

## 重要說明

⚠️ **本專案已移除 Expo Web 功能**

- ✅ **Web App**: 請使用 `apps/web` (Next.js)
- ✅ **Mobile App**: 使用本目錄 (Expo for iOS + Android)

## 啟動方式

### 開發環境
\`\`\`bash
# 方式 1: 使用根目錄腳本
cd ../../
./start-dev.sh
# 選擇 "2) 啟動 Mobile"

# 方式 2: 直接啟動
cd apps/mobile
npm run dev
\`\`\`

### 測試方式

#### iOS
\`\`\`bash
npm run ios
# 或使用 Expo Go App 掃描 QR Code
\`\`\`

#### Android
\`\`\`bash
npm run android
# 或使用 Expo Go App 掃描 QR Code
\`\`\`

## 不再支援

❌ ~~`npm run web`~~ - 已移除，請使用 `apps/web`
```

#### **Step 5.2: 更新技術棧文檔**

**檔案**: `docs/硬體與軟體技術選型說明/技術棧說明.md`

**新增章節**:
```markdown
### 7. Expo Web 移除決策 (2026-02-02)

**決策**: 移除 Expo Web 功能

**理由**:
1. ✅ Next.js 已提供完整 Web App 功能
2. ✅ 避免維護重複的 Web 代碼
3. ✅ 簡化部署流程
4. ✅ 減少依賴包大小

**影響**:
- ✅ 開發者無法使用 `expo start --web` 在瀏覽器預覽
- ✅ 必須使用 iOS/Android 模擬器或實體設備測試
- ✅ Web 功能統一由 `apps/web` (Next.js) 提供

**實施日期**: 2026-02-02
```

---

### **Phase 6: 測試驗證 (1-2 小時)**

#### **Step 6.1: 清理並重新安裝**

```bash
cd apps/mobile

# 清理舊的依賴
rm -rf node_modules
rm -f package-lock.json

# 重新安裝
npm install

# 檢查是否有錯誤
npm list
```

#### **Step 6.2: 啟動測試**

```bash
# 測試 Metro bundler 是否正常啟動
npm run dev

# 預期輸出:
# ✅ Metro bundler 啟動在 http://localhost:8081
# ✅ 顯示 QR Code
# ❌ 不應該自動打開瀏覽器
```

#### **Step 6.3: iOS 模擬器測試**

```bash
# 啟動 iOS 模擬器
npm run ios

# 檢查項目:
# ✅ App 正常啟動
# ✅ 登入功能正常
# ✅ 相機/相簿選擇正常
# ✅ 文件上傳正常
```

#### **Step 6.4: Android 模擬器測試**

```bash
# 啟動 Android 模擬器
npm run android

# 檢查項目:
# ✅ App 正常啟動
# ✅ 登入功能正常
# ✅ 相機/相簿選擇正常
# ✅ 文件上傳正常
```

---

### **Phase 7: 清理與優化 (30 分鐘)**

#### **Step 7.1: 移除未使用的依賴**

```bash
cd apps/mobile

# 檢查未使用的依賴
npx depcheck

# 如果 react-dom 未被使用，可移除
npm uninstall react-dom
```

#### **Step 7.2: 更新 .gitignore**

**檔案**: `apps/mobile/.gitignore`

**確認包含**:
```
# Expo
.expo/
dist/
web-build/  # ← 確保包含 (雖然不再使用)

# Dependencies
node_modules/
```

#### **Step 7.3: 檢查 Bundle 大小**

```bash
# 建立生產版本 (測試用)
npx expo export

# 檢查輸出大小
du -sh dist/

# 預期: 應該比之前小 5-10MB
```

---

## ✅ 驗收標準

### **功能驗收**

- [ ] Metro bundler 正常啟動 (端口 8081)
- [ ] iOS 模擬器可正常運行 App
- [ ] Android 模擬器可正常運行 App
- [ ] 登入/註冊功能正常
- [ ] 相機拍照功能正常
- [ ] 相簿選擇功能正常
- [ ] 文件上傳功能正常
- [ ] Deep Linking 功能正常

### **配置驗收**

- [ ] `package.json` 無 `web` 腳本
- [ ] `app.json` 無 `web` 配置
- [ ] `react-native-web` 已移除
- [ ] `start-dev.sh` 已更新
- [ ] 文檔已更新

### **性能驗收**

- [ ] `npm install` 時間減少 (預期 -10%)
- [ ] Metro bundler 啟動時間減少 (預期 -5%)
- [ ] `node_modules` 大小減少 (預期 -5MB)

---

## 🔄 回滾計劃

如果遇到問題，可快速回滾：

### **方式 1: 使用備份**
```bash
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA

# 找到備份目錄
ls -la apps/ | grep mobile.backup

# 恢復備份
rm -rf apps/mobile
mv apps/mobile.backup.20260202_XXXXXX apps/mobile

# 重新安裝依賴
cd apps/mobile
npm install
```

### **方式 2: 使用 Git**
```bash
# 如果使用了分支
git checkout main
git branch -D remove-expo-web

# 如果已提交
git revert HEAD
```

---

## 📊 預期效果

### **Before (移除前)**
```
apps/mobile/
├── node_modules/        120 MB
├── package.json         (包含 web 腳本)
└── app.json            (包含 web 配置)

啟動時間: 15 秒
依賴數量: 850 個
```

### **After (移除後)**
```
apps/mobile/
├── node_modules/        115 MB  (-5 MB)
├── package.json         (純 Mobile)
└── app.json            (純 Mobile)

啟動時間: 14 秒  (-7%)
依賴數量: 840 個  (-10 個)
```

---

## 🚨 注意事項

### **重要提醒**

1. **不要刪除 `react` 和 `react-dom`**
   - 某些 Expo 組件內部使用
   - 刪除會導致編譯錯誤

2. **保留 `@expo/metro-runtime`**
   - Metro bundler 必需
   - 不是 Web 專用

3. **測試 Deep Linking**
   - 確保 Web → Mobile 的認證流程仍正常
   - URL Scheme: `ownerpropertymanagementai://`

4. **通知團隊成員**
   - 更新本地環境: `npm install`
   - 清除舊快取: `rm -rf .expo`

---

## 📝 檢查清單

### **實施前**
- [ ] 閱讀完整計劃
- [ ] 創建備份或 Git 分支
- [ ] 通知團隊成員
- [ ] 確認有 2-3 小時不中斷時間

### **實施中**
- [ ] Phase 1: 備份與準備
- [ ] Phase 2: 移除 Web 依賴
- [ ] Phase 3: 更新 Expo 配置
- [ ] Phase 4: 更新啟動腳本
- [ ] Phase 5: 更新文檔
- [ ] Phase 6: 測試驗證
- [ ] Phase 7: 清理與優化

### **實施後**
- [ ] 所有測試通過
- [ ] 文檔已更新
- [ ] 團隊成員已通知
- [ ] Git 提交並推送
- [ ] 刪除備份 (1 週後)

---

## 🔗 相關文檔

- [Mobile App 技術方案評估](./Mobile_App_技術方案評估_原生vs跨平台.md)
- [技術棧說明](./技術棧說明.md)
- [開發環境快速啟動指南](../deployment-guides/本案開發環境快速啟動指南.md)

---

**版本歷史**:
- **v1.0** (2026-02-02): 初始版本，完整實施計劃
