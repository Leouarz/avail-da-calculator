import { NextResponse } from 'next/server';

export const revalidate = 3600
export const dynamic = 'force-static';

const API_KEY = process.env.CMC_KEY;
const SYMBOL = 'AVAIL';

export async function GET() {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${SYMBOL}&convert=USD`;

    try {
        if (!API_KEY) {
            console.error(`No API key`);
            return NextResponse.json({ price: undefined });
        }
        const response = await fetch(url, {
            headers: {
                'X-CMC_PRO_API_KEY': API_KEY,
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return NextResponse.json({ price: undefined });
        }

        const data = await response.json();
        const price = data?.data?.[SYMBOL]?.quote?.USD?.price;

        if (price) {
            return NextResponse.json({ price });
        } else {
            console.error('Price data not found in API response');
            return NextResponse.json({ price: undefined });
        }
    } catch (error) {
        console.error('Error during API request:', error);
        return NextResponse.json({ price: undefined });
    }
}
