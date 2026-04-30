import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database, UserRole } from '@/types/database';

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/verify-otp']);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

function isOwnerPath(pathname: string) {
  return pathname === '/owner' || pathname.startsWith('/owner/');
}

function isOfficerPath(pathname: string) {
  return pathname === '/officer' || pathname.startsWith('/officer/');
}

function dashboardFor(role: UserRole): string {
  return role === 'owner' ? '/owner/dashboard' : '/officer/dashboard';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We always start by creating a response so we can pipe Supabase's set-cookie
  // mutations back to the browser (session refresh).
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session if needed and read the user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated → block protected routes
  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }
    if (pathname.startsWith('/api/')) {
      // API routes return JSON 401 instead of HTML redirect
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated → fetch role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // Profile may not exist yet (right after signUp before /api/auth/complete-registration runs).
  // In that case, the only legal pages are the verify-otp + complete-registration flow.
  if (!profile) {
    if (pathname === '/verify-otp' || pathname.startsWith('/api/auth/')) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/verify-otp';
    return NextResponse.redirect(url);
  }

  const role = profile.role as UserRole;

  // Authenticated user landing on auth pages → bounce to their dashboard
  if (pathname === '/login' || pathname === '/register' || pathname === '/verify-otp' || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = dashboardFor(role);
    return NextResponse.redirect(url);
  }

  // Role-based gating
  if (role === 'owner' && isOfficerPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/owner/dashboard';
    return NextResponse.redirect(url);
  }

  if ((role === 'officer' || role === 'admin') && isOwnerPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/officer/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     *   - _next static (chunks/images/etc)
     *   - favicon, public assets
     *   - locale JSON files
     */
    '/((?!_next/static|_next/image|favicon.ico|locales/|assets/).*)',
  ],
};
