import { AddressNotFoundError, type ReaderModel } from '@maxmind/geoip2-node';
import logger from '../utils/logger.js';

class GeoService {
  private reader: ReaderModel | null = null;

  async initialize(): Promise<void> {
    try {
      const { Reader } = await import('@maxmind/geoip2-node');
      this.reader = await Reader.open('data/GeoLite2-Country.mmdb');
    } catch (error) {
      logger.error('Failed to initialize GeoService:', error);
      process.exit(1);
    }
  }

  getCountryCode(ipAddress: string | undefined): string {
    if (!this.reader) {
      throw new Error('GeoService not initialized. Call initialize() first.');
    }
    
    if (!ipAddress) {
      return 'UN' //For unknown
    }
    try {
      const response = this.reader.country(ipAddress);
      return response.country?.isoCode || 'UN';
    } catch (error) {
      if (error instanceof AddressNotFoundError)
        return 'UN';
      else
        throw error;
    }
  }
}

export default GeoService;
