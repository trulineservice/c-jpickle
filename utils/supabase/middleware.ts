import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Guard against missing environment variables in deployment
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Middleware Warning] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment variables.'
    )
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Refresh auth session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const method = request.method

    // 0. CSRF Protection: Validate Origin on state-changing API requests (POST/PUT/PATCH/DELETE)
    // Note: Next.js Server Actions automatically enforce Origin matching.
    // Webhooks (/api/webhooks/*) authenticate via HMAC payload signature headers.
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isApiRoute = pathname.startsWith('/api/')
    const isWebhook = pathname.startsWith('/api/webhooks/')

    if (isMutatingMethod && isApiRoute && !isWebhook) {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')

      if (origin && host) {
        try {
          const originHost = new URL(origin).host
          const isAllowed =
            originHost === host ||
            originHost.includes('localhost') ||
            originHost.includes('127.0.0.1') ||
            originHost.endsWith('vercel.app')

          if (!isAllowed) {
            console.warn(`[CSRF Blocked] Untrusted origin ${origin} for host ${host} on ${pathname}`)
            return new NextResponse(
              JSON.stringify({ error: 'Forbidden. Cross-Site Request Forgery (CSRF) origin check failed.' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          }
        } catch {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden. Invalid request origin format.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // 1. Basic Auth Check for private routes
    const isProtectedRoute =
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard')

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 2. Role-Based Access Control (RBAC)
    if (user && (pathname.startsWith('/cashier') || pathname.startsWith('/admin'))) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const userRole = profile?.role || 'client'
      const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin'
      const isStaff = isOwnerOrAdmin || userRole === 'cashier'

      if (pathname.startsWith('/admin') && !isOwnerOrAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/cashier') && !isStaff) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // 3. Redirect logged-in users away from auth pages
    const isAuthRoute = pathname === '/login' || pathname === '/signup'
    if (isAuthRoute && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('[Middleware Error] Failed to process session:', error)
  }

  return supabaseResponse
}