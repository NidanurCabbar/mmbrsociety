// Global URL blocking utility to prevent problematic URLs and provide instant base64 fallbacks

// Base64 encoded placeholder images for different event types
const DJ_PERFORMANCE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWExYTFhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwYTBhMGE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNiZykiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjUwIiBmaWxsPSIjYWQzMDJlIiBvcGFjaXR5PSIwLjgiLz4KICA8cmVjdCB4PSIxNTAiIHk9IjIyMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI0MCIgZmlsbD0iI2FkMzAyZSIgcng9IjUiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8Y2lyY2xlIGN4PSIyMzAiIGN5PSIyNDAiIHI9IjgiIGZpbGw9IiNjZWFkODEiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjMyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjY2VhZDgxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ETCBQZXJmb3JtYW5jZTwvdGV4dD4KPC9zdmc+'

const CLUB_SCENE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY2x1YmJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGEwYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWExYTFhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjY2x1YmJnKSIvPgogIDxyZWN0IHg9IjUwIiB5PSIzMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAiIGZpbGw9IiM1YTIzMjEiLz4KICA8Y2lyY2xlIGN4PSI4MCIgY3k9IjEwMCIgcj0iMyIgZmlsbD0iI2NlYWQ4MSIgb3BhY2l0eT0iMC44Ij4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMC44OzAuMzswLjgiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgPC9jaXJjbGU+CiAgPGNpcmNsZSBjeD0iMzIwIiBjeT0iMTUwIiByPSIzIiBmaWxsPSIjY2VhZDgxIiBvcGFjaXR5PSIwLjYiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjY7MC4yOzAuNiIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogIDwvY2lyY2xlPgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjYWQzMDJlIiBvcGFjaXR5PSIwLjciPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjc7MC40OzAuNyIgZHVyPSIxLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogIDwvY2lyY2xlPgogIDx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNhZDMwMmUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj5NTUJSPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMzUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNjZWFkODEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNsdWIgRXZlbnQ8L3RleHQ+Cjwvc3ZnPg=='

const TECHNO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0idGVjaG5vYmciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxYTFhMWE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzAwMDAwMDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI3RlY2hub2JnKSIvPgogIDxyZWN0IHg9IjEwMCIgeT0iMTUwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjYWExOTE2IiBvcGFjaXR5PSIwLjgiLz4KICA8cmVjdCB4PSIxNTAiIHk9IjEyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjEzMCIgZmlsbD0iI2FhMTkxNiIgb3BhY2l0eT0iMC42Ii8+CiAgPHJlY3QgeD0iMjAwIiB5PSIxMDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNhYTE5MTYiIG9wYWNpdHk9IjAuOSIvPgogIDxyZWN0IHg9IjI1MCIgeT0iMTMwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjYWExOTE2IiBvcGFjaXR5PSIwLjciLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSI4MCIgcj0iMTUiIGZpbGw9IiNjZWFkODEiIG9wYWNpdHk9IjAuOCIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMzIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiNjZWFkODEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVsZWN0cm9uaWMgTXVzaWM8L3RleHQ+Cjwvc3ZnPg=='

const HOUSE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iaG91c2ViZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwYjBiMGI7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBhMGEwYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2hvdXNlYmcpIi8+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNWEyMzIxIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuOCIvPgogIDxjaXJjbGUgY3g9IjMwMCIgY3k9IjE1MCIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjMyMSIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjYiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIzMDAiIHI9IjI1IiBmaWxsPSJub25lIiBzdHJva2U9IiM1YTIzMjEiIHN0cm9rZS13aWR0aD0iMiIgb3BhY2l0eT0iMC43Ii8+CiAgPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzVhMjMyMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPkRFRVA8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIyMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzVhMjMyMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPkhPVVNFPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMzUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNjZWFkODEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk11c2ljIEV2ZW50PC90ZXh0Pgo8L3N2Zz4='

const UNDERGROUND_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0idW5kZXJncm91bmRiZyIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNzAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzAwMDAwMDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGEwYTBhO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjdW5kZXJncm91bmRiZykiLz4KICA8bGluZSB4MT0iNTAiIHkxPSIxMDAiIHgyPSIzNTAiIHkyPSIxMDAiIHN0cm9rZT0iI2FhMTkxNiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjYiLz4KICA8bGluZSB4MT0iNTAiIHkxPSIyMDAiIHgyPSIzNTAiIHkyPSIyMDAiIHN0cm9rZT0iI2FhMTkxNiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjQiLz4KICA8bGluZSB4MT0iNTAiIHkxPSIzMDAiIHgyPSIzNTAiIHkyPSIzMDAiIHN0cm9rZT0iI2FhMTkxNiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjgiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNhYTE5MTYiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPHRleHQgeD0iMjAwIiB5PSI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjYWExOTE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+VU5ERVJHUE9VTkQ8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIzNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2NlYWQ4MSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2Vzc2lvbjwvdGV4dD4KPC9zdmc+'

// List of problematic URL patterns that should be blocked immediately
const BLOCKED_URL_PATTERNS = [
  // ⚠️ REMOVED: No longer blocking Supabase Storage URLs
  // We now use SIGNED URLs from private buckets which don't have CORS issues
  // '.supabase.co/storage/v1/object/public/make-350bb6b2-events/',
  
  // Block external image services that might fail or have CORS issues
  'images.unsplash.com/',
  'unsplash.com/',
  'pexels.com/',
  'pixabay.com/',
  
  // Block other known problematic patterns
  'google.com/imgres',
  'google.com/search',
  'bing.com/images',
  'yahoo.com/search',
  'pinterest.com/pin',
  'instagram.com/p',
  'facebook.com/photo',
  'imgurl=',
  'tbnid=',
  'tbm=isch'
];

// Base64 fallback images for different contexts
const BASE64_FALLBACKS = {
  event: DJ_PERFORMANCE_PLACEHOLDER,
  eventTechno: TECHNO_PLACEHOLDER,
  eventHouse: HOUSE_PLACEHOLDER,
  eventUnderground: UNDERGROUND_PLACEHOLDER,
  eventDj: DJ_PERFORMANCE_PLACEHOLDER,
  default: DJ_PERFORMANCE_PLACEHOLDER
};

// Check if a URL should be blocked
export function shouldBlockUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return true;
  }
  
  // Allow base64 data URLs
  if (url.startsWith('data:image/')) {
    return false;
  }
  
  // ✅ ALLOW Supabase Storage URLs (both public and signed URLs)
  if (url.includes('.supabase.co/storage/v1/') && url.includes('make-350bb6b2-events')) {
    console.log('✅ ALLOWED: Supabase Storage URL (signed or public)');
    return false;
  }
  
  // Check against blocked patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (url.includes(pattern)) {
      console.log('🚫 GLOBAL URL BLOCK:', url.substring(Math.max(0, url.lastIndexOf('/') - 20)));
      return true;
    }
  }
  
  return false;
}

// Get a safe base64 replacement URL for blocked URLs
export function getSafeImageUrl(originalUrl: string, context: string = ''): string {
  if (!shouldBlockUrl(originalUrl)) {
    return originalUrl;
  }
  
  // Choose appropriate base64 fallback based on context
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes('techno') || contextLower.includes('electronic') || contextLower.includes('minimal')) {
    return BASE64_FALLBACKS.eventTechno;
  } else if (contextLower.includes('house') || contextLower.includes('deep')) {
    return BASE64_FALLBACKS.eventHouse;
  } else if (contextLower.includes('underground')) {
    return BASE64_FALLBACKS.eventUnderground;
  } else if (contextLower.includes('dj') || contextLower.includes('performance')) {
    return BASE64_FALLBACKS.eventDj;
  } else if (contextLower.includes('event')) {
    return BASE64_FALLBACKS.event;
  }
  
  return BASE64_FALLBACKS.default;
}

// Clean an array of events, replacing blocked image URLs
export function cleanEventImageUrls(events: any[]): any[] {
  return events.map(event => {
    if (event.image && shouldBlockUrl(event.image)) {
      const filename = event.image.includes('/') 
        ? event.image.substring(event.image.lastIndexOf('/') + 1)
        : event.image.substring(0, 50);
      console.log('🛡️ REPLACING blocked URL in event:', event.title, '-', filename);
      
      return {
        ...event,
        image: getSafeImageUrl(event.image, event.title || '')
      };
    }
    return event;
  });
}

// Intercept and clean any object that might contain image URLs
export function cleanObjectImageUrls(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectImageUrls(item));
  }
  
  const cleaned = { ...obj };
  
  // Common image property names to check
  const imageProps = ['image', 'imageUrl', 'img', 'src', 'picture', 'photo'];
  
  for (const prop of imageProps) {
    if (cleaned[prop] && typeof cleaned[prop] === 'string' && shouldBlockUrl(cleaned[prop])) {
      const title = cleaned.title || cleaned.name || prop;
      console.log('🛡️ CLEANING image property:', prop, 'in object:', title);
      cleaned[prop] = getSafeImageUrl(cleaned[prop], title);
    }
  }
  
  return cleaned;
}

// Global URL interceptor - replaces blocked URLs with safe base64 alternatives
export function interceptImageLoad(url: string, context: string = ''): string {
  if (shouldBlockUrl(url)) {
    console.log('🚫 INTERCEPTED blocked image load, using base64 fallback');
    return getSafeImageUrl(url, context);
  }
  return url;
}

// Get the appropriate base64 placeholder for any event
export function getEventPlaceholder(eventTitle: string = '', eventType: string = ''): string {
  const keywords = (eventTitle + ' ' + eventType).toLowerCase();
  
  if (keywords.includes('techno') || keywords.includes('electronic') || keywords.includes('minimal')) {
    return BASE64_FALLBACKS.eventTechno;
  } else if (keywords.includes('house') || keywords.includes('deep')) {
    return BASE64_FALLBACKS.eventHouse;
  } else if (keywords.includes('underground')) {
    return BASE64_FALLBACKS.eventUnderground;
  } else if (keywords.includes('dj') || keywords.includes('performance') || keywords.includes('orhan')) {
    return BASE64_FALLBACKS.eventDj;
  }
  
  return BASE64_FALLBACKS.event;
}