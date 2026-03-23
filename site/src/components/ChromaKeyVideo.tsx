import { useEffect, useRef, useState } from 'react';

interface ChromaKeyVideoProps {
  /** Path to the video file with chroma key background */
  src: string;
  /** Chroma key color as [R, G, B] (0-255). Default: [190, 15, 131] (#BE0F83) */
  chromaColor?: [number, number, number];
  /** Color distance threshold (0-1). Higher = more aggressive keying. Default: 0.32 */
  threshold?: number;
  /** Smoothing range for edge softness (0-1). Default: 0.08 */
  smoothing?: number;
  /** Trigger mode: 'scroll' starts playback on scroll into view, 'auto' plays on load. Default: 'scroll' */
  trigger?: 'scroll' | 'auto';
  /** Whether to loop the video. Default: true */
  loop?: boolean;
  /** CSS class for the container */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /**
   * Static fallback image path for prefers-reduced-motion.
   * If omitted, the component attempts src with .mp4/.webm replaced by .png —
   * provide this explicitly when the file name does not follow that pattern.
   */
  staticFallbackSrc?: string;
}

/**
 * Squared Euclidean color distance in [0, 1] space.
 *
 * We work with squared distance throughout (no Math.sqrt) and square the
 * thresholds once at the call site, eliminating sqrt from the inner loop.
 * A squared distance of 1.0 corresponds to opposite corners of the RGB cube.
 */
function colorDistanceSq(
  r: number, g: number, b: number,
  cr: number, cg: number, cb: number,
): number {
  const dr = (r - cr) / 255;
  const dg = (g - cg) / 255;
  const db = (b - cb) / 255;
  return dr * dr + dg * dg + db * db;
}

export default function ChromaKeyVideo({
  src,
  chromaColor = [190, 15, 131],
  threshold = 0.32,
  smoothing = 0.08,
  trigger = 'scroll',
  loop = true,
  className,
  alt = 'Animated illustration',
  staticFallbackSrc,
}: ChromaKeyVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  // Track the video timestamp we last processed to avoid re-keying identical frames
  const lastVideoTimeRef = useRef<number>(-1);
  // Stable ref for the click-handler so we can remove it on cleanup
  const clickHandlerRef = useRef<(() => void) | null>(null);

  const [isVisible, setIsVisible] = useState(trigger === 'auto');
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  // Intersection Observer for scroll trigger
  useEffect(() => {
    if (trigger !== 'scroll' || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [trigger, reducedMotion]);

  // Video playback + chroma key render loop
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isVisible || reducedMotion) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Destructure once so the effect deps array tracks primitives, not array identity.
    // This prevents a new inline chromaColor={[...]} prop from restarting the loop
    // on every parent render.
    const [cr, cg, cb] = chromaColor;

    // Pre-square the thresholds so the inner loop skips Math.sqrt entirely.
    const threshSq = threshold * threshold;
    const outerSq = (threshold + smoothing) * (threshold + smoothing);
    const smoothingRange = outerSq - threshSq; // used for alpha interpolation

    function processFrame() {
      if (!video || !canvas || !ctx) return;

      // Stop the loop when the tab is hidden — no point burning CPU.
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Video ended and we are not looping: stop the loop.
      if (video.ended && !loop) return;

      // Skip re-processing when the video hasn't advanced to a new frame.
      // The native `loop` attribute handles the actual looping; we just need
      // to not call getImageData at 60fps for a 24fps video.
      if (video.currentTime === lastVideoTimeRef.current) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastVideoTimeRef.current = video.currentTime;

      // Sync canvas dimensions to video on first decoded frame (and if it ever changes).
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0);

      // Guard against a zero-size canvas (video not yet decoded).
      if (canvas.width === 0 || canvas.height === 0) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;

      for (let i = 0; i < data.length; i += 4) {
        const distSq = colorDistanceSq(data[i], data[i + 1], data[i + 2], cr, cg, cb);

        if (distSq < threshSq) {
          // Fully within chroma range — transparent.
          data[i + 3] = 0;
        } else if (distSq < outerSq) {
          // Soft edge — gradual alpha falloff without sqrt.
          // alpha goes 0→1 as distSq goes threshSq→outerSq.
          const alpha = (distSq - threshSq) / smoothingRange;
          data[i + 3] = Math.round(alpha * 255);
        }
        // else: pixel is well outside chroma range, leave alpha untouched.
      }

      ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(processFrame);
    }

    function startLoop() {
      lastVideoTimeRef.current = -1;
      rafRef.current = requestAnimationFrame(processFrame);
    }

    video.play().then(startLoop).catch(() => {
      // Autoplay blocked (e.g. iOS Safari without prior user interaction).
      // Attach a click handler to the canvas so the user can tap to start.
      // Note: if the parent sets pointer-events:none on this element, the
      // click will never fire — callers should ensure the canvas is interactive
      // in that case (e.g. use a play button overlay instead).
      const handleClick = () => {
        video.play().then(startLoop).catch(() => {
          // Second failure — likely a permissions policy; give up silently.
        });
        canvas.removeEventListener('click', handleClick);
        canvas.style.cursor = '';
        clickHandlerRef.current = null;
      };
      clickHandlerRef.current = handleClick;
      canvas.style.cursor = 'pointer';
      canvas.addEventListener('click', handleClick);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.pause();
      // Clean up the autoplay-fallback click handler if it was never fired.
      if (clickHandlerRef.current) {
        canvas.removeEventListener('click', clickHandlerRef.current);
        canvas.style.cursor = '';
        clickHandlerRef.current = null;
      }
    };
    // chromaColor intentionally excluded from deps — we destructure above so
    // the effect doesn't restart when the caller passes an inline array literal.
    // threshold and smoothing are primitive numbers and are safe to include.
  }, [isVisible, threshold, smoothing, loop, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reduced motion: show static fallback image.
  // Prefer the explicit staticFallbackSrc; otherwise attempt a simple extension
  // swap — callers should pass staticFallbackSrc when the file name doesn't
  // match the video name exactly.
  if (reducedMotion) {
    const fallbackSrc =
      staticFallbackSrc ?? src.replace(/\.(mp4|webm)$/i, '.png');
    return (
      <div className={className} role="img" aria-label={alt}>
        <img
          src={fallbackSrc}
          alt={alt}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%' }}
    >
      {/*
        Hidden video element — decoded frames are drawn to the canvas.
        Use visibility:hidden + small absolute dimensions rather than width:0/height:0.
        Setting dimensions to 0 can prevent some browsers from allocating a full
        decode surface, leading to blank frames on getImageData.
      */}
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        loop={loop}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* Visible canvas with transparent background */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
}
