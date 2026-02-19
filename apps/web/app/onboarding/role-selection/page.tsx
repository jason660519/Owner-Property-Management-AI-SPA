// filepath: apps/web/app/onboarding/role-selection/page.tsx
/**
 * @file page.tsx
 * @description Role selection page for new OAuth users
 * @created 2026-02-16
 * @creator Claude Sonnet 4.5
 * @version 1.0
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Home, Key, ShoppingCart, DollarSign } from 'lucide-react';
import { createUserProfile } from '@/lib/actions/onboarding';

type RoleOption = {
  id: string;
  title: string;
  description: string;
  icon: typeof Home;
  color: string;
  role: 'landlord' | 'potential_tenant' | 'potential_buyer';
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'landlord_rent',
    title: '我是房東我要出租',
    description: '管理我的出租物件，尋找優質租客',
    icon: Home,
    color: 'text-blue-500',
    role: 'landlord',
  },
  {
    id: 'tenant',
    title: '我是租客我要租房',
    description: '尋找理想的租屋，輕鬆看房簽約',
    icon: Key,
    color: 'text-green-500',
    role: 'potential_tenant',
  },
  {
    id: 'buyer',
    title: '我是買家我要買房',
    description: '尋找夢想家園，一站式購屋服務',
    icon: ShoppingCart,
    color: 'text-purple-500',
    role: 'potential_buyer',
  },
  {
    id: 'landlord_sell',
    title: '我是屋主我要賣房',
    description: '出售我的房產，快速成交好價格',
    icon: DollarSign,
    color: 'text-orange-500',
    role: 'landlord',
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError('請選擇一個角色');
      return;
    }

    const option = ROLE_OPTIONS.find((opt) => opt.id === selectedRole);
    if (!option) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createUserProfile(option.role);

      if (!result.success) {
        setError(result.error || '建立帳號失敗，請重試');
        return;
      }

      // Redirect to dashboard
      const dashboardPath = result.dashboardPath || `/${option.role.replace('_', '-')}/dashboard`;
      window.location.href = dashboardPath;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發生錯誤，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#7C3AED] rounded-2xl flex items-center justify-center">
              <span className="text-white text-4xl font-bold">R</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            歡迎加入 RESA AI 房產管理平台
          </h1>
          <p className="text-gray-400 text-lg">
            請選擇您的主要需求，開始使用我們的服務
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-500 text-center">{error}</p>
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.id;

            return (
              <Card
                key={option.id}
                onClick={() => setSelectedRole(option.id)}
                className={`
                  cursor-pointer transition-all duration-200 bg-[#2A2A2A] border-2
                  ${
                    isSelected
                      ? 'border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                      : 'border-[#333333] hover:border-[#7C3AED]/50 hover:shadow-[0_0_10px_rgba(124,58,237,0.2)]'
                  }
                `}
              >
                <CardHeader className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`
                        p-3 rounded-xl transition-colors
                        ${isSelected ? 'bg-[#7C3AED] text-white' : 'bg-[#333333]'}
                      `}
                    >
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : option.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-white mb-2">
                        {option.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {option.description}
                      </CardDescription>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-[#7C3AED] rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            variant="primary"
            className="px-12 py-6 text-lg"
            loading={isSubmitting}
          >
            {isSubmitting ? '建立帳號中...' : '開始使用'}
          </Button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            您可以隨時在帳號設定中新增其他角色
          </p>
        </div>
      </div>
    </div>
  );
}
