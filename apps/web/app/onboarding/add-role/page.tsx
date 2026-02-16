// filepath: apps/web/app/onboarding/add-role/page.tsx
/**
 * @file page.tsx
 * @description Add additional role page for existing users
 * @created 2026-02-16
 * @creator Claude Sonnet 4.5
 * @version 1.0
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Home, Key, ShoppingCart, DollarSign, ArrowLeft } from 'lucide-react';
import { addUserRole } from '@/app/actions/onboarding';
import { getUserRoles } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type RoleOption = {
  id: string;
  title: string;
  description: string;
  icon: typeof Home;
  color: string;
  role: 'landlord' | 'potential_tenant' | 'potential_buyer';
};

const ALL_ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'landlord',
    title: '房東 - 出租/出售',
    description: '管理我的物件，尋找租客或買家',
    icon: Home,
    color: 'text-blue-500',
    role: 'landlord',
  },
  {
    id: 'potential_tenant',
    title: '租客 - 租房',
    description: '尋找理想的租屋，輕鬆看房簽約',
    icon: Key,
    color: 'text-green-500',
    role: 'potential_tenant',
  },
  {
    id: 'potential_buyer',
    title: '買家 - 買房',
    description: '尋找夢想家園，一站式購屋服務',
    icon: ShoppingCart,
    color: 'text-purple-500',
    role: 'potential_buyer',
  },
];

export default function AddRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchCurrentRoles = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const result = await getUserRoles(user.id);

        if (result.success && result.roles) {
          const roles = result.roles.map((r: any) => (typeof r === 'string' ? r : r.role));
          setCurrentRoles(roles);

          // Filter out roles user already has
          const available = ALL_ROLE_OPTIONS.filter(
            (option) => !roles.includes(option.role)
          );

          setAvailableRoles(available);

          if (available.length === 0) {
            setError('您已經擁有所有可用的角色了！');
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching roles:', err);
        setError('無法載入角色資料');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentRoles();
  }, [router]);

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError('請選擇一個角色');
      return;
    }

    const option = availableRoles.find((opt) => opt.id === selectedRole);
    if (!option) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addUserRole(option.role);

      if (!result.success) {
        setError(result.error || '新增角色失敗，請重試');
        setIsSubmitting(false);
        return;
      }

      // Success - force full page reload to ensure state is fresh
      window.location.href = '/portal';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發生錯誤，請重試');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Back to Portal Link */}
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回角色選擇
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#7C3AED] rounded-2xl flex items-center justify-center">
              <span className="text-white text-4xl font-bold">+</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">新增使用角色</h1>
          <p className="text-gray-400 text-lg">
            選擇您的新需求，擴展平台使用範圍
          </p>
        </div>

        {/* Current Roles Display */}
        {currentRoles.length > 0 && (
          <div className="mb-8 p-4 bg-[#2A2A2A] border border-[#333333] rounded-lg">
            <p className="text-gray-400 text-sm mb-2">目前已有角色：</p>
            <div className="flex flex-wrap gap-2">
              {currentRoles.map((role) => {
                const roleData = ALL_ROLE_OPTIONS.find((opt) => opt.role === role);
                return (
                  <span
                    key={role}
                    className="px-3 py-1 bg-[#7C3AED]/20 text-[#7C3AED] rounded-full text-sm"
                  >
                    {roleData?.title || role}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-500 text-center">{error}</p>
          </div>
        )}

        {availableRoles.length > 0 ? (
          <>
            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {availableRoles.map((option) => {
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
                      <div className="flex flex-col items-center text-center gap-4">
                        <div
                          className={`
                            p-3 rounded-xl transition-colors
                            ${isSelected ? 'bg-[#7C3AED] text-white' : 'bg-[#333333]'}
                          `}
                        >
                          <Icon
                            className={`w-8 h-8 ${isSelected ? 'text-white' : option.color}`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white mb-2">
                            {option.title}
                          </CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            {option.description}
                          </CardDescription>
                        </div>
                        {isSelected && (
                          <div className="mt-2">
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
                {isSubmitting ? '新增中...' : '確認新增'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">您已經擁有所有可用的角色</p>
            <Link href="/portal">
              <Button variant="primary">返回角色選擇</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
