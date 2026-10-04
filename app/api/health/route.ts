import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic - never pre-render during build
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if application is running
    const appStatus = 'ok'

    // Check database connection - only runs at request time, not build time
    await prisma.$queryRaw`SELECT 1`
    const dbStatus = 'connected'

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      app: appStatus,
    })
  } catch (error) {
    // Don't expose error details to prevent information disclosure
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        app: 'ok',
      },
      { status: 503 }
    )
  }
}
