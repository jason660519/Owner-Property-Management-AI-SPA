'use client';

// Fetches all active engineer profiles for the assignee dropdown
// and claim/assign flows.

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface EngineerProfile {
  id: string;
  user_id: string;
  display_name: string;
  preferred_ide: string;
  default_role: string;
  is_active: boolean;
}

export interface UseEngineerProfilesReturn {
  profiles: EngineerProfile[];
  profilesByUserId: Record<string, EngineerProfile>;
  isLoading: boolean;
}

export function useEngineerProfiles(): UseEngineerProfilesReturn {
  const [profiles, setProfiles] = useState<EngineerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('engineer_profiles')
          .select('id, user_id, display_name, preferred_ide, default_role, is_active')
          .eq('is_active', true)
          .order('display_name');
        if (!cancelled && data) {
          setProfiles(data as EngineerProfile[]);
        }
      } catch {
        // best-effort — empty list on failure
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const profilesByUserId: Record<string, EngineerProfile> = {};
  for (const p of profiles) {
    profilesByUserId[p.user_id] = p;
  }

  return { profiles, profilesByUserId, isLoading };
}
