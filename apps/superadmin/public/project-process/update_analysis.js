const fs = require('fs');
const path = require('path');

const analysisPath = path.join(__dirname, 'project-packages-analysis/analysis.json');
const data = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

const newPackages = [
  // --- Mobile Packages ---
  {
    name: "react-native",
    version: "0.81.5",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "行動應用程式框架。用於構建原生 iOS 與 Android 應用程式。",
    mainFunction: "<ul><li><strong>跨平台原生渲染</strong>：使用 JavaScript 與 React 語法編寫應用程式，並透過 Bridge 或 JSI 呼叫原生 UI 組件，實現接近原生的效能與外觀。</li><li><strong>Fast Refresh</strong>：提供極速的熱重載體驗。修改程式碼後，模擬器或實機上的 App 會立即更新，且能保留當前的 React State，大幅提升開發效率。</li><li><strong>廣泛的生態系支援</strong>：擁有龐大的社群與第三方套件庫。從導航、地圖到藍牙連線，幾乎所有原生功能都能找到現成的 React Native 解決方案。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Native 是本專案 Mobile App 的核心基礎。其目的是讓團隊能共用 Web 端的 React 知識與部分商業邏輯，同時維護 iOS 與 Android 雙平台，實現「Write Once, Run Anywhere」的高效開發模式。</p><h4>操作步驟</h4><p>使用 Expo CLI 初始化與管理專案。在 .tsx 檔案中使用 &lt;View&gt;, &lt;Text&gt; 等核心組件構建介面。透過 StyleSheet 或 NativeWind 定義樣式。使用 useEffect 處理副作用。最終透過 EAS Build 編譯成 .ipa 與 .apk 檔案。</p><h4>預期結果</h4><p>產出效能流暢、體驗原生的行動應用程式。開發者能快速迭代功能。前後端邏輯 (如 API 呼叫、狀態管理) 能與 Web 端高度共用。維護成本遠低於開發兩個原生 App。</p><h4>注意事項</h4><p>雖然大部分邏輯可共用，但 UI 層仍需針對不同平台的設計規範 (Human Interface Guidelines vs Material Design) 進行微調。需留意原生模組的相容性與版本升級的複雜度。</p>"
  },
  {
    name: "react-native-web",
    version: "^0.21.0",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "Web 相容層。允許 React Native 組件在瀏覽器中運行。",
    mainFunction: "<ul><li><strong>跨平台組件共用</strong>：將 React Native 的核心組件 (如 View, Text, Image) 轉譯為標準的 HTML 標籤 (div, span, img)。這使得同一套 UI 程式碼可以同時在 App 與 Web 上運行。</li><li><strong>樣式統一管理</strong>：支援 React Native 的 StyleSheet API。在 Web 端會自動生成 CSS Class，確保樣式在不同平台上的一致性，減少維護兩套樣式系統的負擔。</li><li><strong>Web API 實作</strong>：提供 React Native API (如 Platform, Dimensions) 的 Web 實作。讓開發者在編寫跨平台邏輯時，無需頻繁使用 if (Platform.OS === 'web') 進行判斷。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Native Web 的引入是為了最大化程式碼重用率。雖然本專案有獨立的 Next.js Web App，但某些通用的 UI 組件或功能模組，透過 React Native Web 可以實現 Web 與 App 的完全共用，特別是在開發內部預覽或簡單的 Web 版 App 時。</p><h4>操作步驟</h4><p>安裝 react-native-web 與 react-dom。在 Web 端的 Entry Point (如 index.html) 中註冊 AppRegistry。在 webpack 或 metro.config.js 中設定 alias，將 'react-native' 指向 'react-native-web'。</p><h4>預期結果</h4><p>React Native 編寫的組件能順利在瀏覽器中渲染，外觀與行為與 App 端高度相似。專案具備了未來擴展為 PWA (Progressive Web App) 的潛力。開發者能使用熟悉的 React Native API 開發 Web 功能。</p><h4>注意事項</h4><p>並非所有 React Native 的第三方套件都支援 Web 版。在引入原生功能 (如相機、地圖) 時，需特別確認其 Web 支援度，或撰寫 .web.tsx 檔案進行平台分流。</p>"
  },
  {
    name: "nativewind",
    version: "^4.2.1",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "React Native 的 Tailwind CSS 引擎。允許在 App 中使用 Tailwind 類別。",
    mainFunction: "<ul><li><strong>Tailwind CSS 支援</strong>：讓 React Native 開發者能直接使用 className='bg-blue-500 p-4' 這樣的 Tailwind 語法。它會在編譯時將這些 Utility Classes 轉換為 React Native 的 StyleSheet 物件。</li><li><strong>效能優化</strong>：採用預編譯 (Pre-compilation) 技術。樣式在建置階段就已處理完畢，執行時期幾乎沒有額外的運算開銷，確保 App 的渲染效能。</li><li><strong>跨平台樣式一致性</strong>：與 Web 端的 Tailwind CSS 共用相同的設定檔 (tailwind.config.js)。這確保了 Web 與 App 擁有完全一致的設計系統 (顏色、間距、字型)，簡化了設計規範的落實。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>NativeWind 的目的是統一 Web 與 Mobile 的樣式開發體驗。透過在 React Native 中引入 Tailwind CSS，前端團隊可以無縫切換於兩個平台之間，無需記憶兩套不同的樣式寫法 (CSS vs StyleSheet)，並能直接複用現有的 Tailwind 樣式邏輯。</p><h4>操作步驟</h4><p>安裝 nativewind 與 tailwindcss。配置 tailwind.config.js 加入 App 檔案路徑。在 babel.config.js 中加入 nativewind/babel plugin。在組件中直接使用 className 屬性編寫樣式。</p><h4>預期結果</h4><p>App 的樣式開發速度顯著提升。程式碼更加簡潔，減少了大量的 StyleSheet 定義。Web 與 App 的視覺風格高度一致。開發者能享受 Utility-First 帶來的開發便利性。</p><h4>注意事項</h4><p>NativeWind v4 依賴 React Native Reanimated 進行某些動畫處理。需注意與 Expo SDK 版本的相容性。某些複雜的 CSS 選擇器或偽類在 React Native 中可能不受支援。</p>"
  },
  {
    name: "react-native-reanimated",
    version: "~4.1.1",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "高效能動畫庫。在 UI 執行緒上運行流暢的 60fps 動畫。",
    mainFunction: "<ul><li><strong>UI 執行緒驅動</strong>：將動畫邏輯從 JavaScript 執行緒移至 UI 執行緒 (Native Thread) 執行。即使 JS 執行緒被繁重的計算阻塞，動畫依然能保持流暢，不會發生掉幀卡頓。</li><li><strong>宣告式動畫 API</strong>：提供 useSharedValue, useAnimatedStyle 等 Hooks。開發者能以宣告式的方式定義動畫數值與樣式變更，邏輯清晰且易於維護。</li><li><strong>手勢互動整合</strong>：與 React Native Gesture Handler 深度整合。能實現跟隨手指拖曳、縮放等複雜的物理手勢動畫，提供極佳的互動體驗。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Native Reanimated 是為了解決 React Native 內建 Animated API 在處理複雜或連續動畫時的效能瓶頸。本專案使用它來實現如側邊欄滑動、列表拖曳、轉場特效等高品質的互動效果。</p><h4>操作步驟</h4><p>在 babel.config.js 中加入 reanimated plugin。使用 useSharedValue 定義動畫變數。使用 useAnimatedStyle 根據變數回傳樣式物件。將組件包裝為 Animated.View。結合 withSpring 或 withTiming 觸發動畫。</p><h4>預期結果</h4><p>App 展現出如原生應用般絲滑的動畫效果。複雜的互動手勢反應即時。動畫邏輯不會影響主執行緒的商業邏輯處理。提升整體 App 的精緻度與使用者滿意度。</p><h4>注意事項</h4><p>需嚴格遵守 Hooks 的使用規則。在 Worklet (UI 執行緒上的函式) 中無法直接存取外部的 JS 變數，需透過 Shared Value 傳遞。除錯時需注意 JS 執行緒與 UI 執行緒的非同步特性。</p>"
  },
  {
    name: "react-native-css-interop",
    version: "^0.2.1",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "CSS 互操作層。支援 NativeWind 的底層依賴。",
    mainFunction: "<ul><li><strong>CSS 轉 Native 樣式</strong>：作為 NativeWind 的底層引擎，負責解析 CSS 規則並將其轉換為 React Native 可理解的樣式物件。</li><li><strong>樣式屬性對映</strong>：處理 Web CSS 屬性與 React Native 樣式屬性之間的差異與轉換邏輯，確保樣式在不同平台上的一致表現。</li><li><strong>效能優化</strong>：透過靜態分析與編譯優化，減少執行時期的轉換開銷。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>此套件主要作為 NativeWind 的依賴存在，開發者通常不會直接與其互動。它的目的是確保 CSS 樣式能正確、高效地應用在 React Native 組件上，是實現跨平台樣式共用的幕後功臣。</p><h4>操作步驟</h4><p>通常由 NativeWind 自動安裝與配置。若需手動調整，可透過 metro.config.js 進行設定。在開發過程中，它會默默地在背景工作，處理樣式轉換。</p><h4>預期結果</h4><p>Tailwind CSS 類別能正確生效於 App 組件。支援更多現代 CSS 特性在 React Native 中的應用。減少樣式相容性問題。</p><h4>注意事項</h4><p>通常無需手動升級或配置，跟隨 NativeWind 版本即可。</p>"
  },
  {
    name: "expo-status-bar",
    version: "~3.0.9",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "狀態列控制。管理 App 頂部狀態列的樣式與顯示。",
    mainFunction: "<ul><li><strong>狀態列樣式設定</strong>：允許開發者設定狀態列文字顏色 (深色/淺色)、背景顏色以及透明度。能根據 App 目前的背景色 (如深色模式) 動態調整，確保資訊可讀性。</li><li><strong>全域或局部控制</strong>：可以全域設定預設樣式，也可以在特定頁面 (Screen) 中覆蓋設定。例如在圖片瀏覽頁面隱藏狀態列，提供沉浸式體驗。</li><li><strong>跨平台相容</strong>：統一了 iOS 與 Android 在狀態列處理上的差異。開發者只需編寫一次設定，即可在雙平台上獲得預期的效果。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Expo Status Bar 的目的是讓開發者能輕鬆掌控 App 的「門面」— 狀態列。良好的狀態列設計能提升 App 的質感，並避免文字與背景顏色衝突導致的視覺問題。</p><h4>操作步驟</h4><p>在根組件或頁面組件中引入 &lt;StatusBar /&gt;。設定 style='auto' | 'inverted' | 'light' | 'dark'。若需透明背景，設定 backgroundColor='transparent' 並配置 translucent 屬性。</p><h4>預期結果</h4><p>狀態列樣式始終與 App 介面風格協調。在深色/淺色模式切換時，狀態列能自動適應。在全螢幕模式下能正確隱藏或顯示。</p><h4>注意事項</h4><p>在 Android 上，透明狀態列可能需要額外的 Window 配置。注意與 SafeAreaView 的配合，避免內容被狀態列遮擋。</p>"
  },
  {
    name: "@expo/vector-icons",
    version: "^15.0.3",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "向量圖示庫。提供大量常用的圖示集 (如 Ionicons, FontAwesome)。",
    mainFunction: "<ul><li><strong>豐富的圖示資源</strong>：內建多套知名的開源圖示集，包括 Ionicons, MaterialIcons, FontAwesome 等。開發者無需自行繪製或匯入 SVG，即可直接使用數千個高品質圖示。</li><li><strong>高度可客製化</strong>：可以輕鬆調整圖示的大小 (size)、顏色 (color) 與樣式。支援在程式碼中動態改變這些屬性，例如點擊後變色或放大。</li><li><strong>原生渲染效能</strong>：圖示以字型檔 (Font) 的形式載入與渲染，具有向量圖的特性，放大不失真且渲染效能極佳，適合在行動裝置上使用。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>@expo/vector-icons 旨在為 Expo/React Native 專案提供一個即插即用的圖示解決方案。它解決了行動端圖示管理繁瑣的問題，讓開發者能快速豐富 UI 介面。</p><h4>操作步驟</h4><p>匯入所需的圖示集，如 import { Ionicons } from '@expo/vector-icons'。在 JSX 中使用 &lt;Ionicons name='md-checkmark-circle' size={32} color='green' /&gt;。可透過 Expo 官網的 Icon Search 工具查找圖示名稱。</p><h4>預期結果</h4><p>App 介面擁有清晰、統一的圖示元素。圖示載入速度快，無延遲。能隨意調整大小與顏色以適應不同設計需求。無需擔心圖示解析度問題。</p><h4>注意事項</h4><p>雖然包含多套圖示集，建議專案中統一使用其中一套 (如 Ionicons) 以保持風格一致。發布時 Expo 會自動處理字型檔的打包。</p>"
  },
  {
    name: "@expo/metro-runtime",
    version: "~6.1.2",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "Metro 運行時支援。Expo 與 Metro Bundler 的整合層。",
    mainFunction: "<ul><li><strong>開發伺服器整合</strong>：支援 Expo 開發環境與 Metro Bundler 的通訊。負責處理熱重載 (HMR)、錯誤回報與日誌輸出，是開發體驗的核心組件。</li><li><strong>Web 支援</strong>：協助 Metro 打包 Web 端的程式碼。讓 Expo 專案能順利編譯並運行在瀏覽器環境中。</li><li><strong>環境變數注入</strong>：處理 .env 檔案的載入與注入。確保 App 在執行時期能讀取到正確的環境設定 (如 API URL)。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>此套件是 Expo 架構下的基礎建設，主要目的是確保 Metro Bundler (React Native 的打包工具) 能與 Expo 的生態系完美運作，特別是在 Web 支援與開發體驗方面。</p><h4>操作步驟</h4><p>通常由 Expo CLI 自動管理，無需手動操作。在開發過程中，它負責維持 App 與開發伺服器的連線。在建置時，它參與程式碼的打包與優化。</p><h4>預期結果</h4><p>開發環境穩定，熱重載反應迅速。Web 版 App 能正常建置與執行。錯誤訊息能清晰顯示在終端機與 App 畫面上。</p><h4>注意事項</h4><p>版本需與 expo 及 react-native 套件嚴格匹配，避免版本衝突導致打包失敗。</p>"
  },
  // --- Mobile Features ---
  {
    name: "react-native-image-viewing",
    version: "^0.2.2",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "圖片瀏覽器。支援手勢縮放、滑動切換的圖片檢視模組。",
    mainFunction: "<ul><li><strong>全螢幕圖片預覽</strong>：提供類似原生相簿的圖片瀏覽體驗。使用者點擊縮圖後，會以全螢幕模態 (Modal) 顯示高解析度圖片，背景自動變暗。</li><li><strong>手勢操作支援</strong>：內建流暢的雙指縮放 (Pinch-to-Zoom)、單指拖曳 (Pan) 與滑動切換 (Swipe) 功能。操作手感接近原生系統，符合使用者直覺。</li><li><strong>多圖輪播</strong>：支援傳入圖片陣列，讓使用者能在同一介面中左右滑動瀏覽多張圖片。適合用於房源照片展示、合約掃描檔檢視等場景。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>本專案使用 react-native-image-viewing 來提升房源照片的瀏覽體驗。原生的 Image 組件無法提供縮放與輪播功能，此套件補足了這塊需求，讓使用者能仔細檢視照片細節。</p><h4>操作步驟</h4><p>安裝套件。在組件中引入 ImageView。設定 images 屬性為圖片 URL 陣列，imageIndex 設定起始圖片，visible 控制顯示隱藏。onRequestClose 處理關閉邏輯。</p><h4>預期結果</h4><p>使用者能流暢地瀏覽房源照片。縮放與滑動操作無卡頓。介面簡潔，專注於圖片展示。提供良好的關閉互動 (如向下滑動關閉)。</p><h4>注意事項</h4><p>需注意高解析度圖片的載入效能，建議搭配快取機制。確保傳入的圖片 URL 有效。在 Android 上需注意 Back 鍵的處理。</p>"
  },
  {
    name: "expo-image-picker",
    version: "^17.0.10",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "圖片選擇器。存取系統相簿或相機以獲取圖片與影片。",
    mainFunction: "<ul><li><strong>相簿存取</strong>：呼叫系統原生的圖片選擇介面。允許使用者從裝置相簿中選取一張或多張照片/影片，並回傳檔案的 URI 與中繼資料 (Metadata)。</li><li><strong>相機拍攝</strong>：直接啟動系統相機進行拍攝。使用者拍完後可直接使用該照片，無需先存入相簿，簡化了拍照上傳的流程。</li><li><strong>權限管理</strong>：自動處理 iOS 與 Android 的權限請求 (Permissions)。在存取相簿或相機前，會彈出系統對話框詢問使用者授權，並回傳授權結果。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Expo Image Picker 是 App 中「上傳照片」功能的入口。無論是房東上傳房源照片，還是租客上傳維修報修單的照片，都需要透過此套件來從使用者的裝置中獲取影像檔案。</p><h4>操作步驟</h4><p>呼叫 launchImageLibraryAsync 或 launchCameraAsync。設定 mediaTypes, quality, allowsEditing 等選項。檢查回傳結果的 canceled 屬性。若成功，從 assets 陣列中取得 uri 進行後續上傳。</p><h4>預期結果</h4><p>能順利開啟系統相簿或相機。使用者選取後能取得正確的檔案路徑。權限流程符合系統規範。支援基本的圖片裁切與壓縮設定。</p><h4>注意事項</h4><p>需在 app.json 中設定對應的權限描述 (Info.plist / AndroidManifest.xml)，否則會被商店拒絕。注意大圖上傳時的記憶體消耗。</p>"
  },
  {
    name: "expo-image-manipulator",
    version: "^14.0.8",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "圖片處理工具。在客戶端進行圖片的壓縮、裁切與格式轉換。",
    mainFunction: "<ul><li><strong>圖片壓縮與格式轉換</strong>：在圖片上傳到伺服器之前，先在手機端進行壓縮 (調整 JPEG 品質) 或轉換格式 (如 PNG 轉 JPEG)。這能大幅減少上傳流量與伺服器儲存空間。</li><li><strong>圖片尺寸調整 (Resize)</strong>：將過大的照片縮小至指定寬度或高度。避免使用者上傳數千萬畫素的原圖，導致 App 顯示緩慢或崩潰。</li><li><strong>圖片裁切與旋轉</strong>：支援程式化的裁切 (Crop) 與旋轉 (Rotate) 操作。可用於修正照片方向或擷取特定區域。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>為了優化 App 效能與節省頻寬，我們不應直接上傳使用者拍攝的原圖。Expo Image Manipulator 的目的是在「客戶端」就先對圖片進行瘦身與標準化，確保上傳到後端的圖片符合系統規範。</p><h4>操作步驟</h4><p>引入 manipulateAsync 函式。傳入原始圖片 URI。在 actions 陣列中定義 resize, rotate, crop 等操作。設定 saveOptions 指定壓縮比與輸出格式。取得處理後的新 URI。</p><h4>預期結果</h4><p>上傳的圖片檔案大小顯著降低 (如從 5MB 降至 200KB)。圖片尺寸統一。上傳速度變快，使用者等待時間縮短。伺服器儲存成本降低。</p><h4>注意事項</h4><p>壓縮比設定需在畫質與檔案大小間取得平衡。處理大型圖片時可能會佔用較多 CPU 與記憶體，建議顯示 Loading 狀態。</p>"
  },
  {
    name: "expo-document-picker",
    version: "^14.0.8",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "文件選擇器。允許使用者從裝置檔案系統中選取各類文件 (PDF, Doc, etc.)。",
    mainFunction: "<ul><li><strong>系統檔案選擇介面</strong>：呼叫 iOS 的 Files App 或 Android 的檔案管理器。讓使用者能瀏覽並選取儲存在裝置、iCloud Drive 或 Google Drive 上的文件。</li><li><strong>多種檔案類型支援</strong>：可指定允許選取的檔案類型 (MIME types)。例如限制只能選取 PDF 合約或 CSV 報表，避免使用者上傳錯誤的格式。</li><li><strong>檔案資訊獲取</strong>：選取後回傳檔案的 URI、名稱、大小與 MIME type。這些資訊對於後續的上傳驗證與顯示至關重要。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>除了照片，房地產管理還涉及大量的文書資料 (如租賃合約、身分證明、權狀)。Expo Document Picker 的目的是提供一個標準化的介面，讓使用者能方便地將這些文件匯入到 App 中。</p><h4>操作步驟</h4><p>呼叫 getDocumentAsync。傳入 type 參數限制檔案類型 (如 'application/pdf')。檢查回傳物件的 canceled 狀態。若成功，讀取 assets[0].uri 進行上傳處理。</p><h4>預期結果</h4><p>使用者能順利找到並選取目標文件。App 能正確識別檔案類型與大小。支援從雲端硬碟 (iCloud/Google Drive) 直接選取，無需先下載到手機。</p><h4>注意事項</h4><p>Android 與 iOS 的檔案 URI 格式可能不同，上傳時需注意路徑處理。對於過大的檔案，應在前端進行大小檢查並提示使用者。</p>"
  },
  {
    name: "expo-file-system",
    version: "^19.0.21",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "檔案系統存取。提供對本地檔案的讀寫、刪除與下載功能。",
    mainFunction: "<ul><li><strong>檔案讀寫操作</strong>：提供 readAsStringAsync 與 writeAsStringAsync 等方法。允許 App 在本地沙盒目錄中建立、讀取與修改檔案，適用於快取資料或儲存離線內容。</li><li><strong>檔案下載與上傳</strong>：內建 downloadAsync 與 uploadAsync。支援斷點續傳與背景下載，適合處理大檔案 (如 App 更新包、高畫質影片) 的傳輸。</li><li><strong>目錄管理</strong>：可以建立、刪除目錄，以及列出目錄內容。方便開發者管理 App 的本地暫存區 (Cache Directory) 與文件區 (Document Directory)。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Expo File System 為 App 提供了本地資料管理的基礎能力。在本專案中，它主要用於圖片/文件的暫存 (Caching)、離線合約的儲存，以及處理需要先下載到本地才能開啟的檔案。</p><h4>操作步驟</h4><p>使用 documentDirectory 或 cacheDirectory 取得路徑。呼叫 makeDirectoryAsync 建立資料夾。使用 downloadAsync 將遠端檔案下載至本地。使用 readAsStringAsync 讀取設定檔或日誌。</p><h4>預期結果</h4><p>App 能有效地管理本地儲存空間。離線時能讀取已下載的資料。大檔案下載穩定且可監控進度。暫存檔案能被正確清理，不佔用過多手機空間。</p><h4>注意事項</h4><p>需注意不同平台的檔案路徑差異。讀寫操作應放在 try-catch 區塊中處理錯誤。定期清理快取目錄以釋放空間。</p>"
  },
  {
    name: "expo-linking",
    version: "^8.0.11",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "深層連結 (Deep Linking)。處理 App 的外部連結開啟與內部路由跳轉。",
    mainFunction: "<ul><li><strong>Deep Link 解析</strong>：監聽並解析喚醒 App 的 URL (如 myapp://property/123)。將 URL 參數轉換為 App 內部的路由參數，導引用戶至指定頁面。</li><li><strong>開啟外部連結</strong>：提供 openURL 方法。允許 App 開啟系統瀏覽器、撥打電話 (tel:)、發送簡訊 (sms:) 或開啟地圖導航，與系統其他應用進行互動。</li><li><strong>通用連結 (Universal Links)</strong>：支援標準的 HTTPS 連結喚醒 App。讓使用者點擊網頁連結時，能直接跳轉到 App 對應頁面，提升轉換率。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Expo Linking 是連接 App 與外部世界的橋樑。它的目的是實現流暢的跳轉體驗，無論是從 Email 通知點擊查看房源，還是從 App 點擊地址開啟 Google Maps，都依賴此模組。</p><h4>操作步驟</h4><p>在 App 設定中配置 scheme。使用 createURL 產生連結。使用 useURL Hook 監聽連結變化。配置 React Navigation 的 linking 屬性以自動映射 URL 到路由。</p><h4>預期結果</h4><p>點擊通知或外部連結能準確開啟 App 並跳轉至目標頁面。App 能順利呼叫系統功能 (電話、瀏覽器)。路由狀態能與 URL 保持同步。</p><h4>注意事項</h4><p>需在 app.json 中設定 scheme。Universal Links 需要伺服器端配置 (apple-app-site-association)。測試時可使用 npx uri-scheme 指令。</p>"
  },
  {
    name: "@react-native-async-storage/async-storage",
    version: "^2.2.0",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "非同步本地存儲。用於持久化儲存簡單的鍵值對資料 (Key-Value Storage)。",
    mainFunction: "<ul><li><strong>持久化數據保存</strong>：將資料儲存在裝置的本地存儲空間中。即使 App 關閉或手機重啟，資料依然保留。適用於儲存使用者偏好設定、Auth Token 等。</li><li><strong>簡單的鍵值對 API</strong>：提供類似 Web LocalStorage 的 setItem, getItem, removeItem 方法。API 簡單易用，且全為非同步操作 (Promise)，不會阻塞 UI 執行緒。</li><li><strong>輕量級快取</strong>：可用於實作簡單的客戶端快取策略。將 API 回傳的 JSON 字串存入，在無網路時讀取顯示，提升 App 的離線可用性。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Async Storage 是 React Native 中最標準的輕量級存儲方案。本專案用它來記錄使用者的登入狀態 (Session Token)、介面語言偏好、以及一些不需要進資料庫的暫存設定。</p><h4>操作步驟</h4><p>匯入 AsyncStorage。使用 await AsyncStorage.setItem('key', 'value') 寫入資料。使用 await AsyncStorage.getItem('key') 讀取資料。若存物件需先 JSON.stringify。</p><h4>預期結果</h4><p>使用者下次開啟 App 時，無需重新登入 (若 Token 未過期)。偏好設定 (如深色模式) 能被記住。讀寫速度快，不影響 App 啟動效能。</p><h4>注意事項</h4><p>容量限制 (Android 預設 6MB)。不適合儲存大量或敏感資料 (無加密)。若需儲存敏感資訊，建議搭配 expo-secure-store。</p>"
  },
  {
    name: "react-native-url-polyfill",
    version: "^3.0.0",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "URL API Polyfill。在 React Native 環境中提供標準的 Web URL 物件支援。",
    mainFunction: "<ul><li><strong>標準 URL 物件實作</strong>：React Native 原生環境缺乏完整的 URL 與 URLSearchParams 實作。此套件補足了這塊，讓開發者能使用 new URL() 進行網址解析與參數操作。</li><li><strong>Supabase 相容性支援</strong>：Supabase JS Client 依賴標準的 URL API 來建構請求。引入此 Polyfill 是為了確保 Supabase 在 React Native 中能正常運作，避免發生 'URL is not defined' 錯誤。</li><li><strong>輕量且無副作用</strong>：僅在全域環境注入必要的 URL 類別，不會干擾其他原生模組的運作。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是一個基礎建設類的套件，主要目的是解決 React Native JS 引擎 (如 Hermes) 與標準 Web 環境之間的 API 差異。它是 Supabase Client 在 Mobile 端運行的必要前置條件。</p><h4>操作步驟</h4><p>在 App 的進入點 (通常是 index.js 或 App.tsx) 的最頂端，匯入此套件：import 'react-native-url-polyfill/auto'。之後即可在全域使用 URL 物件。</p><h4>預期結果</h4><p>Supabase Client 初始化成功。使用 new URL() 解析網址時不會報錯。URLSearchParams 能正確解析 Query String。</p><h4>注意事項</h4><p>務必在其他依賴 URL 的套件之前匯入。通常放在檔案的第一行。</p>"
  },
  {
    name: "@supabase/supabase-js",
    version: "^2.43.5",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "後端服務客戶端 (Mobile)。用於 Mobile App 與 Supabase 服務的連線。",
    mainFunction: "<ul><li><strong>跨平台 Auth 整合</strong>：在 Mobile 端實作使用者註冊與登入。搭配 Async Storage，能自動持久化使用者的 Session，實現「記住我」功能。</li><li><strong>資料庫即時連線</strong>：直接從手機端查詢 Postgres 資料庫。支援 Realtime 訂閱，讓聊天室訊息或通知能即時推播到手機上。</li><li><strong>檔案上傳與下載</strong>：整合 Storage Bucket。允許使用者直接從手機上傳照片或文件到雲端，並取得公開連結進行展示。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 Mobile App 的後端靈魂。它讓前端開發者無需構建中間層 API，即可安全、高效地存取後端資源。Mobile 版特別配置了 Async Storage 作為 Auth 的存儲介面。</p><h4>操作步驟</h4><p>建立 Supabase Client 時，配置 auth.storage 為 AsyncStorage，並設定 auth.autoRefreshToken 為 true。使用方式與 Web 端相同，但在處理 OAuth 登入時需搭配 Deep Linking。</p><h4>預期結果</h4><p>App 能順利登入並存取資料。Session 在 App 重啟後依然有效。即時功能在手機網路上也能穩定運作。符合 RLS 安全規範。</p><h4>注意事項</h4><p>Mobile 環境的網路狀況較不穩定，需做好錯誤處理與重試機制。OAuth 登入流程需正確設定 Redirect URL。</p>"
  },
  {
    name: "tailwindcss",
    version: "^3.4.19",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "Tailwind CSS (Mobile)。配合 NativeWind 在 Mobile 專案中定義樣式。",
    mainFunction: "<ul><li><strong>樣式定義來源</strong>：雖然 React Native 不直接支援 CSS，但此套件作為 NativeWind 的解析來源，提供了所有 Utility Classes 的定義與主題配置。</li><li><strong>IntelliSense 支援</strong>：在編輯 Mobile 程式碼時，提供 Tailwind 類別的自動完成與提示。讓開發者能像寫 Web 一樣快速編寫樣式。</li><li><strong>主題共用</strong>：複用 Web 端的 tailwind.config.js。確保 Mobile App 的顏色、字型大小等設計變數與 Web 端完全同步。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>在 Mobile 專案中安裝 tailwindcss 主要是為了配合 NativeWind 的編譯流程以及編輯器的開發體驗。它確保了「一套設計語言，多端通用」的策略得以實現。</p><h4>操作步驟</h4><p>安裝 tailwindcss。建立或共用 tailwind.config.js。在 content 陣列中加入 App 目錄下的檔案路徑。NativeWind 會在建置時讀取這些設定。</p><h4>預期結果</h4><p>開發者能在 App 專案中使用 Tailwind 語法。VS Code 能正確提示類別名稱。設計變數的修改能同時套用到 Web 與 App。</p><h4>注意事項</h4><p>Mobile 端實際上不會打包整個 CSS 檔案，而是由 NativeWind 提取用到的樣式。需注意某些 Web 專屬的 CSS 屬性在 React Native 中無效。</p>"
  },
  {
    name: "react",
    version: "19.2.4",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "React 核心庫 (Mobile)。驅動 React Native 的組件模型與狀態管理。",
    mainFunction: "<ul><li><strong>宣告式 UI 邏輯</strong>：提供 Component, Props, State 等核心概念。讓開發者能以組件化的方式構建原生 UI，邏輯清晰且易於複用。</li><li><strong>Hooks 機制</strong>：提供 useState, useEffect, useContext 等 Hooks。管理組件內部的狀態與副作用，是現代 React Native 開發的基礎。</li><li><strong>跨平台抽象</strong>：React 的虛擬 DOM (在 RN 中是 Shadow Tree) 機制，將 UI 描述與底層渲染分離，使得同一套邏輯能驅動不同平台 (iOS/Android) 的渲染引擎。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React 是 React Native 的心臟。它負責定義「做什麼 (What)」，而 React Native 負責「如何做 (How)」。本專案使用 React 19 版本，以配合最新的 React Native 架構。</p><h4>操作步驟</h4><p>與 Web 端相同，匯入 React 與 Hooks。編寫 Function Components。使用 JSX 描述 UI 結構。透過 Props 傳遞資料。</p><h4>預期結果</h4><p>組件邏輯清晰。狀態更新能正確觸發 UI 重繪。能使用 React 生態系中的各種 Hooks 與工具庫。</p><h4>注意事項</h4><p>React Native 的 React 版本通常由 React Native 版本鎖定，不建議隨意升級。需注意 React 19 的新特性 (如 use) 在 RN 中的支援度。</p>"
  },
  {
    name: "react-dom",
    version: "19.2.4",
    type: "dependency",
    location: "apps/mobile",
    environment: "production",
    description: "React DOM (Mobile)。支援 React Native Web 在瀏覽器環境的渲染。",
    mainFunction: "<ul><li><strong>Web 渲染入口</strong>：當 React Native 專案在 Web 環境 (如 Expo Web) 運行時，需要 React DOM 來將組件掛載到 HTML DOM 上。</li><li><strong>DOM 操作支援</strong>：提供 Web 平台專屬的渲染邏輯與事件處理機制。確保 React Native Web 轉換出的 HTML 元素能正確響應使用者互動。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>雖然這是 Mobile 專案，但為了支援 Expo 的 Web 預覽功能以及潛在的 PWA 需求，必須安裝 React DOM。它是 React Native Web 正常運作的必要依賴。</p><h4>操作步驟</h4><p>通常由 Expo CLI 自動處理。在 Web Entry file 中會呼叫 createRoot 或 render。</p><h4>預期結果</h4><p>Mobile 專案能透過 npx expo start --web 在瀏覽器中開啟。DOM 結構正確生成。</p><h4>注意事項</h4><p>版本必須與 react 套件嚴格一致。</p>"
  },
  {
    name: "@types/react",
    version: "~19.2.4",
    type: "devDependency",
    location: "apps/mobile",
    environment: "development",
    description: "React 型別定義 (Mobile)。提供 Mobile 專案中 React API 的 TypeScript 支援。",
    mainFunction: "<ul><li><strong>TypeScript 支援</strong>：為 React 的核心 API (如 useState, useEffect, Component) 提供型別定義。確保開發者在使用 React 時能獲得正確的型別檢查與提示。</li><li><strong>JSX 型別檢查</strong>：定義了 JSX 元素的型別規範。防止在編寫 UI 時傳入錯誤的 Props 或使用不存在的組件。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>確保 Mobile 專案的 TypeScript 開發體驗。透過準確的型別定義，減少 Runtime Errors，提升程式碼品質。</p><h4>操作步驟</h4><p>安裝後，TypeScript 編譯器會自動讀取。開發者在編寫組件時即享有型別保護。</p><h4>預期結果</h4><p>IDE 能正確提示 React API。編譯時能抓出型別錯誤。與 Web 端的型別定義保持一致。</p><h4>注意事項</h4><p>版本需與 react 套件匹配。</p>"
  },
  // --- Web Features ---
  {
    name: "heic2any",
    version: "^0.0.4",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "HEIC 圖片轉換。在瀏覽器端將 HEIC/HEIF 格式轉換為 JPEG/PNG。",
    mainFunction: "<ul><li><strong>iPhone 照片相容</strong>：解決瀏覽器 (特別是 Windows/Android) 無法原生顯示 iPhone 拍攝的 HEIC 照片的問題。在前端即時轉換格式，確保照片能被所有使用者觀看。</li><li><strong>前端轉檔</strong>：在使用者上傳前或預覽時進行轉換。減輕後端伺服器的轉檔負擔，並確保上傳到儲存體的都是通用格式 (JPEG/PNG)。</li><li><strong>Blob 處理</strong>：將轉換後的資料輸出為 Blob 物件，方便直接上傳或透過 URL.createObjectURL 進行預覽。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>房東經常使用 iPhone 拍攝房源照片，預設格式往往是 HEIC。為了確保這些照片能在所有裝置的瀏覽器上正常顯示，heic2any 扮演了關鍵的轉譯角色。</p><h4>操作步驟</h4><p>監聽檔案上傳事件。檢查檔案類型是否為 image/heic。若是，呼叫 heic2any({ blob, toType: 'image/jpeg' })。取得轉換後的 Blob 進行預覽或上傳。</p><h4>預期結果</h4><p>iPhone 上傳的照片能在 Web 上正常預覽。上傳到伺服器的檔案格式統一為 JPEG。使用者無感知的轉檔體驗。</p><h4>注意事項</h4><p>轉檔過程在前端進行，可能會消耗使用者裝置的 CPU。對於大量圖片，建議顯示處理進度。</p>"
  },
  {
    name: "react-dropzone",
    version: "^14.4.0",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "檔案拖曳上傳區。提供直觀的 Drag & Drop 檔案上傳介面。",
    mainFunction: "<ul><li><strong>拖放互動 (Drag & Drop)</strong>：提供一個可拖放的區域。使用者可以直接將電腦中的檔案拖入該區域進行上傳，大幅提升操作便利性。</li><li><strong>檔案驗證</strong>：內建檔案類型 (accept)、大小 (maxSize) 與數量 (multiple) 的驗證邏輯。在檔案進入上傳流程前就先篩選出不符規範的檔案。</li><li><strong>狀態回饋</strong>：提供 isDragActive, isDragReject 等狀態變數。開發者能根據狀態改變 UI 樣式 (如拖入時變色)，提供即時的視覺回饋。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Dropzone 的目的是優化 Web 端的上傳體驗。在房源管理與維修報修等場景，提供一個現代化、防呆且友善的檔案上傳入口。</p><h4>操作步驟</h4><p>使用 useDropzone Hook。設定 onDrop 回呼函式處理檔案。將 getRootProps 與 getInputProps 綁定到 UI 元素上。根據 fileRejections 顯示錯誤訊息。</p><h4>預期結果</h4><p>使用者能輕鬆拖放上傳檔案。無效檔案被自動攔截並提示。介面能即時反應拖放狀態。支援點擊上傳作為備案。</p><h4>注意事項</h4><p>需自行處理檔案預覽 (Preview) 的邏輯。注意記憶體洩漏，預覽用的 URL 需適時 revoke。</p>"
  },
  {
    name: "framer-motion",
    version: "^12.29.2",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "Web 動畫庫。為 React 組件提供宣告式的動畫與手勢支援。",
    mainFunction: "<ul><li><strong>宣告式動畫</strong>：透過 motion.div 等組件與 animate, initial, exit 屬性來定義動畫。語法簡潔直觀，輕鬆實現進場、離場與狀態切換動畫。</li><li><strong>Layout 動畫</strong>：強大的 layout 屬性。當 DOM 佈局改變 (如列表排序、項目刪除) 時，能自動計算並產生平滑的移動動畫，無需手動計算座標。</li><li><strong>手勢互動</strong>：內建 drag, hover, tap 等手勢監聽。能輕鬆製作可拖曳的卡片、懸停特效等互動元素。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Framer Motion 用於提升 Web App 的質感與互動性。在本專案中，它被用於頁面轉場、模態視窗 (Modal) 的彈出效果、以及 Dashboard 圖表的動態展示。</p><h4>操作步驟</h4><p>將 HTML 標籤替換為 motion.div。設定 initial={{ opacity: 0 }} animate={{ opacity: 1 }}。使用 AnimatePresence 處理組件移除時的動畫。使用 variants 管理複雜動畫狀態。</p><h4>預期結果</h4><p>介面操作流暢自然，無生硬的跳轉。列表變更時有視覺引導。互動元素具有物理質感。提升使用者的愉悅感。</p><h4>注意事項</h4><p>過度使用動畫可能影響效能，特別是在低階裝置上。Layout 動畫會觸發重排 (Reflow)，需謹慎使用。Server Component 中需標記為 'use client'。</p>"
  },
  {
    name: "@tanstack/react-table",
    version: "^8.21.3",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "Headless 表格庫。提供強大的表格邏輯 (排序、過濾、分頁)，不綁定 UI 樣式。",
    mainFunction: "<ul><li><strong>Headless 設計</strong>：僅提供表格的資料處理邏輯 (Hooks)，不渲染任何 HTML。開發者擁有 100% 的 UI 控制權，可以自由使用 Tailwind 或自訂組件來設計表格外觀。</li><li><strong>複雜資料處理</strong>：內建排序 (Sorting)、過濾 (Filtering)、分頁 (Pagination)、群組 (Grouping) 等功能。能高效處理大量數據，並支援伺服器端 (Server-side) 的資料模式。</li><li><strong>型別安全</strong>：完全使用 TypeScript 編寫。提供強大的泛型支援，確保表格資料與欄位定義的型別安全，減少開發錯誤。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>在管理後台，表格是最核心的元件。@tanstack/react-table 讓我們能構建功能強大且外觀完全客製化的資料表格，滿足房源列表、租客名單等複雜展示需求。</p><h4>操作步驟</h4><p>定義 columns 結構。使用 useReactTable Hook 傳入 data 與 columns。取得 getHeaderGroups 與 getRowModel。在 JSX 中手動渲染 &lt;table&gt;, &lt;thead&gt;, &lt;tbody&gt; 並綁定對應的 API。</p><h4>預期結果</h4><p>表格具備點擊排序、關鍵字搜尋、分頁切換等功能。UI 風格與專案完全一致。能夠處理數千筆資料而不卡頓 (搭配虛擬化)。</p><h4>注意事項</h4><p>學習曲線較陡峭，需理解 Headless 概念。需自行實作 UI 組件 (如分頁按鈕、篩選輸入框)。</p>"
  },
  {
    name: "@tanstack/react-query",
    version: "^5.90.20",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "伺服器狀態管理。負責 API 資料的獲取、快取、同步與更新。",
    mainFunction: "<ul><li><strong>自動快取與同步</strong>：自動快取 API 回傳的資料。當多個組件需要同一份資料時，不會重複發送請求。支援視窗聚焦重新驗證 (Refetch on Window Focus)，確保資料常保最新。</li><li><strong>Loading 與 Error 狀態管理</strong>：提供 isLoading, isError, data 等標準化狀態。開發者無需手動維護 loading state，大幅簡化非同步邏輯的編寫。</li><li><strong>樂觀更新 (Optimistic Updates)</strong>：支援在伺服器回應前先更新 UI。例如點擊「按讚」後立即變色，若請求失敗再回滾，提供極致的流暢體驗。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Query 取代了傳統的 useEffect + fetch 模式。它的目的是解決前端「伺服器狀態 (Server State)」管理的難題，確保 UI 總是顯示最新的後端資料，並提供優秀的快取策略。</p><h4>操作步驟</h4><p>使用 useQuery 定義資料獲取邏輯 (queryKey, queryFn)。使用 useMutation 處理資料修改。透過 queryClient.invalidateQueries 觸發資料重整。在 DevTools 中觀察快取狀態。</p><h4>預期結果</h4><p>頁面載入速度變快 (有快取時)。使用者切換分頁後資料能自動更新。減少不必要的網路請求。程式碼中不再充滿 loading/error 的樣板程式碼。</p><h4>注意事項</h4><p>需設定合理的 staleTime 與 gcTime 以優化快取策略。SSR 環境下需搭配 Hydration 使用。Mutation 後務必讓相關 Query 失效以更新畫面。</p>"
  },
  {
    name: "@tanstack/react-query-devtools",
    version: "^5.91.3",
    type: "dependency",
    location: "apps/web",
    environment: "development",
    description: "React Query 開發工具。視覺化檢視與除錯 Query 的狀態與快取。",
    mainFunction: "<ul><li><strong>快取狀態檢視</strong>：提供一個浮動視窗，即時顯示所有 Query 的狀態 (Fresh, Stale, Fetching)。開發者能清楚看到哪些資料正在載入，哪些使用了快取。</li><li><strong>手動操作</strong>：允許開發者手動觸發 Refetch、Invalidate 或 Reset。方便在開發過程中模擬各種資料更新情境，測試 UI 的反應。</li><li><strong>資料內容查看</strong>：直接查看快取中的 JSON 資料內容。無需 console.log 即可確認 API 回傳的結構是否正確。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是一個純開發用的工具，目的是幫助開發者理解與除錯 React Query 的黑盒運作。它能快速定位資料未更新、快取過期或請求失敗等問題。</p><h4>操作步驟</h4><p>在 App 的根組件中引入 &lt;ReactQueryDevtools initialIsOpen={false} /&gt;。在開發環境瀏覽器中點擊右下角的花朵圖示開啟面板。</p><h4>預期結果</h4><p>開發者能完全掌握 API 請求的時機與結果。大幅縮短除錯非同步問題的時間。確保快取策略如預期般運作。</p><h4>注意事項</h4><p>預設僅在 process.env.NODE_ENV === 'development' 下包含，生產環境會自動移除。</p>"
  },
  // --- Web Backend/Logic ---
  {
    name: "winston",
    version: "^3.19.0",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "通用日誌庫。強大且靈活的 Logging 系統，支援多種傳輸方式。",
    mainFunction: "<ul><li><strong>多種傳輸 (Transports)</strong>：支援將日誌輸出到多個目的地。開發時可輸出到 Console，生產環境可寫入檔案 (File) 或發送到外部日誌服務 (如 Datadog)，且可為不同目的地設定不同層級。</li><li><strong>日誌分級 (Log Levels)</strong>：支援標準的日誌層級 (Error, Warn, Info, Debug)。開發者能透過層級過濾日誌，快速聚焦於嚴重錯誤或除錯資訊。</li><li><strong>格式化 (Formatting)</strong>：提供強大的格式化 API。可將日誌輸出為 JSON 結構、加上時間戳記 (Timestamp) 或彩色標籤，方便機器解析與人工閱讀。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Winston 是本專案後端邏輯 (API Routes, Server Actions) 的日誌核心。它的目的是建立可追蹤、可觀測的系統，當發生錯誤時，能透過日誌快速還原現場，進行修復。</p><h4>操作步驟</h4><p>建立 logger 實例，配置 format 與 transports。在程式碼中呼叫 logger.info(), logger.error()。結合 winston-daily-rotate-file 進行檔案輪替。在 Middleware 中記錄請求資訊。</p><h4>預期結果</h4><p>所有系統行為都有跡可循。錯誤發生時能記錄完整的 Stack Trace 與 Context。日誌檔案按日期自動歸檔，不會無限增長。</p><h4>注意事項</h4><p>避免記錄敏感資訊 (如密碼、個資)。在 Vercel 等 Serverless 環境中，寫入本地檔案可能無效，需考慮串接外部 Log 服務。</p>"
  },
  {
    name: "winston-daily-rotate-file",
    version: "^5.0.0",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "日誌輪替插件。配合 Winston 實現按日期自動切割與清理日誌檔案。",
    mainFunction: "<ul><li><strong>按日期切割</strong>：自動根據日期 (如每天) 建立新的日誌檔案 (app-2023-10-01.log)。避免單一日誌檔案過大，導致開啟困難或佔用過多磁碟空間。</li><li><strong>自動清理 (Auto Retention)</strong>：支援設定保留天數或檔案數量 (如只保留 14 天)。過期的日誌檔案會被自動刪除，實現自動化的磁碟空間管理。</li><li><strong>壓縮封存</strong>：支援將舊的日誌檔案自動壓縮為 Gzip 格式。進一步節省儲存空間，適合長期保存歷史紀錄。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 Winston 的擴充套件，專門解決「日誌檔案管理」的問題。在長期運行的伺服器上，它能確保日誌系統不會因為檔案無限增長而塞滿硬碟，並方便管理員按日期查找紀錄。</p><h4>操作步驟</h4><p>在 Winston 的 transports 中加入 DailyRotateFile 實例。設定 filename pattern (包含 %DATE%)。設定 datePattern, zippedArchive, maxSize, maxFiles 等參數。</p><h4>預期結果</h4><p>日誌目錄井然有序，每天一個檔案。磁碟使用量受控。舊日誌自動輪替與刪除，無需人工介入維護。</p><h4>注意事項</h4><p>需確保應用程式有該目錄的寫入權限。在 Serverless 環境 (如 AWS Lambda) 通常不適用，因為沒有持久化的檔案系統。</p>"
  },
  {
    name: "nodemailer",
    version: "^8.0.0",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "郵件發送庫。Node.js 環境下最標準的 Email 發送解決方案。",
    mainFunction: "<ul><li><strong>SMTP 協定支援</strong>：支援透過標準 SMTP 協定連接各種郵件服務商 (如 Gmail, Outlook, AWS SES)。提供穩定可靠的郵件傳輸通道。</li><li><strong>豐富的內容支援</strong>：支援發送 HTML 格式的郵件、嵌入圖片、夾帶附件 (Attachments)。能製作精美的通知信、報表或行銷郵件。</li><li><strong>Unicode 支援</strong>：完美支援多國語系與 Emoji。確保郵件標題與內容中的中文或特殊符號能正確顯示，不會出現亂碼。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Nodemailer 負責本專案所有的對外溝通郵件，包含使用者註冊驗證、忘記密碼、合約簽署通知等。它是系統與使用者保持聯繫的重要管道。</p><h4>操作步驟</h4><p>使用 createTransport 建立傳輸實例 (傳入 host, port, auth)。使用 transport.sendMail 發送郵件 (設定 from, to, subject, html)。處理回傳的 Promise 以確認發送成功或失敗。</p><h4>預期結果</h4><p>使用者能即時收到系統通知信。郵件排版精美 (HTML)。附件能正確下載。發送失敗時系統能捕捉錯誤並重試或記錄。</p><h4>注意事項</h4><p>使用 Gmail 等服務需設定 App Password。大量發送需注意被標示為垃圾郵件的風險，建議使用專業的 ESP (Email Service Provider)。</p>"
  },
  {
    name: "@casl/react",
    version: "^5.0.1",
    type: "dependency",
    location: "apps/web",
    environment: "production",
    description: "CASL React 整合。在 React 組件中方便地使用 CASL 權限檢查。",
    mainFunction: "<ul><li><strong>Can 組件</strong>：提供 &lt;Can I='read' a='Article'&gt; 組件。以宣告式的方式控制 UI 元素的顯示與隱藏，若無權限則不渲染子元素。</li><li><strong>useAbility Hook</strong>：提供 useAbility Hook。讓開發者能在函式組件中直接存取 Ability 實例，進行命令式的權限檢查或條件判斷。</li><li><strong>Context 整合</strong>：透過 AbilityContext 提供全域的權限狀態。當使用者的權限更新時 (如切換角色)，所有相關的 UI 會自動重新渲染以反映最新權限。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 CASL 權限系統在前端的具體實作層。它讓開發者無需手動傳遞權限物件，即可在任何組件中輕鬆實現「權限感知 (Permission-Aware)」的 UI 設計。</p><h4>操作步驟</h4><p>在 App 根目錄使用 AbilityContext.Provider 注入 Ability 實例。在需要控管的按鈕或區塊外層包裹 &lt;Can&gt; 組件。或使用 useAbility 獲取 ability 物件進行邏輯判斷。</p><h4>預期結果</h4><p>介面能根據使用者權限動態變化。程式碼簡潔，無需大量的 if-else 判斷。權限邏輯與 UI 邏輯解耦。</p><h4>注意事項</h4><p>前端檢查僅供 UX 優化，後端 API 仍需獨立驗證。需確保 Ability 實例在權限變更時正確更新。</p>"
  },
  // --- Web Testing & Dev Tools ---
  {
    name: "jest",
    version: "^30.2.0",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "單元測試框架。JavaScript 生態系中最流行的測試運行器與斷言庫。",
    mainFunction: "<ul><li><strong>全功能測試套件</strong>：集成了 Test Runner (執行測試)、Assertion Library (斷言結果) 與 Mocking Library (模擬依賴)。開箱即用，無需繁瑣配置。</li><li><strong>快照測試 (Snapshot Testing)</strong>：能將 React 組件的渲染結果儲存為快照檔案。在後續測試中自動比對，快速偵測 UI 的意外變更。</li><li><strong>並行執行與覆蓋率</strong>：支援多執行緒並行測試，速度極快。內建程式碼覆蓋率 (Code Coverage) 報告，幫助團隊掌握測試的完整度。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Jest 是本專案單元測試 (Unit Test) 的基石。它的目的是驗證個別函式、組件或模組的邏輯正確性，確保在開發過程中不會破壞現有的功能 (Regression Testing)。</p><h4>操作步驟</h4><p>編寫 .test.ts 或 .spec.ts 檔案。使用 describe, test, expect 等全域函式編寫測試案例。使用 jest.fn() 或 jest.mock() 隔離外部依賴。執行 npm test 啟動測試。</p><h4>預期結果</h4><p>所有核心邏輯都經過測試驗證。測試報告顯示 Pass。能產出覆蓋率報告。重構程式碼時能透過測試快速確認安全性。</p><h4>注意事項</h4><p>與 Next.js 整合需配置 jest.setup.js 與 next.config.js。測試非同步邏輯需使用 async/await。</p>"
  },
  {
    name: "ts-jest",
    version: "^29.4.6",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "TypeScript 預處理器。讓 Jest 能直接執行 TypeScript 測試程式碼。",
    mainFunction: "<ul><li><strong>TypeScript 編譯</strong>：在 Jest 執行測試前，即時將 TypeScript 程式碼轉譯為 JavaScript。支援 Type Check，確保測試程式碼本身也沒有型別錯誤。</li><li><strong>Source Map 支援</strong>：保留原始 TypeScript 檔案的 Source Map。當測試失敗時，錯誤訊息能精確指向 TypeScript 原始碼的行數，而非轉譯後的 JS 檔案，方便除錯。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>由於 Jest 原生只懂 JavaScript，ts-jest 的目的是作為橋樑，讓 Jest 能夠理解並執行本專案中的 TypeScript 程式碼，實現無縫的 TS 測試體驗。</p><h4>操作步驟</h4><p>安裝 ts-jest。在 jest.config.js 中設定 preset: 'ts-jest'。配置 transform 以處理 .ts/.tsx 檔案。</p><h4>預期結果</h4><p>可以直接編寫並執行 .ts 測試檔。無需手動執行 tsc 編譯。除錯訊息清晰準確。</p><h4>注意事項</h4><p>需確保 ts-jest 版本與 jest 及 typescript 版本相容。</p>"
  },
  {
    name: "jest-environment-jsdom",
    version: "^30.2.0",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "JSDOM 環境。在 Node.js 中模擬瀏覽器的 DOM 環境，供 Jest 使用。",
    mainFunction: "<ul><li><strong>瀏覽器環境模擬</strong>：在 Node.js 中實作了 window, document 等瀏覽器全域物件。讓依賴 DOM API 的 React 組件能在純終端機環境下被渲染與測試。</li><li><strong>效能優化</strong>：相較於啟動真實瀏覽器 (如 Playwright)，JSDOM 更加輕量快速，適合執行大量的單元測試。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 Jest 測試 React 組件的必要環境。它讓我們能在不啟動瀏覽器的情況下，測試組件的渲染、事件綁定與 DOM 操作，是前端單元測試的基礎。</p><h4>操作步驟</h4><p>在 jest.config.js 中設定 testEnvironment: 'jsdom'。或在測試檔案頂部加入 @jest-environment jsdom 註解。</p><h4>預期結果</h4><p>React 組件能順利掛載 (Mount)。可以使用 document.querySelector 等 API 查詢虛擬 DOM。</p><h4>注意事項</h4><p>JSDOM 並非真實瀏覽器，某些佈局 (Layout) 或 CSS 相關的行為可能無法完美模擬。</p>"
  },
  {
    name: "@testing-library/react",
    version: "^16.3.2",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "React 測試庫。鼓勵以使用者角度進行組件測試的工具。",
    mainFunction: "<ul><li><strong>使用者導向的查詢</strong>：提供 getByText, getByRole 等查詢方法。鼓勵開發者像使用者一樣透過「看到的內容」來尋找元素，而非透過實作細節 (如 class 名稱)。</li><li><strong>組件渲染與互動</strong>：提供 render 函式將組件渲染到 JSDOM 中。搭配 fireEvent 或 user-event 模擬點擊、輸入等互動行為。</li><li><strong>Accessibility 優先</strong>：其查詢機制隱含了對無障礙性 (A11y) 的檢查。促使開發者編寫出對螢幕閱讀器更友善的 HTML 結構。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>React Testing Library (RTL) 是本專案測試 UI 組件的標準工具。它的目的是引導開發者編寫「信心度高」的測試—即測試使用者的行為，而非程式碼的實作細節，確保重構時測試不會輕易崩壞。</p><h4>操作步驟</h4><p>使用 render(<Component />) 渲染組件。使用 screen.getByText('Submit') 找到元素。使用 await user.click(button) 模擬操作。使用 expect().toBeInTheDocument() 驗證結果。</p><h4>預期結果</h4><p>測試腳本易讀且貼近真實使用情境。重構內部邏輯 (如 useState 改 useReducer) 時測試依然通過。提升 App 的無障礙性。</p><h4>注意事項</h4><p>避免使用 container.querySelector 等直接依賴 DOM 結構的查詢方式。盡量使用 *ByRole 查詢。</p>"
  },
  {
    name: "@testing-library/user-event",
    version: "^14.6.1",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "使用者事件模擬。提供比 fireEvent 更真實的使用者互動模擬。",
    mainFunction: "<ul><li><strong>真實互動模擬</strong>：相較於 fireEvent 只是單純觸發 DOM 事件，user-event 會模擬完整的瀏覽器行為。例如點擊按鈕時，會依序觸發 hover, focus, mousedown, mouseup, click 等一連串事件。</li><li><strong>複雜操作支援</strong>：支援打字 (type)、上傳檔案 (upload)、選擇下拉選單 (selectOptions) 等複雜互動，更貼近真實使用者的操作模式。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>為了讓測試更貼近真實，我們使用 user-event 來取代傳統的 fireEvent。它的目的是確保我們的測試能捕捉到那些只有在真實互動序列中才會出現的 Bug (如 focus 狀態處理)。</p><h4>操作步驟</h4><p>使用 userEvent.setup() 建立 user 實例。使用 await user.type(input, 'hello') 輸入文字。所有操作皆為非同步，需搭配 await。</p><h4>預期結果</h4><p>測試行為更可靠。能驗證 input 的 onChange, onFocus 等完整事件鏈。減少因測試模擬不精確導致的假陽性 (False Positives)。</p><h4>注意事項</h4><p>務必使用 await 呼叫所有 user 方法。建議在每個測試開始前 setup user。</p>"
  },
  {
    name: "@testing-library/jest-dom",
    version: "^6.9.1",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "Jest DOM 斷言擴充。提供針對 DOM 元素的自訂 Jest Matchers。",
    mainFunction: "<ul><li><strong>DOM 專屬斷言</strong>：擴充了 Jest 的 expect 功能，加入如 toBeInTheDocument, toHaveClass, toHaveStyle, toBeDisabled 等針對 DOM 狀態的斷言方法。</li><li><strong>可讀性提升</strong>：讓測試程式碼更像自然語言。例如 expect(element).toBeVisible() 比檢查 style display 屬性更直觀且易讀。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>此套件讓 Jest 的測試斷言更語意化，專門優化 DOM 測試的體驗。它幫助我們以更簡潔、描述性的方式驗證 UI 的狀態。</p><h4>操作步驟</h4><p>在 jest.setup.js 中匯入 import '@testing-library/jest-dom'。之後即可在測試中使用擴充的 matchers。</p><h4>預期結果</h4><p>測試程式碼可讀性大幅提升。錯誤訊息更具描述性 (例如會告訴你為什麼元素不可見)。</p><h4>注意事項</h4><p>需確認 setupFilesAfterEnv 設定正確，確保每個測試檔案都能自動載入。</p>"
  },
  {
    name: "eslint",
    version: "^9",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "程式碼檢查工具。靜態分析程式碼以發現問題並強制執行編碼風格。",
    mainFunction: "<ul><li><strong>語法與邏輯檢查</strong>：自動偵測潛在的程式錯誤 (如使用未定義變數、無窮迴圈)。在程式執行前就攔截 Bug。</li><li><strong>風格規範強制</strong>：統一團隊的程式碼風格 (如縮排、引號、分號)。確保多人協作時程式碼看起來像是由同一人撰寫。</li><li><strong>自動修復 (Auto-fix)</strong>：許多規則支援自動修復。開發者只需存檔，ESLint 就會自動修正格式問題，節省手動調整的時間。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>ESLint 是維持程式碼品質 (Code Quality) 的第一道防線。它的目的是在開發階段就發現錯誤，並強制執行團隊的 Coding Style，減少 Code Review 的時間成本。</p><h4>操作步驟</h4><p>配置 .eslintrc 檔案定義規則。安裝對應的 plugins (如 react, typescript)。在編輯器中安裝 ESLint 插件以實現即時紅線提示。執行 npm run lint 掃描全專案。</p><h4>預期結果</h4><p>程式碼風格統一。常見錯誤被消除。團隊協作更順暢。專案技術債降低。</p><h4>注意事項</h4><p>規則設定不宜過於嚴苛，應在規範與開發體驗間取得平衡。ESLint 9 有新的 Flat Config 格式，需注意設定檔差異。</p>"
  },
  {
    name: "prettier",
    version: "^3.0.0",
    type: "devDependency",
    location: "Monorepo Root",
    environment: "development",
    description: "程式碼格式化工具。自動排版程式碼，確保風格統一。",
    mainFunction: "<ul><li><strong>自動排版</strong>：無論開發者原本寫得如何亂，Prettier 都能將程式碼重新解析並列印成符合規範的格式 (行長、縮排、括號)。</li><li><strong>多語言支援</strong>：支援 JavaScript, TypeScript, CSS, HTML, JSON, Markdown 等多種檔案格式。統一整個專案所有類型檔案的風格。</li><li><strong>IDE 整合</strong>：與 VS Code 等編輯器完美整合。支援 'Format On Save'，存檔即排版，讓開發者完全無需操心格式問題。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>Prettier 專注於「格式 (Formatting)」，與專注於「邏輯 (Quality)」的 ESLint 相輔相成。它的目的是徹底終結關於「程式碼風格」的爭論，讓團隊專注於業務邏輯。</p><h4>操作步驟</h4><p>建立 .prettierrc 設定檔 (tabWidth, semi, singleQuote)。安裝 VS Code 插件並開啟 Format On Save。可配合 eslint-config-prettier 關閉 ESLint 中與格式衝突的規則。</p><h4>預期結果</h4><p>所有檔案格式整齊劃一。Git Diff 更乾淨，不會因為空白變更造成干擾。開發者無需手動調整縮排。</p><h4>注意事項</h4><p>應確保團隊成員使用相同的 Prettier 版本與設定檔。建議在 CI 流程中加入 prettier --check 檢查。</p>"
  },
  {
    name: "postcss",
    version: "^8.5.6",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "CSS 處理工具。用於轉換 CSS 代碼 (如 Tailwind 編譯)。",
    mainFunction: "<ul><li><strong>CSS 轉換引擎</strong>：提供插件系統來解析與轉換 CSS。是 Tailwind CSS 與 Autoprefixer 的底層運行平台。</li><li><strong>插件生態系</strong>：透過插件支援各種現代 CSS 特性 (Nesting, Variables) 轉譯為瀏覽器可執行的 CSS。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>PostCSS 是本專案 CSS 建置流程的核心引擎。它主要負責載入 Tailwind CSS 插件，將 Utility Classes 編譯為標準 CSS，並處理瀏覽器相容性。</p><h4>操作步驟</h4><p>配置 postcss.config.js。加入 tailwindcss 與 autoprefixer 插件。Next.js 會自動讀取並在建置時執行。</p><h4>預期結果</h4><p>Tailwind 語法能正確編譯。CSS 能相容舊版瀏覽器。建置流程自動化。</p><h4>注意事項</h4><p>通常無需直接操作 API，僅需維護設定檔。</p>"
  },
  {
    name: "autoprefixer",
    version: "^10.4.24",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "CSS 前綴自動補全。自動為 CSS 屬性加上瀏覽器廠商前綴 (-webkit-, -moz-)。",
    mainFunction: "<ul><li><strong>瀏覽器相容性處理</strong>：根據 Can I Use 的資料庫，自動判斷哪些 CSS 屬性需要加前綴才能在舊版瀏覽器中運作。</li><li><strong>代碼清理</strong>：開發者只需寫標準的 CSS (如 display: flex)，無需手動寫一堆 -webkit-box 等前綴，保持原始碼乾淨。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>確保 App 的樣式在各種瀏覽器 (Chrome, Safari, Firefox, Edge) 中都能呈現一致的效果，無需人工維護繁瑣的廠商前綴。</p><h4>操作步驟</h4><p>在 postcss.config.js 中加入 autoprefixer。在 package.json 中設定 browserslist 指定要支援的瀏覽器範圍。</p><h4>預期結果</h4><p>CSS 能在目標瀏覽器上正常顯示。減少因瀏覽器差異導致的破版問題。</p><h4>注意事項</h4><p>需定期更新 browserslist 資料庫以符合最新的瀏覽器市佔率。</p>"
  },
  {
    name: "babel-plugin-react-compiler",
    version: "1.0.0",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "React 編譯器 (React Forget)。自動優化 React 組件的渲染效能。",
    mainFunction: "<ul><li><strong>自動 Memoization</strong>：自動分析組件邏輯，對變數與函式進行快取 (Memoization)。開發者無需手動使用 useMemo 與 useCallback。</li><li><strong>渲染效能優化</strong>：大幅減少不必要的重新渲染 (Re-renders)。確保只有當資料真正改變時，相關的 UI 才會更新。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 React 19 的新一代編譯工具。它的目的是讓開發者專注於業務邏輯，而將「效能優化」的工作交給編譯器自動處理，降低 React 開發的心智負擔。</p><h4>操作步驟</h4><p>在 next.config.js 或 babel 設定中啟用此插件。確保專案使用 React 19。檢查 React DevTools 確認組件是否被優化。</p><h4>預期結果</h4><p>App 運行更流暢。程式碼更簡潔 (少了 useMemo/useCallback)。開發者無需擔心依賴陣列 (Dependency Array) 的正確性。</p><h4>注意事項</h4><p>目前仍為早期版本 (Experimental)，需注意潛在的 Bug 或相容性問題。</p>"
  },
  {
    name: "eslint-config-next",
    version: "16.1.6",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "Next.js ESLint 設定。包含 Next.js 專屬的最佳實踐與規則。",
    mainFunction: "<ul><li><strong>Next.js 規則集</strong>：整合了 Core Web Vitals 的檢查規則。例如檢查圖片是否使用 next/image，連結是否使用 Link 組件。</li><li><strong>配置簡化</strong>：一鍵引入所有 Next.js 建議的 ESLint 設定，無需手動配置多個 plugin。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>確保開發者遵循 Next.js 的最佳開發規範，避免常見的效能陷阱與錯誤使用方式。</p><h4>操作步驟</h4><p>在 .eslintrc 中繼承 'next' 或 'next/core-web-vitals'。</p><h4>預期結果</h4><p>能即時發現 Next.js 特有的效能問題。提升應用程式的 Web Vitals 分數。</p><h4>注意事項</h4><p>升級 Next.js 版本時應同步升級此套件。</p>"
  },
  {
    name: "@types/node",
    version: "^20",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "Node.js 型別定義。提供 Node.js 核心模組 (fs, path, process) 的型別支援。",
    mainFunction: "<ul><li><strong>Node API 型別支援</strong>：讓 TypeScript 認識 Node.js 的全域變數 (如 process.env) 與核心模組。在編寫 Next.js API Routes 或腳本時必備。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>支援後端邏輯與建置腳本的 TypeScript 開發。確保在使用 Node.js API 時有正確的型別提示。</p><h4>操作步驟</h4><p>安裝後自動生效。在 tsconfig.json 中確認 types 包含 node。</p><h4>預期結果</h4><p>編寫後端程式碼時有 IntelliSense。process.env 能被正確識別。</p><h4>注意事項</h4><p>版本應對應專案使用的 Node.js 版本 (LTS)。</p>"
  },
  {
    name: "@types/react-dom",
    version: "^19",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "React DOM 型別定義 (Web)。提供 Web 端 React DOM API 的型別支援。",
    mainFunction: "<ul><li><strong>DOM 型別支援</strong>：為 react-dom 套件提供型別定義。包含 createRoot, hydrateRoot 等 Client 端渲染 API。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>配合 React 19 與 TypeScript，確保 Web 端渲染邏輯的型別安全。</p><h4>操作步驟</h4><p>安裝後自動生效。</p><h4>預期結果</h4><p>React DOM 相關 API 使用無誤。</p><h4>注意事項</h4><p>版本需與 react-dom 匹配。</p>"
  },
  {
    name: "@types/nodemailer",
    version: "^7.0.9",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "Nodemailer 型別定義。提供郵件發送庫的 TypeScript 支援。",
    mainFunction: "<ul><li><strong>郵件型別支援</strong>：為 Nodemailer 提供完整的型別定義。讓開發者在設定 SMTP Config 或郵件內容選項時，能獲得屬性提示與檢查。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>確保郵件發送功能的開發體驗與安全性。避免因拼寫錯誤導致郵件發送失敗。</p><h4>操作步驟</h4><p>安裝後自動生效。</p><h4>預期結果</h4><p>編寫郵件邏輯時有完整的型別提示。</p><h4>注意事項</h4><p>版本需與 nodemailer 匹配。</p>"
  },
  {
    name: "@types/jest",
    version: "^30.0.0",
    type: "devDependency",
    location: "apps/web",
    environment: "development",
    description: "Jest 型別定義。提供測試框架的全域變數與 Matchers 的型別支援。",
    mainFunction: "<ul><li><strong>測試 API 型別</strong>：讓 TypeScript 認識 describe, test, expect, jest 等全域變數。</li><li><strong>Matchers 擴充</strong>：支援擴充自訂的 matchers (如 @testing-library/jest-dom 提供的)。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>讓 TypeScript 能理解測試檔案的語法，並提供編寫測試時的自動完成。</p><h4>操作步驟</h4><p>安裝後自動生效。需在 tsconfig.json 或 jest.config.js 中配置。</p><h4>預期結果</h4><p>編寫測試時無型別錯誤。IDE 支援測試語法高亮與提示。</p><h4>注意事項</h4><p>版本需與 jest 匹配。</p>"
  },
  {
    name: "@playwright/test",
    version: "^1.58.1",
    type: "devDependency",
    location: "apps/web",
    environment: "testing",
    description: "Playwright Test Runner。專為 E2E 測試設計的高效執行器。",
    mainFunction: "<ul><li><strong>並行測試執行</strong>：支援多 Process 並行執行測試檔案，大幅縮短 E2E 測試的總時間。</li><li><strong>強大的斷言庫</strong>：內建 expect 斷言，專為非同步的 Web 測試優化，自動等待元素狀態 (Auto-wait)。</li><li><strong>豐富的報告</strong>：生成詳細的 HTML 測試報告，包含測試步驟、截圖、影片與 Trace 資訊，方便除錯。</li></ul>",
    detailedDescription: "<h4>目的</h4><p>這是 Playwright 的核心執行模組。不同於核心的 playwright library (僅提供瀏覽器控制)，@playwright/test 提供了完整的測試框架功能，包含 Runner, Assertions 與 Reporter。</p><h4>操作步驟</h4><p>使用 npx playwright test 執行。在 playwright.config.ts 中設定瀏覽器與執行參數。編寫 .spec.ts 測試檔。</p><h4>預期結果</h4><p>E2E 測試穩定且快速。測試報告詳盡。CI/CD 整合容易。</p><h4>注意事項</h4><p>這是官方推薦的測試方式，應優先使用此套件而非僅使用 playwright core。</p>"
  }
];

// Merge logic
newPackages.forEach(pkg => {
  // Find existing package by name AND location to avoid cross-platform mix-up
  const index = data.packages.findIndex(p => p.name === pkg.name && p.location === pkg.location);
  if (index !== -1) {
    // Update existing
    data.packages[index] = { ...data.packages[index], ...pkg };
  } else {
    // Add new
    data.packages.push({
      ...pkg,
      environment: pkg.environment || (pkg.type === 'devDependency' ? 'development' : 'production'),
      isProduction: pkg.type !== 'devDependency'
    });
  }
});

// Write back
fs.writeFileSync(analysisPath, JSON.stringify(data, null, 2));
console.log(`Updated ${newPackages.length} packages in analysis.json`);
