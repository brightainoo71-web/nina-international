// ==========================================================
// Nina International Mobile API Configuration
// Mobile devices cannot reach 'localhost' of host machine.
// Use your machine's LAN IP or a deployed HTTPS URL.
// ==========================================================

export const DEFAULT_API_URL = 'https://industrial-graphic-christmas-each.trycloudflare.com/api';

class ApiConfigManager {
  private currentUrl = DEFAULT_API_URL;

  public getBaseUrl(): string {
    return this.currentUrl;
  }

  public setBaseUrl(url: string) {
    this.currentUrl = url.trim().replace(/\/$/, '');
  }
}

export const ApiConfig = new ApiConfigManager();
