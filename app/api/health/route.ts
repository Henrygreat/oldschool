import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check if application is running
    const appStatus = 'ok'

    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    const dbStatus = 'ok'

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        app: appStatus,
        database: dbStatus,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          app: 'ok',
          database: 'error',
        },
      },
      { status: 503 }
    )
  }
}
