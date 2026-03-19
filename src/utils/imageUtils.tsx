import { getEventPlaceholder } from './urlBlocking';

export const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Base64 data URLs are always valid
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // For now, be very permissive but the global blocking system will handle problematic URLs
  return true;
};

export const getEventFallbackImage = async (eventTitle: string): Promise<string> => {
  // Use base64 placeholder instead of external URLs
  return getEventPlaceholder(eventTitle);
};

export const validateAndFixImageUrl = async (url: string, eventTitle: string = ''): Promise<string> => {
  if (!url) {
    return getEventPlaceholder(eventTitle);
  }
  
  // For base64 data URLs, return as-is (they're always valid)
  if (url.startsWith('data:image/')) {
    return url;
  }
  
  // For any other URLs, return base64 placeholder to avoid external dependencies
  console.log('🔄 Replacing external URL with base64 placeholder for:', eventTitle);
  return getEventPlaceholder(eventTitle);
};

// This function is no longer used but kept for compatibility
const testImageLoading = (imageUrl: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 1000); // Very short timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      reject(e);
    };
    
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  });
};