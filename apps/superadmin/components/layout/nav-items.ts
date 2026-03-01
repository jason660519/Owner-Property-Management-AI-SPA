// Navigation item definitions — importable from both server and client components
import {
  Home,
  Building,
  FileText,
  Shield,
  Database,
  HardDrive,
  VenetianMask,
  Activity,
  Gauge,
  Brain,
  BookOpen,
  Key,
  Settings,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ElementType;
}

export const navItems: NavItem[] = [
  { name: 'Overview', href: '/superadmin', icon: Home },
  { name: 'IAM Management', href: '/superadmin/dashboard/iam-management', icon: Shield },
  { name: 'Properties Management', href: '/superadmin/properties', icon: Building },
  { name: 'Leases', href: '/superadmin/leases', icon: FileText },
  { name: 'Database', href: '/superadmin/dashboard/supabase', icon: Database },
  { name: 'Storage', href: '/superadmin/dashboard/storage', icon: HardDrive },
  { name: 'Impersonate', href: '/superadmin/role-simulation', icon: VenetianMask },
  { name: 'Behavior Monitor', href: '/superadmin/dashboard/behavior-monitoring', icon: Activity },
  { name: 'Performance Monitor', href: '/superadmin/dashboard/performance', icon: Gauge },
  { name: 'AI LLM Monitor', href: '/superadmin/dashboard/llm-monitor', icon: Brain },
  { name: 'Project Progress Dashboard', href: '/superadmin/dashboard/project-progress', icon: FileText },
  { name: 'Project Files', href: '/superadmin/docs', icon: BookOpen },
  { name: 'AI 服務 / API KEY', href: '/superadmin/settings/api_key_and_model_setting', icon: Key },
  { name: 'Settings', href: '/superadmin/settings', icon: Settings },
];
