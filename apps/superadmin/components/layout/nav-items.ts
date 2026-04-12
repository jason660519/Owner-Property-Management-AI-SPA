// Navigation item definitions — importable from both server and client components
import {
  Home,
  Building,
  FileText,
  Shield,
  Database,
  HardDrive,
  Activity,
  Gauge,
  Brain,
  BookOpen,
  Key,
  Settings,
  BookMarked,
  Mail,
  Search,
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
  { name: 'Contact Leads', href: '/superadmin/contacts', icon: Mail },
  { name: 'Database', href: '/superadmin/dashboard/supabase', icon: Database },
  { name: 'Elasticsearch', href: '/superadmin/dashboard/elasticsearch', icon: Search },
  { name: 'Storage', href: '/superadmin/dashboard/storage', icon: HardDrive },
  { name: 'Behavior Monitor', href: '/superadmin/dashboard/behavior-monitoring', icon: Activity },
  { name: 'Performance Monitor', href: '/superadmin/dashboard/performance', icon: Gauge },
  { name: 'AI LLM Monitor', href: '/superadmin/dashboard/llm-monitor', icon: Brain },
  { name: 'Project Progress Dashboard', href: '/superadmin/dashboard/project-progress', icon: FileText },
  { name: 'Project Docs', href: '/superadmin/docs', icon: BookOpen },
  { name: 'Project Files', href: '/superadmin/project-file', icon: BookOpen },
  { name: 'AI 服務 / API KEY', href: '/superadmin/settings/api_key_and_model_setting', icon: Key },
  { name: 'Prompt 管理', href: '/superadmin/settings/prompt-management', icon: BookMarked },
  { name: 'Settings', href: '/superadmin/settings', icon: Settings },
];
