import { NextResponse } from 'next/server'

function buildExpiredCookieOptions() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    maxAge: 0,
  }
}

export async function GET() {
  const html = `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="cache-control" content="no-store" />
    <title>Clearing Auth…</title>
  </head>
  <body>
    <script>
      (function () {
        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        try {
          if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(function (dbs) {
              dbs.forEach(function (db) {
                if (db && db.name && String(db.name).toLowerCase().includes('supabase')) {
                  try { indexedDB.deleteDatabase(db.name); } catch (e) {}
                }
              });
            }).catch(function () {});
          }
        } catch (e) {}
        window.location.replace('/');
      })();
    </script>
  </body>
</html>`

  const res = new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
  const baseName = 'sb-localhost-auth-token'
  const options = buildExpiredCookieOptions()

  res.cookies.set(baseName, '', options)
  for (let i = 0; i < 10; i += 1) {
    res.cookies.set(`${baseName}.${i}`, '', options)
  }
  res.cookies.set('x-simulation-role', '', options)
  return res
}
