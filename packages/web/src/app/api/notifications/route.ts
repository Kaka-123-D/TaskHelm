import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    ).all()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('GET /api/notifications failed:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
