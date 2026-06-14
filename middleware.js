import { NextResponse } from 'next/server';

const rateLimitMap = new Map();

const RATE_LIMITS = {
  '/api/create-payment':  { windowMs: 60_000, maxRequests: 10  },
  '/api/capture-payment': { windowMs: 60_000, maxRequests: 10  },
  '/api/log-transaction': { windowMs: 60_000, maxRequests: 20  },
  'default':              { windowMs: 60_000, maxRequests: 100 },
};

function getRateLimit(pathname) {
  return RATE_LIMITS[pathname] ?? RATE_LIMITS['default'];
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) ?? { count: 0, resetAt: now + limit.windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + limit.windowMs;
  }
  entry.count++;
  rateLimitMap.set(key, entry);
  return {
    allowed: entry.count <= limit.maxRequests,
    remaining: Math.max(0, limit.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  if (pathname.startsWith('/api/')) {
    const limit = getRateLimit(pathname);
    const key = `${ip}:${pathname}`;
    const result = checkRateLimit(key, limit);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.', retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)), 'X-RateLimit-Limit': String(limit.maxRequests), 'X-RateLimit-Remaining': String(result.remaining) } }
      );
    }

    const userAgent = request.headers.get('user-agent') ?? '';
    if (!userAgent || userAgent.length < 5) {
      return new NextResponse(JSON.stringify({ error: 'Request blocked' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(limit.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
