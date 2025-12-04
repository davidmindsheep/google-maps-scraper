import { scrapeGoogleMaps } from '@/lib/scraper';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { location, criteria, limit } = await req.json();

    if (!location || !criteria) {
        return NextResponse.json({ error: 'Missing location or criteria' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const scrapeLimit = limit ? parseInt(limit) : 5;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const result of scrapeGoogleMaps(location, criteria, scrapeLimit)) {
                    controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'));
                }
            } catch (error) {
                controller.enqueue(encoder.encode(JSON.stringify({ error: 'Scraping failed' }) + '\n'));
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
        },
    });
}
