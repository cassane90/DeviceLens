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
  _radiusMeters = 8000,
  deviceName = ""
): Promise<PlaceResult[]> {
  try {
    const response = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        deviceName,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.places) ? data.places : [];
  } catch {
    return [];
  }
}
