/**
 * Currency conversion utility with live exchange rates
 * Falls back to conservative rate if API fails
 */

const EXCHANGE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const FALLBACK_KES_TO_USD = 0.0077; // Conservative fallback rate

export interface ConversionResult {
  usdAmount: number;
  rate: number;
  notice: string;
}

export async function convertKEStoUSD(amountKES: number): Promise<ConversionResult> {
  try {
    // Use exchangerate-api.com (free tier: 1,500 requests/month)
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/KES/USD/${amountKES}`,
      {
        // Standard fetch cache control
        cache: 'default',
        // Add cache headers if needed by the API
      }
    );
    
    if (!response.ok) throw new Error('Exchange API request failed');
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('Exchange API returned error');
    }
    
    return {
      usdAmount: parseFloat(data.conversion_result.toFixed(2)),
      rate: data.conversion_rate,
      notice: `Converted at current rate: ${data.conversion_rate.toFixed(4)} (1 KES = ${data.conversion_rate.toFixed(4)} USD)`
    };
  } catch (error) {
    console.error('Currency conversion API failed, using fallback rate:', error);
    
    // Use conservative fallback rate
    return {
      usdAmount: parseFloat((amountKES * FALLBACK_KES_TO_USD).toFixed(2)),
      rate: FALLBACK_KES_TO_USD,
      notice: 'Converted using fallback rate (API unavailable). Rate may differ from current market rate.'
    };
  }
}
