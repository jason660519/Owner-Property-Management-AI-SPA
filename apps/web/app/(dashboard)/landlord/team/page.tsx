'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { UserPlus, CheckCircle, XCircle, Clock, ShieldCheck, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberPermissions,
  revokeMember,
  RESOURCES,
} from '@/lib/actions/landlord-team';
import type { TeamMember, MemberPermission } from '@/lib/actions/landlord-team';

function StatusBadge({ status }: { status: TeamMember['status'] }) {
  if (status === 'active') return <Badge variant="success">已接受</Badge>;
  if (status === 'pending') return <Badge variant="warning">待接受</Badge>;
  return <Badge variant="error">已撤銷</Badge>;
}

function PermCell({
  can, onChange, disabled,
}: { can: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!can)}
      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold border transition-colors
        ${can ? 'bg-green-600/20 border-green-600 text-green-400' : 'bg-[#2A2A2A] border-[#444] text-[#666]'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}
      `}
    >
      {can ? '✓' : '✗'}
    </button>
  );
}

function MemberRow({ member, onUpdate, onRevoke }: {
  member: TeamMember;
  onUpdate: (id: string, perms: MemberPermission[]) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [perms, setPerms] = useState<MemberPermission[]>(() =>
    RESOURCES.map((r) => {
      const found = member.permissions.find((p) => p.resource === r.id);
      return found ?? { resource: r.id, can_read: false, can_write: false, can_delete: false };
    }),
  );
  const [isSaving, startSave] = useTransition();
  const isRevoked = member.status === 'revoked';

  const updatePerm = (resource: string, field: keyof MemberPermission, value: boolean) => {
    setPerms((prev) => prev.map((p) => p.resource === resource ? { ...p, [field]: value } : p));
  };

  const save = () => {
    startSave(async () => {
      await onUpdate(member.id, perms);
    });
  };

  return (
    <div className="border border-[#333] rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2A2A2A] transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">{member.member_email}</p>
            <p className="text-xs text-gray-500">
              {member.role_label ?? member.member_role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={member.status} />
          {!isRevoked && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRevoke(member.id); }}
              className="p-1.5 rounded hover:bg-red-900/20 text-red-400"
              title="撤銷存取"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#333] p-4 space-y-3 bg-[#1A1A1A]">
          <p className="text-xs text-gray-400 uppercase tracking-wide">功能存取矩陣</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1 pr-4">資源</th>
                  <th className="text-center px-2">讀</th>
                  <th className="text-center px-2">寫</th>
                  <th className="text-center px-2">刪</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {RESOURCES.map((resource) => {
                  const perm = perms.find((p) => p.resource === resource.id)!;
                  return (
                    <tr key={resource.id}>
                      <td className="py-1.5 pr-4 text-white">{resource.label}</td>
                      <td className="text-center px-2">
                        <PermCell can={perm.can_read} disabled={isRevoked} onChange={(v) => updatePerm(resource.id, 'can_read', v)} />
                      </td>
                      <td className="text-center px-2">
                        <PermCell can={perm.can_write} disabled={isRevoked} onChange={(v) => updatePerm(resource.id, 'can_write', v)} />
                      </td>
                      <td className="text-center px-2">
                        <PermCell can={perm.can_delete} disabled={isRevoked} onChange={(v) => updatePerm(resource.id, 'can_delete', v)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isRevoked && (
            <Button
              size="sm"
              onClick={save}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
            >
              {isSaving ? '儲存中…' : '儲存權限'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LandlordTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'assistant' | 'accountant' | 'custom'>('assistant');
  const [inviteLabel, setInviteLabel] = useState('');
  const [isInviting, startInvite] = useTransition();
  const { showToast } = useToast();

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMembers();
      setMembers(data);
    } catch {
      showToast({ type: 'error', message: '載入失敗' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    startInvite(async () => {
      const { error } = await inviteTeamMember(
        inviteEmail.trim(),
        inviteRole,
        inviteRole === 'custom' ? inviteLabel || undefined : undefined,
      );
      if (error) {
        showToast({ type: 'error', message: error });
      } else {
        showToast({ type: 'success', message: `邀請已送出：${inviteEmail}` });
        setInviteEmail('');
        setInviteLabel('');
        setShowInvite(false);
        await reload();
      }
    });
  };

  const handleUpdate = useCallback(async (id: string, perms: MemberPermission[]) => {
    const { error } = await updateMemberPermissions(id, perms);
    if (error) showToast({ type: 'error', message: error });
    else showToast({ type: 'success', message: '權限已更新' });
  }, [showToast]);

  const handleRevoke = useCallback(async (id: string) => {
    if (!confirm('確定要撤銷此成員的存取權限？')) return;
    const { error } = await revokeMember(id);
    if (error) showToast({ type: 'error', message: error });
    else { showToast({ type: 'success', message: '已撤銷' }); await reload(); }
  }, [showToast, reload]);

  const active = members.filter((m) => m.status !== 'revoked');
  const revoked = members.filter((m) => m.status === 'revoked');

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="團隊成員與存取權限"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '存取矩陣' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">成員管理</h2>
            <p className="text-xs text-gray-500 mt-0.5">設定助理、會計等成員的功能存取權限</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowInvite((v) => !v)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white"
          >
            <UserPlus className="w-4 h-4" />
            邀請成員
          </Button>
        </div>

        {showInvite && (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="space-y-3 py-4">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">邀請新成員</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="成員 Email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-[#262626] border-[#444]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'assistant' | 'accountant' | 'custom')}
                  className="rounded border border-[#444] bg-[#262626] px-3 py-2 text-sm text-white"
                >
                  <option value="assistant">助理</option>
                  <option value="accountant">會計</option>
                  <option value="custom">自訂角色</option>
                </select>
                {inviteRole === 'custom' && (
                  <Input
                    placeholder="角色名稱（如「財務查看員」）"
                    value={inviteLabel}
                    onChange={(e) => setInviteLabel(e.target.value)}
                    className="bg-[#262626] border-[#444]"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {isInviting ? '送出中…' : '送出邀請'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500">載入中…</p>
        ) : active.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="py-8 text-center text-sm text-gray-500">
              尚未邀請任何成員
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((m) => (
              <MemberRow key={m.id} member={m} onUpdate={handleUpdate} onRevoke={handleRevoke} />
            ))}
          </div>
        )}

        {revoked.length > 0 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer select-none">已撤銷成員 ({revoked.length})</summary>
            <div className="mt-2 space-y-2">
              {revoked.map((m) => (
                <MemberRow key={m.id} member={m} onUpdate={handleUpdate} onRevoke={handleRevoke} />
              ))}
            </div>
          </details>
        )}
      </div>
    </DashboardLayout>
  );
}
