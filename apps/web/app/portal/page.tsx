'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Loader2, LogOut, ShieldCheck, AlertCircle, PlusCircle } from 'lucide-react';
import { getUserRoles } from '@/lib/actions/auth';
import { ROLE_METADATA } from '@/config/roles';
import type { RoleMetadata } from '@/config/roles';
import { canonicalizeRole } from '@/lib/roles';

// Helper to get role metadata (fallback if not in ROLE_METADATA)
const getRoleData = (role: string): RoleMetadata => {
  const found = ROLE_METADATA.find((r) => r.role === role);
  if (found) return found;

  // Fallback
  return {
    role: role as any,
    displayName: role.charAt(0).toUpperCase() + role.slice(1),
    description: `${role} 管理後台`,
    icon: ShieldCheck,
    color: 'text-gray-500',
    dashboardPath: `/portal/${role}`, // Default to redirector
  };
};

export default function PortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Array<{ role: string; disabled: boolean }>>([]);
  const [userName, setUserName] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login');
        return;
      }
      
      setUserName(user.user_metadata?.display_name || user.email);

      // Call Server Action
      const result = await getUserRoles(user.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Parse roles (normalize incoming role identifiers to canonical keys)
      const rawRoles = result.roles || [];
      const parsedRoles: Array<{ role: string; disabled: boolean }> = [];

      const pushRole = (r: string, disabled = false) => {
        // Try to canonicalize incoming role strings (e.g. "tenant/contracted" -> "contracted_tenant")
        const canonical = canonicalizeRole(r);
        parsedRoles.push({ role: canonical ?? r, disabled });
      };

      if (Array.isArray(rawRoles)) {
        rawRoles.forEach((item: any) => {
          if (typeof item === 'string') {
            pushRole(item, false);
          } else if (typeof item === 'object' && item.role) {
            pushRole(item.role, !!item.disabled);
          }
        });
      }

      // Sort: Super Admin, Landlord, then Alphabetical
      const sortedRoles = parsedRoles.sort((a, b) => {
        const priority: Record<string, number> = { super_admin: 1, landlord: 2 };
        const pA = priority[a.role] ?? 99;
        const pB = priority[b.role] ?? 99;

        if (pA !== pB) return pA - pB;
        return a.role.localeCompare(b.role);
      });

      setRoles(sortedRoles);
    } catch (err: any) {
      console.error('Error fetching portal data:', err);
      // "若 API 回傳 403/404" - server action catches and returns success: false
      // Display specific alert message
      setError('無法取得角色清單，請確認 Super Admin 權限或聯絡系統管理員');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
     // Skeleton
     return (
       <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
         <div className="w-full max-w-5xl">
            <div className="text-center mb-8 animate-pulse">
               <div className="h-8 w-64 bg-[#333333] rounded mx-auto mb-2"></div>
               <div className="h-4 w-48 bg-[#333333] rounded mx-auto"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-[#333333] bg-[#2A2A2A] p-6 h-40 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-[#333333]" />
                    <div className="h-6 w-32 rounded bg-[#333333]" />
                  </div>
                  <div className="h-4 w-full rounded bg-[#333333]" />
                </div>
              ))}
            </div>
         </div>
       </div>
     )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl"> {/* Increased max-w for 4 cols */}
        {error && (
            <Alert variant="destructive" className="mb-6">
                <AlertTitle className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    錯誤
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-2">
                    <Button onClick={fetchData} variant="outline" className="text-black bg-white hover:bg-gray-200 border-none h-8 px-3 text-sm">重新載入</Button>
                </div>
            </Alert>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            歡迎回來，{userName || '使用者'}
          </h1>
          <p className="text-gray-400">請選擇您要進入的身分工作區</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {roles.length > 0 ? (
            <>
              {roles.map((item) => {
              const config = getRoleData(item.role);
              const Icon = config.icon;
              
              // "若該 role 在 app_metadata.roles 中標記為 disabled: true"
              const isDisabled = item.disabled;

              const CardComponent = (
                <Card
                  className={`
                      h-full transition-all duration-200 bg-[#2A2A2A] border-[#333333]
                      ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:border-[#7C3AED] hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                      }
                  `}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isDisabled ? 'bg-gray-700 text-gray-400' : 'bg-[#7C3AED]/10 text-[#7C3AED]'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-lg text-white">{config.displayName}</CardTitle>
                    </div>
                    <CardDescription className="text-gray-400">
                      {isDisabled ? '權限尚未啟用' : (config.description || `${config.displayName} 管理後台`)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );

              if (isDisabled) {
                  return <div key={item.role}>{CardComponent}</div>;
              }

              return (
                <Link key={item.role} href={`/portal/${item.role}`} className="block h-full">
                  {CardComponent}
                </Link>
              );
            })}

            {/* Add Role Card */}
            <Link href="/onboarding/add-role" className="block h-full">
              <Card
                className="
                  h-full transition-all duration-200 bg-[#2A2A2A] border-2 border-dashed border-[#333333]
                  cursor-pointer hover:border-[#7C3AED] hover:bg-[#7C3AED]/5
                "
              >
                <CardHeader>
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="p-3 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                      <PlusCircle className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-lg text-white text-center">新增角色</CardTitle>
                    <CardDescription className="text-gray-400 text-center">
                      擴展您的使用需求
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </>
          ) : (
            <div className="col-span-full py-12 text-center bg-[#2A2A2A] border border-[#333333] rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">目前沒有可用的角色權限</p>
              <p className="text-gray-500 text-sm mt-2">請聯繫系統管理員為您分配角色</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-gray-500 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出帳號
          </Button>
        </div>
      </div>
    </div>
  );
}
