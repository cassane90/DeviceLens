const PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY_2;
const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.regularOpeningHours',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.reviews',
].join(',');

export interface PlaceResult {
  name: string;
  address: string;
  rating: string;
  reviewCount: number;
  uri: string;
  phone?: string;
  website?: string;
  isOpenNow?: boolean;
  topReview?: string;
}

export async function findNearbyRepairShops(
  lat: number,
  lng: number,
  radiusMeters = 8000
): Promise<PlaceResult[]> {
  if (!PLACES_API_KEY) return [];

  const body = {
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
    },
    includedTypes: ['electronics_store', 'cell_phone_store', 'computer_store'],
    maxResultCount: 10,
    rankPreference: 'DISTANCE',
  };

  let data: Record<string, unknown>;
  try {
    const res = await fetch(NEARBY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    data = await res.json() as Record<string, unknown>;
  } catch {
    return [];
  }

  const places = (data.places as unknown[]) ?? [];

  return (places as Record<string, unknown>[])
    .filter((p) => {
      const rating = p.rating as number | undefined;
      const count = p.userRatingCount as number | undefined;
      return !rating || (rating >= 3.8 && (count ?? 0) >= 3);
    })
    .slice(0, 5)
    .map((p): PlaceResult => {
      const name = (p.displayName as { text: string })?.text ?? 'Repair Shop';
      const address = (p.formattedAddress as string) ?? '';
      const rating = p.rating ? String((p.rating as number).toFixed(1)) : '';
      const reviewCount = (p.userRatingCount as number) ?? 0;
      const mapsUri = (p.googleMapsUri as string) ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
      const phone = (p.internationalPhoneNumber as string) ?? undefined;
      const website = (p.websiteUri as string) ?? undefined;
      const isOpenNow = (p.regularOpeningHours as { openNow?: boolean } | undefined)?.openNow;
      const reviews = p.reviews as { text?: { text: string } }[] | undefined;
      const topReview = reviews?.[0]?.text?.text?.slice(0, 120);

      return { name, address, rating, reviewCount, uri: mapsUri, phone, website, isOpenNow, topReview };
    });
}
