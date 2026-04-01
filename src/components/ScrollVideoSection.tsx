/**
 * ScrollVideoSection — Canvas + JPEG frame dizisi yaklaşımı
 *
 * Neden Canvas?
 *   video.currentTime ile H.264 seeking → tarayıcı keyframe'den
 *   başlayarak ara frame'leri decode eder → donma/stutter.
 *
 *   Canvas + pre-loaded JPEG frames → her frame RAM'de hazır,
 *   drawImage() GPU-hızlandırmalı → seeking yok, donma yok.
 *   Apple MacBook scroll animasyonları ve anime.js bu tekniği kullanır.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollVideoSectionProps {
  /** /public/frames/frame_0001.jpg formatındaki frame dizisinin kök yolu */
  framesPath: string;
  /** Toplam frame sayısı */
  frameCount: number;
  /** Video %100'e ulaşana kadar gereken scroll mesafesi (px) */
  scrollHeight?: number;
  /** Animasyonda atlanacak ilk frame sayısı (kapalı kapı frame'lerini kısaltır) */
  skipInitialFrames?: number;
}

export default function ScrollVideoSection({
  framesPath,
  frameCount,
  scrollHeight = 5400,
  skipInitialFrames = 0,
}: ScrollVideoSectionProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number | null>(null);
  const imagesRef  = useRef<HTMLImageElement[]>([]);
  const sizeRef    = useRef({ w: 0, h: 0 });

  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady]         = useState(false);

  /* ── Canvas boyutunu ekrana uydur ── */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
      sizeRef.current = { w, h };
    }
  }, []);

  /* ── İlgili frame'i Canvas'a çiz (object-contain mantığı) ── */
  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    const img    = imagesRef.current[idx];
    if (!canvas || !img?.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w: cw, h: ch } = sizeRef.current;
    if (!cw || !ch) return;

    /* object-contain: görüntü kırpılmaz, siyah bantlarla ortalanır */
    const scale  = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const drawW  = img.naturalWidth  * scale;
    const drawH  = img.naturalHeight * scale;
    const drawX  = (cw - drawW) / 2;
    const drawY  = (ch - drawH) / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  /* ── Frame'leri önceden yükle ── */
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const num = String(i).padStart(4, '0');
      img.src = `${framesPath}/frame_${num}.jpg`;

      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);

        /* İlk frame hazır olunca hemen göster */
        if (loaded === 1) {
          resizeCanvas();
          drawFrame(0);
        }

        if (loaded === frameCount) {
          setIsReady(true);
        }
      };

      images.push(img);
    }

    imagesRef.current = images;
  }, [frameCount, framesPath, drawFrame, resizeCanvas]);

  /* ── Resize dinleyicisi ── */
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  /* ── Scroll → frame ── */
  useEffect(() => {
    if (!isReady) return;

    const overlay = overlayRef.current;

    const update = () => {
      const sy       = window.scrollY;
      const progress = Math.min(sy / scrollHeight, 1);

      /* Hangi frame gösterilmeli (skipInitialFrames kadar atla) */
      const effectiveCount = frameCount - skipInitialFrames;
      const idx = Math.min(
        skipInitialFrames + Math.floor(progress * effectiveCount),
        frameCount - 1
      );
      drawFrame(idx);

      /* Overlay opaklığı: hero section alttan girerken yavaş solar */
      if (overlay) {
        const fadeStart = Math.max(0, scrollHeight - window.innerHeight);
        const opacity =
          sy <= fadeStart   ? 1
          : sy >= scrollHeight ? 0
          : (scrollHeight - sy) / (scrollHeight - fadeStart);

        overlay.style.opacity       = String(Math.max(0, opacity));
        overlay.style.pointerEvents = opacity <= 0 ? 'none' : 'auto';
      }
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, scrollHeight, frameCount, drawFrame]);

  const loadingPct = frameCount > 0 ? Math.round((loadedCount / frameCount) * 100) : 0;

  return (
    <>
      {/* Fixed overlay — Navbar (z-50) altında kalır */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black"
        style={{ zIndex: 30 }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Yükleniyor */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-40 h-px bg-white/10 overflow-hidden">
              <div
                className="h-full bg-white/50 transition-all duration-75"
                style={{ width: `${loadingPct}%` }}
              />
            </div>
            <span className="text-white/30 text-[10px] tracking-[0.35em] uppercase">
              {loadingPct}%
            </span>
          </div>
        )}

        {/* Scroll ipucu */}
        {isReady && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 pointer-events-none select-none">
            <span className="text-[10px] tracking-widest uppercase">Scroll</span>
            <svg
              className="w-4 h-4 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Spacer — sonraki içeriği scrollHeight kadar aşağı iter */}
      <div style={{ height: scrollHeight }} aria-hidden="true" />
    </>
  );
}
