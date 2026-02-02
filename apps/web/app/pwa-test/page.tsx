import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { CameraUpload } from '@/components/upload/CameraUpload';
import { Camera, Smartphone, Download, Check } from 'lucide-react';

export default function PWATestPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* PWA 安裝提示 */}
            <PWAInstallPrompt />

            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-purple-500">
                        📱 PWA 功能測試頁面
                    </h1>
                    <p className="text-gray-400 mt-2">
                        測試 Progressive Web App 功能和手機相機上傳
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* 功能說明 */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <Smartphone className="text-purple-500" />
                        PWA 功能說明
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* iOS 安裝 */}
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                🍎 iOS (Safari)
                            </h3>
                            <ol className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">1.</span>
                                    <span>點擊底部中間的「分享」按鈕</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">2.</span>
                                    <span>選擇「加入主畫面」</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">3.</span>
                                    <span>桌面出現圖標，點擊使用</span>
                                </li>
                            </ol>
                        </div>

                        {/* Android 安裝 */}
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                🤖 Android (Chrome)
                            </h3>
                            <ol className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">1.</span>
                                    <span>等待自動彈出安裝提示</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">2.</span>
                                    <span>點擊「立即安裝」按鈕</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">3.</span>
                                    <span>桌面出現圖標，點擊使用</span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* PWA 功能清單 */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <Check className="text-purple-500" />
                        已實現的功能
                    </h2>

                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            '✅ 安裝到桌面',
                            '✅ 全螢幕模式',
                            '✅ 離線基本功能',
                            '✅ 手機相機拍照',
                            '✅ 相簿選擇',
                            '✅ 文件上傳',
                            '✅ 響應式設計',
                            '✅ 自動安裝提示',
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="bg-gray-800 px-4 py-3 rounded-lg border border-gray-700 text-sm"
                            >
                                {feature}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 相機上傳測試 */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <Camera className="text-purple-500" />
                        手機相機上傳測試
                    </h2>

                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <p className="text-gray-300 mb-6">
                            在手機上測試拍照和相簿選擇功能。上傳的圖片會顯示預覽。
                        </p>

                        <CameraUpload
                            onUpload={async (file) => {
                                console.log('上傳文件:', file);
                                // 模擬上傳延遲
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                alert(`成功上傳: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
                            }}
                            maxSizeMB={10}
                        />
                    </div>
                </section>

                {/* 測試檢查清單 */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <Download className="text-purple-500" />
                        測試檢查清單
                    </h2>

                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <div className="space-y-3">
                            {[
                                '用手機瀏覽器訪問此頁面',
                                '測試安裝到桌面功能',
                                '測試拍照上傳功能',
                                '測試相簿選擇功能',
                                '檢查全螢幕模式',
                                '測試響應式設計',
                            ].map((item, index) => (
                                <label
                                    key={index}
                                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-gray-300">{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 使用提示 */}
                <section className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-3 text-purple-400">
                        💡 使用提示
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li>• 確保手機與電腦在同一 WiFi 網路</li>
                        <li>• 使用手機瀏覽器訪問: http://[你的電腦IP]:3000/pwa-test</li>
                        <li>• iOS 請使用 Safari 瀏覽器</li>
                        <li>• Android 請使用 Chrome 瀏覽器</li>
                        <li>• 安裝後可以像 Native App 一樣使用</li>
                    </ul>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 border-t border-gray-700 mt-12">
                <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
                    <p>房東管理系統 - PWA 測試頁面</p>
                    <p className="mt-1">專注 Next.js Web App 策略 🚀</p>
                </div>
            </footer>
        </div>
    );
}
