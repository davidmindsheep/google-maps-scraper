import { testConnection } from '@/lib/scraper';
import { NextResponse } from 'next/server';

export async function GET() {
    const result = await testConnection();
    return NextResponse.json(result);
}
