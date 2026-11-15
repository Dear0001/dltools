// Thin proxy to Open-Meteo (free, no API key) so the browser never sends the
// user's location to a third party and responses can be cached for a while.
import type { WeatherCategory } from '@/lib/theme';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_SECONDS = 1800;

/** WMO weather interpretation codes -> the few categories the themes care about. */
function categoryFor(code: number): WeatherCategory {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 2) return 'cloudy';
  return 'clear';
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // City search: used once, when the user types a city to follow.
  const city = params.get('city')?.trim();
  if (city) {
    if (city.length > 80) return fail('City name is too long.', 400);
    try {
      const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 86400 },
      });
      if (!res.ok) throw new Error('geocode');
      const data = (await res.json()) as { results?: { name: string; country?: string; latitude: number; longitude: number }[] };
      const hit = data.results?.[0];
      if (!hit) return fail('City not found.', 404);
      return Response.json({
        location: {
          name: hit.country ? `${hit.name}, ${hit.country}` : hit.name,
          latitude: Math.round(hit.latitude * 100) / 100,
          longitude: Math.round(hit.longitude * 100) / 100,
        },
      });
    } catch {
      return fail('City lookup is unavailable right now.', 502);
    }
  }

  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  if (!params.get('lat') || !params.get('lon') || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return fail('Provide a city, or valid lat and lon.', 400);
  }
  // Rounded to ~1 km: plenty for weather, and it keeps the cache effective.
  const qLat = lat.toFixed(2);
  const qLon = lon.toFixed(2);

  try {
    const res = await fetch(
      `${FORECAST_URL}?latitude=${qLat}&longitude=${qLon}&current=weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: CACHE_SECONDS } },
    );
    if (!res.ok) throw new Error('forecast');
    const data = (await res.json()) as {
      current?: { time: string; weather_code: number; is_day: number };
      daily?: { sunset?: string[] };
    };
    if (!data.current) throw new Error('shape');

    // Times come back as local "YYYY-MM-DDTHH:mm" strings, so parse them the same way to compare.
    const now = Date.parse(data.current.time);
    const sunset = data.daily?.sunset?.[0] ? Date.parse(data.daily.sunset[0]) : NaN;
    const twilight = Number.isFinite(sunset) && now >= sunset - 30 * 60_000 && now <= sunset + 60 * 60_000;

    return Response.json({
      category: categoryFor(data.current.weather_code),
      isDay: data.current.is_day === 1,
      twilight,
    });
  } catch {
    return fail('Weather is unavailable right now.', 502);
  }
}
