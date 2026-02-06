import { test } from '@playwright/test';

test('Reset password for a0405142777@gmail.com', async () => {
  const NEW_PASSWORD = 'NewPassword123!';
  const USER_EMAIL = 'a0405142777@gmail.com';
  const USER_ID = 'a0f21370-d913-4242-a0f1-306de21a4b50';

  console.log('🔄 Resetting password for:', USER_EMAIL);

  const response = await fetch('http://127.0.0.1:54321/auth/v1/admin/users/' + USER_ID, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
      Authorization: 'Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
    },
    body: JSON.stringify({
      password: NEW_PASSWORD,
    }),
  });

  if (response.ok) {
    console.log('✅ Password reset successful!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', USER_EMAIL);
    console.log('🔑 New Password:', NEW_PASSWORD);
    console.log('═══════════════════════════════════════');
  } else {
    const error = await response.text();
    console.log('❌ Password reset failed:', error);
  }
});
