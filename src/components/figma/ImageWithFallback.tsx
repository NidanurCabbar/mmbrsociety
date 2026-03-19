import React, { useState, useRef, useEffect } from 'react'
import { shouldBlockUrl, getSafeImageUrl, getEventPlaceholder } from '../../utils/urlBlocking';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [currentSrc, setCurrentSrc] = useState<string>(props.src || '');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [useDirectFallback, setUseDirectFallback] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if we should use fallback immediately using global blocking
  useEffect(() => {
    if (props.src) {
      console.log('🖼️ ImageWithFallback: Analyzing URL...');
      
      // Use the global URL blocking system
      const shouldBlock = shouldBlockUrl(props.src);
      
      if (shouldBlock) {
        // Use base64 fallback immediately for blocked URLs
        console.log('🛡️ GLOBAL BLOCK: Using base64 fallback immediately');
        setUseDirectFallback(true);
        setHasError(false);
        setIsLoading(false);
        return;
      }
      
      // For base64 data URLs, load immediately without timeout
      if (props.src.startsWith('data:image/')) {
        console.log('✅ Base64 data URL detected, loading immediately');
        setCurrentSrc(props.src);
        setHasError(false);
        setIsLoading(false);
        setUseDirectFallback(false);
        return;
      }
      
      // For Supabase Storage URLs (signed or public), NO TIMEOUT - let them load naturally
      const isSupabaseStorage = props.src.includes('supabase.co') && props.src.includes('/storage/v1/');
      if (isSupabaseStorage) {
        console.log('✅ Supabase Storage URL detected, loading without timeout');
        setCurrentSrc(props.src);
        setHasError(false);
        setIsLoading(true);
        setUseDirectFallback(false);
        // NO TIMEOUT for Supabase Storage - let it load naturally
        return;
      }

      // For local/bundled assets (paths that don't start with http/https), NO TIMEOUT
      const isLocalAsset = !props.src.startsWith('http') && !props.src.startsWith('//');
      if (isLocalAsset) {
        console.log('✅ Local asset detected, loading without timeout');
        setCurrentSrc(props.src);
        setHasError(false);
        setIsLoading(true);
        setUseDirectFallback(false);
        return;
      }

      // For any other external URLs, set a very short timeout
      console.log('⚠️ External URL detected, setting short timeout');
      setCurrentSrc(props.src);
      setHasError(false);
      setIsLoading(true);
      setUseDirectFallback(false);
      
      // Very short timeout for external URLs - if they don't load fast, use fallback
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ External URL timeout, switching to base64 fallback');
        setUseDirectFallback(true);
        setIsLoading(false);
        setHasError(false);
      }, 800); // 800ms timeout for external URLs
      
    } else {
      // No src provided, use fallback
      console.log('📝 No src provided, using base64 fallback');
      setUseDirectFallback(true);
      setIsLoading(false);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [props.src, props.alt]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('✅ Image loaded successfully');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsLoading(false);
    setHasError(false);
    
    // Call external onLoad handler
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('🔄 Image error, switching to base64 fallback');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Call external onError handler
    if (props.onError) {
      props.onError(e);
    }
    
    // Switch to fallback immediately on error
    setUseDirectFallback(true);
    setIsLoading(false);
    setHasError(true);
  };

  const { src, alt, style, className, onLoad, onError, ...rest } = props;

  // Use base64 fallback if needed
  if (useDirectFallback) {
    const placeholderSrc = getEventPlaceholder(alt || '', src || '');
    
    console.log('🎨 Rendering base64 placeholder for:', alt || 'Unknown');
    
    return (
      <img 
        src={placeholderSrc} 
        alt={alt || 'Event Image'} 
        className={className} 
        style={style} 
        {...rest}
        onLoad={(e) => {
          console.log('✅ Base64 placeholder loaded instantly');
          if (props.onLoad) {
            props.onLoad(e);
          }
        }}
        onError={(e) => {
          console.error('🚨 Base64 placeholder failed to load - this should not happen');
          if (props.onError) {
            props.onError(e);
          }
        }}
      />
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-gray-800 flex items-center justify-center ${className ?? ''}`}
          style={style}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <div className="text-xs text-gray-400">Yükleniyor...</div>
          </div>
        </div>
      )}
      <img 
        ref={imgRef}
        src={currentSrc} 
        alt={alt} 
        className={className} 
        style={{
          ...style,
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }} 
        {...rest} 
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}