'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 檢測是否為 iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // 檢測是否已安裝 (standalone 模式)
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsStandalone(standalone);

        // 監聽安裝提示事件 (Android/Chrome)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // 延遲顯示提示 (避免打擾用戶)
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // 顯示安裝提示
        await deferredPrompt.prompt();

        // 等待用戶選擇
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        // 清除提示
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // 記住用戶選擇，7 天內不再顯示
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // 如果已安裝，不顯示
    if (isStandalone) return null;

    // 如果用戶最近拒絕過，不顯示
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
            return null;
        }
    }

    // iOS 提示
    if (isIOS && showPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-2xl z-50 animate-slide-up">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/80 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-3">
                    <Download className="flex-shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-semibold mb-1">安裝到主畫面</h3>
                        <p className="text-sm text-white/90 mb-3">
                            點擊 Safari 底部的「分享」按鈕，然後選擇「加入主畫面」
                        </p>
                        <div className="flex gap-2 text-xs">
                            <div className="bg-white/20 px-3 py-1 rounded">📱 像 App 一樣使用</div>
                            <div className="bg-white/20 px-3 py-1 rounded">⚡ 更快啟動</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Chrome 提示
    if (deferredPrompt && showPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-2xl z-50 animate-slide-up">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/80 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-3">
                    <Download className="flex-shrink-0 mt-1" size={24} />
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">安裝應用程式</h3>
                        <p className="text-sm text-white/90 mb-3">
                            將房東管理系統安裝到您的裝置，享受更好的體驗
                        </p>
                        <div className="flex gap-2 mb-3 text-xs">
                            <div className="bg-white/20 px-3 py-1 rounded">📱 離線使用</div>
                            <div className="bg-white/20 px-3 py-1 rounded">⚡ 更快速度</div>
                        </div>
                        <button
                            onClick={handleInstallClick}
                            className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                            立即安裝
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
