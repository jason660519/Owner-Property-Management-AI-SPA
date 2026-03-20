import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const metric = await req.json();
    const supabase = createAdminClient();

    // Mapping metric to table columns
    // web-vitals sends metrics with: name, value, id, delta, entries
    const { name, value, id: sessionId, page_path } = metric;
    
    const metricData: any = {
      page_path: page_path || '/',
      session_id: sessionId,
      device_type: getDeviceType(req.headers.get('user-agent')),
      user_agent: req.headers.get('user-agent'),
      connection_type: (req as any).nextUrl?.searchParams?.get('conn') || null,
    };

    // Store value based on metric name
    switch (name) {
      case 'LCP':
        metricData.lcp_ms = value;
        break;
      case 'FID':
        metricData.fid_ms = value;
        break;
      case 'CLS':
        metricData.cls_score = value;
        break;
      case 'TTFB':
        metricData.ttfb_ms = value;
        break;
      case 'FCP':
        metricData.fcp_ms = value;
        break;
      case 'INP':
        metricData.inp_ms = value;
        break;
      default:
        // Ignore unknown metrics
        return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from('web_vitals').insert(metricData);

    if (error) {
      console.error('Error inserting web vital:', error);
      return NextResponse.json({ error: 'Failed to store metric' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web vitals ingestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDeviceType(ua: string | null): 'desktop' | 'mobile' | 'tablet' {
  if (!ua) return 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}
