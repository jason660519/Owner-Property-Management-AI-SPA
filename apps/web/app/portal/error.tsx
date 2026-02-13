
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2A2A2A] border border-[#333333] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-red-500/10 text-red-500">
            <AlertCircle className="w-12 h-12" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">系統發生錯誤</h2>
        <p className="text-gray-400 mb-8">
          載入角色入口時發生預期外的錯誤，請嘗試重新載入或聯絡管理員。
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => reset()}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            嘗試重新載入
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/login'}
            className="w-full text-gray-500 hover:text-white hover:bg-white/10"
          >
            返回登入頁面
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-black/20 rounded text-left overflow-auto max-h-40">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
