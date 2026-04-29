import { NextResponse } from 'next/server';
import { db } from '@/lib/firestore';

// GET - Public settings endpoint (no auth required)
export async function GET() {
  try {
    const settings = await db.settings.findFirst();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}
