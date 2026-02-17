'use client';

import { redirect } from 'next/navigation';

export default function LegacyAIServiceRedirectPage() {
  redirect('/superadmin/settings/api_key_and_model_setting');
}
