/**
 * GA4 Geographic Location Adapter (v1.2).
 * Formats marketplace geographic entities into the top-level 'user_location' envelope
 * required by the GA4 Measurement Protocol, preventing location parameters from polluting
 * event-scoped payload dictionaries.
 *
 * Note: Google's Measurement Protocol UserLocation protobuf accepts 'city' and 'country_id'.
 * Internal county/region/ward are preserved in internal marketplace analytics records.
 */

export interface GA4UserLocation {
  city?: string;
  country_id: 'KE'; // ISO 3166-1 alpha-2
}

export type SupportedKenyanCity = 'Nairobi' | 'Mombasa' | 'Kisumu' | 'Nakuru' | 'Eldoret';

export interface InternalMarketplaceLocation {
  city: SupportedKenyanCity;
  county: string;
  subCounty?: string;
  ward?: string;
  deliveryZoneId?: string;
}

export class GA4LocationAdapter {
  /**
   * Translates an internal marketplace location into the top-level GA4 user_location object.
   */
  public static toGA4Location(internal: InternalMarketplaceLocation): GA4UserLocation {
    return {
      city: internal.city,
      country_id: 'KE'
    };
  }

  /**
   * Validates whether a city is within the supported Kenyan marketplace regional profile.
   */
  public static isSupportedCity(city: string): city is SupportedKenyanCity {
    return ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'].includes(city);
  }
}
