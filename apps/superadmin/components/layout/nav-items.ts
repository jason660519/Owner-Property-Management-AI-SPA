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
  GitBranch,
  Wrench,
  ShieldAlert,
  Users,
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
  { name: '網路安全 / 隱私審計', href: '/superadmin/dashboard/security', icon: ShieldAlert },
  { name: 'Properties Management', href: '/superadmin/properties', icon: Building },
  { name: 'Contact Leads', href: '/superadmin/contacts', icon: Mail },
  { name: 'Database', href: '/superadmin/dashboard/supabase', icon: Database },
  { name: 'Elasticsearch', href: '/superadmin/dashboard/elasticsearch', icon: Search },
  { name: 'Storage', href: '/superadmin/dashboard/storage', icon: HardDrive },
  { name: 'Behavior Monitor', href: '/superadmin/dashboard/behavior-monitoring', icon: Activity },
  { name: 'Performance Monitor', href: '/superadmin/dashboard/performance', icon: Gauge },
  { name: 'AI LLM Monitor', href: '/superadmin/dashboard/llm-monitor', icon: Brain },
  { name: 'Project Progress Dashboard', href: '/superadmin/dashboard/project-progress', icon: FileText },
  { name: 'Paperclip Worktrees', href: '/superadmin/dashboard/paperclip-worktrees', icon: GitBranch },
  { name: 'Project Docs', href: '/superadmin/docs', icon: BookOpen },
  { name: 'Project Files', href: '/superadmin/project-file', icon: BookOpen },
  // Row 146: collapsed three people-database entries into a single hub.
  // Sub-features (search / import / merge / ingest / sources) live as tabs on the consolidated page.
  { name: '尋人資料庫', href: '/superadmin/settings/people-database?tab=search', icon: Users },
  { name: 'AI 服務 / API KEY', href: '/superadmin/settings/api_key_and_model_setting', icon: Key },
  { name: 'Prompt 管理', href: '/superadmin/settings/prompt-management', icon: BookMarked },
  { name: 'Tools', href: '/superadmin/tools', icon: Wrench },
  { name: 'Settings', href: '/superadmin/settings', icon: Settings },
];
