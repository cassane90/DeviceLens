function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ places: [], configured: false });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }

  const deviceName = typeof body?.deviceName === 'string'
    ? body.deviceName.trim().slice(0, 100)
    : '';

  const textQuery = deviceName
    ? `${deviceName} electronics repair shop`
    : 'electronics repair shop';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
          'places.regularOpeningHours',
          'places.internationalPhoneNumber',
          'places.websiteUri',
          'places.reviews'
        ].join(',')
      },
      body: JSON.stringify({
        textQuery,
        pageSize: 10,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: 12000
          }
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error('[DeviceLens] Places error', response.status, (await response.text()).slice(0, 500));
      return res.status(200).json({ places: [], configured: true });
    }

    const data = await response.json();
    const places = Array.isArray(data?.places) ? data.places : [];

    const normalized = places
      .filter(place => {
        const rating = Number(place?.rating);
        const count = Number(place?.userRatingCount || 0);
        return !Number.isFinite(rating) || rating >= 3.6 || count < 3;
      })
      .slice(0, 5)
      .map(place => {
        const reviews = Array.isArray(place?.reviews) ? place.reviews : [];
        const topReview = reviews[0]?.text?.text;

        return {
          name: place?.displayName?.text || 'Repair shop',
          address: place?.formattedAddress || '',
          rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating).toFixed(1) : '',
          reviewCount: Number(place?.userRatingCount || 0),
          uri: place?.googleMapsUri || '',
          phone: place?.internationalPhoneNumber || '',
          website: place?.websiteUri || '',
          isOpenNow: typeof place?.regularOpeningHours?.openNow === 'boolean'
            ? place.regularOpeningHours.openNow
            : undefined,
          topReview: typeof topReview === 'string' ? topReview.slice(0, 180) : ''
        };
      });

    return res.status(200).json({ places: normalized, configured: true });
  } catch (error) {
    clearTimeout(timer);
    console.error('[DeviceLens] Places handler failed', error);
    return res.status(200).json({ places: [], configured: true });
  }
}
