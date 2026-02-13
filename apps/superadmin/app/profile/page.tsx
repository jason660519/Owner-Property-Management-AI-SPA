'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardLayout } from '@/components/dashboard';
import { User, Mail, Phone, MapPin, Shield, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/Badge';

interface UserProfile {
  email: string;
  phone: string | null;
  address: string | null;
  roles: string[];
  primary_role: string;
  last_sign_in_at: string | null;
  display_name: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超級管理員',
  landlord: '房東',
  tenant: '租客',
  agent: '房產經紀人',
  service_provider: '服務供應商'
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        
        // 1. Get Auth User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No authenticated user found');

        // 2. Get User Profile from DB
        const { data: userProfile, error: profileError } = await supabase
          .from('users_profile')
          .select('phone, address, roles, primary_role, display_name')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setProfile({
          email: user.email || '',
          phone: userProfile.phone,
          address: userProfile.address,
          roles: userProfile.roles || [],
          primary_role: userProfile.primary_role,
          last_sign_in_at: user.last_sign_in_at || null,
          display_name: userProfile.display_name
        });
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || '無法載入個人資料');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '無記錄';
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-bg-secondary transition-colors duration-200">
      <DashboardHeader />
      <Sidebar />
      <div className="ml-16 pt-16 transition-all duration-300 ease-in-out min-h-screen flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-x-hidden">
          <DashboardLayout
            pageTitle="個人檔案"
            breadcrumbs={[
              { label: '首頁', href: '/superadmin' },
              { label: '個人檔案' },
            ]}
          >
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                  <p className="text-text-secondary">正在載入個人資料...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4 text-red-700">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">載入失敗</h3>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Profile Card */}
              {!loading && !error && profile && (
                <div className="bg-bg-primary rounded-lg shadow-sm border border-border-default overflow-hidden">
                  <div className="h-32 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                  <div className="px-6 pb-6 relative">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4 sm:mb-0 gap-4">
                      <div className="h-24 w-24 rounded-full bg-bg-primary p-1 border-4 border-bg-primary z-10">
                        <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <User size={40} />
                        </div>
                      </div>
                      <div className="flex-1 text-center sm:text-left pt-2 sm:pt-12">
                        <h2 className="text-2xl font-bold text-text-primary">
                          {profile.display_name || '使用者'}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                          {profile.roles.map(role => (
                            <Badge 
                              key={role} 
                              variant={role === 'super_admin' ? 'default' : 'secondary'}
                              className={role === 'super_admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                            >
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary border-b border-border-default pb-2">基本資料</h3>
                        
                        <div className="flex items-center gap-3 text-text-secondary">
                          <Mail className="w-5 h-5 text-text-muted" />
                          <span>{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-text-secondary">
                          <Phone className="w-5 h-5 text-text-muted" />
                          <span>{profile.phone || '未設定'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-text-secondary">
                          <MapPin className="w-5 h-5 text-text-muted" />
                          <span>{profile.address || '未設定'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary border-b border-border-default pb-2">帳號安全</h3>
                        
                        <div className="flex items-center gap-3 text-text-secondary">
                          <Shield className="w-5 h-5 text-emerald-500" />
                          <span>
                            主要角色：{ROLE_LABELS[profile.primary_role] || profile.primary_role}
                          </span>
                        </div>
                        <div className="text-sm text-text-muted">
                          上次登入時間：{formatDate(profile.last_sign_in_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardLayout>
        </main>
      </div>
    </div>
  );
}
