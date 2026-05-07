import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface AvailabilitySettings {
  openTime: string;
  closeTime: string;
  intervalMinutes: 30 | 60 | 90 | 120;
  availableDays: number[];
}

const DEFAULT_SETTINGS: AvailabilitySettings = {
  openTime: '09:00',
  closeTime: '18:00',
  intervalMinutes: 60,
  availableDays: [1, 2, 3, 4, 5],
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('landlord_availability_settings')
    .select('open_time, close_time, interval_minutes, available_days')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return NextResponse.json(DEFAULT_SETTINGS);

  return NextResponse.json({
    openTime: data.open_time,
    closeTime: data.close_time,
    intervalMinutes: data.interval_minutes,
    availableDays: data.available_days,
  } satisfies AvailabilitySettings);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<AvailabilitySettings>;
  const { openTime, closeTime, intervalMinutes, availableDays } = body;

  if (!openTime || !closeTime || !intervalMinutes || !availableDays) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (![30, 60, 90, 120].includes(intervalMinutes)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
  }

  const { error } = await supabase
    .from('landlord_availability_settings')
    .upsert(
      {
        user_id: user.id,
        open_time: openTime,
        close_time: closeTime,
        interval_minutes: intervalMinutes,
        available_days: availableDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
