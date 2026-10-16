
"use client";

import * as React from "react";

export interface HalftonePalette {
  background: string;
  ink: string;
  warm: string;
}

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface HalftoneWordmarkFooterProps {
  wordmark?: string;
  label?: string;
  meta?: string;
  columns?: FooterColumn[];
  backToTop?: boolean;
  preset?: "night" | "paper" | "ember" | "cobalt";
  palette?: Partial<HalftonePalette>;
  dotGap?: number;
  radius?: number;
  crop?: number;
  grain?: number;
  interactive?: boolean;
  fontFamily?: string;
  fontWeight?: number;
  monoFamily?: string;
  height?: string;
  className?: string;
}

const PRESETS: Record<string, HalftonePalette> = {
  night: { background: "#161616", ink: "#f6f3ed", warm: "#f5b9d3" },
  paper: { background: "#efebe3", ink: "#17150f", warm: "#c2361c" },
  ember: { background: "#160a06", ink: "#f2c48c", warm: "#ff5a1f" },
  cobalt: { background: "#0d1b4d", ink: "#dfe7ff", warm: "#ffcd3c" },
};

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Find Opportunities", href: "#find" },
      { label: "How It Works", href: "#how-it-works" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Mission", href: "#about" },
      { label: "Privacy", href: "#privacy" },
    ],
  },
  {
    title: "Take Action",
    links: [
      { label: "Get Started", href: "#find" },
      { label: "Accessibility", href: "#accessibility" },
    ],
  },
];

const SANS =
  'Inter, "Helvetica Neue", Arial, system-ui, sans-serif';
const MONO =
  '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value.split("").map((char) => char + char).join("")
      : value;
  const number = parseInt(full, 16);

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return [246, 243, 237];
  }

  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export default function HalftoneWordmarkFooter({
  wordmark = "impact agent",
  label = "Impact Agent",
  meta = "AI FOR REAL-WORLD IMPACT",
  columns = DEFAULT_COLUMNS,
  backToTop = true,
  preset = "night",
  palette,
  dotGap = 6,
  radius = 80,
  crop = 0.2,
  grain = 0.35,
  interactive = true,
  fontFamily = SANS,
  fontWeight = 800,
  monoFamily = MONO,
  height = "440px",
  className = "",
}: HalftoneWordmarkFooterProps) {
  const rootRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const colors = {
    ...(PRESETS[preset] ?? PRESETS.night),
    ...palette,
  };

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!root || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 1;
    let heightPx = 1;
    let dpr = 1;
    let pointerX = -10000;
    let pointerY = -10000;
    let animationFrame = 0;
    let shock: { x: number; y: number; time: number } | null = null;

    type Dot = {
      homeX: number;
      homeY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    };

    let dots: Dot[] = [];
    let active = true;

    const ink = hexToRgb(colors.ink);
    const warm = hexToRgb(colors.warm);

    function layout() {
      const rect = root!.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      heightPx = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(heightPx * dpr);

      const mask = document.createElement("canvas");
      mask.width = width;
      mask.height = heightPx;

      const maskCtx = mask.getContext("2d", {
        willReadFrequently: true,
      });

      if (!maskCtx) return;

      const gap = Math.max(3, dotGap);
      const measureWord = wordmark || "impact agent";

      maskCtx.font = `${fontWeight} 100px ${fontFamily}`;
      const measured = maskCtx.measureText(measureWord).width;
      const fontSize = measured > 0 ? (width * 1.02 * 100) / measured : 80;

      maskCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      maskCtx.fillStyle = "#fff";
      maskCtx.textBaseline = "alphabetic";

      const metrics = maskCtx.measureText(measureWord);
      const baseline =
        heightPx +
        (metrics.actualBoundingBoxAscent || fontSize * 0.72) *
          Math.max(0, Math.min(0.6, crop));

      maskCtx.fillText(
        measureWord,
        (width - metrics.width) / 2,
        baseline
      );

      const pixels = maskCtx.getImageData(
        0,
        0,
        width,
        heightPx
      ).data;

      dots = [];

      for (let y = gap / 2; y < heightPx; y += gap) {
        for (let x = gap / 2; x < width; x += gap) {
          let coverage = 0;
          let samples = 0;

          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const px = Math.min(
                width - 1,
                Math.floor(x + ((sx - 1) * gap) / 3)
              );
              const py = Math.min(
                heightPx - 1,
                Math.floor(y + ((sy - 1) * gap) / 3)
              );

              coverage += pixels[(py * width + px) * 4 + 3] / 255;
              samples++;
            }
          }

          coverage /= samples;

          if (coverage < 0.06) continue;

          dots.push({
            homeX: x,
            homeY: y,
            x,
            y,
            vx: 0,
            vy: 0,
            size: Math.sqrt(coverage) * gap * 0.56,
          });
        }
      }

      draw();
    }

    function draw() {
      if (!ctx || !canvas) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, heightPx);

      const now = performance.now();

      for (const dot of dots) {
        if (interactive && !reduceMotion) {
          const dx = dot.x - pointerX;
          const dy = dot.y - pointerY;
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.001;

          if (distance < radius) {
            const force = (1 - distance / radius) * 2.8;
            dot.vx += (dx / distance) * force;
            dot.vy += (dy / distance) * force;
          }

          if (shock && now - shock.time < 850) {
            const sx = dot.homeX - shock.x;
            const sy = dot.homeY - shock.y;
            const distanceFromShock =
              Math.sqrt(sx * sx + sy * sy) + 0.001;
            const ringRadius = (now - shock.time) * 0.8;
            const band = Math.max(
              0,
              1 - Math.abs(distanceFromShock - ringRadius) / 24
            );

            if (band > 0) {
              dot.vx += (sx / distanceFromShock) * band * 2;
              dot.vy += (sy / distanceFromShock) * band * 2;
            }
          }

          dot.vx = (dot.vx + (dot.homeX - dot.x) * 0.05) * 0.84;
          dot.vy = (dot.vy + (dot.homeY - dot.y) * 0.05) * 0.84;
          dot.x += dot.vx;
          dot.y += dot.vy;

          if (
            Math.abs(dot.homeX - dot.x) < 0.1 &&
            Math.abs(dot.homeY - dot.y) < 0.1
          ) {
            dot.x = dot.homeX;
            dot.y = dot.homeY;
            dot.vx = 0;
            dot.vy = 0;
          }
        }

        const distance = Math.hypot(
          dot.x - dot.homeX,
          dot.y - dot.homeY
        );
        const amount = Math.min(1, distance / 28);

        const r = Math.round(ink[0] + (warm[0] - ink[0]) * amount);
        const g = Math.round(ink[1] + (warm[1] - ink[1]) * amount);
        const b = Math.round(ink[2] + (warm[2] - ink[2]) * amount);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (grain > 0) {
        ctx.globalAlpha = Math.min(1, grain) * 0.035;

        for (let i = 0; i < 180; i++) {
          const x = Math.random() * width;
          const y = Math.random() * heightPx;
          ctx.fillStyle = i % 2 ? "#fff" : "#000";
          ctx.fillRect(x, y, 1, 1);
        }

        ctx.globalAlpha = 1;
      }
    }

    function animate() {
      if (!active) return;

      draw();

      const moving =
        dots.some(
          (dot) =>
            Math.abs(dot.vx) + Math.abs(dot.vy) > 0.02 ||
            Math.abs(dot.homeX - dot.x) +
              Math.abs(dot.homeY - dot.y) >
              0.05
        ) ||
        (shock !== null && performance.now() - shock.time < 850);

      if (moving) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        animationFrame = 0;
      }
    }

    function wake() {
      if (reduceMotion || animationFrame) return;
      animationFrame = requestAnimationFrame(animate);
    }

    function onPointerMove(event: PointerEvent) {
      if (!interactive) return;
      const rect = canvas!.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      wake();
    }

    function onPointerLeave() {
      pointerX = -10000;
      pointerY = -10000;
      wake();
    }

    function onPointerDown(event: PointerEvent) {
      if (!interactive || reduceMotion) return;

      const target = event.target as HTMLElement;
      if (target.closest("a, button")) return;

      const rect = canvas!.getBoundingClientRect();
      shock = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        time: performance.now(),
      };

      wake();
    }

    const resizeObserver = new ResizeObserver(() => {
      layout();
    });

    layout();
    resizeObserver.observe(root);

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown);

    document.fonts?.ready.then(() => {
      if (active) layout();
    });

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
    };
  }, [
    wordmark,
    dotGap,
    radius,
    crop,
    grain,
    interactive,
    fontFamily,
    fontWeight,
    colors.background,
    colors.ink,
    colors.warm,
  ]);

  return (
    <footer
      ref={rootRef}
      className={`hwf-root ${className}`}
      style={
        {
          height,
          background: colors.background,
          color: colors.ink,
          "--hwf-mono": monoFamily,
        } as React.CSSProperties
      }
    >
      <style>{`
        .hwf-root {
          position: relative;
          width: 100%;
          overflow: hidden;
          isolation: isolate;
          -webkit-font-smoothing: antialiased;
        }
        .hwf-root canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: auto;
        }
        .hwf-top {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.25fr repeat(3, 1fr);
          gap: 24px;
          padding: clamp(22px, 3.4vw, 40px) clamp(20px, 3.4vw, 44px) 0;
          font-family: var(--hwf-mono);
          font-size: 10px;
          letter-spacing: .14em;
          text-transform: uppercase;
          line-height: 1.9;
        }
        .hwf-brand strong, .hwf-brand span { display: block; }
        .hwf-brand strong { font-weight: 600; }
        .hwf-brand span { opacity: .55; }
        .hwf-col h3 {
          margin: 0;
          font: inherit;
          opacity: .5;
          font-weight: 500;
        }
        .hwf-col ul { list-style: none; margin: 0; padding: 0; }
        .hwf-col a, .hwf-up {
          color: inherit;
          text-decoration: none;
          opacity: .75;
          background: none;
          border: 0;
          padding: 0;
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          cursor: pointer;
        }
        .hwf-col a:hover, .hwf-up:hover { opacity: 1; }
        .hwf-col a:focus-visible, .hwf-up:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 4px;
        }
        .hwf-rule {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: flex-end;
          margin: 26px clamp(20px, 3.4vw, 44px) 0;
          padding-top: 12px;
          border-top: 1px solid rgb(246 243 237 / 20%);
          font-family: var(--hwf-mono);
          font-size: 10px;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .hwf-up { cursor: pointer; }
        .hwf-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
        @media (max-width: 720px) {
          .hwf-top {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 18px;
          }
          .hwf-brand { grid-column: 1 / -1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hwf-col a, .hwf-up { transition: none; }
        }
      `}</style>

      <canvas ref={canvasRef} aria-hidden="true" />

      <span className="hwf-sr">{wordmark}</span>

      <div className="hwf-top">
        <div className="hwf-brand">
          <strong>{label}</strong>
          <span>{meta}</span>
        </div>

        {columns.map((column) => (
          <nav className="hwf-col" key={column.title} aria-label={column.title}>
            <h3>{column.title}</h3>
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href || "#"}
                    onClick={(event) => {
                      if (!link.href || link.href === "#") {
                        event.preventDefault();
                      }
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="hwf-rule">
        {backToTop && (
          <button
            type="button"
            className="hwf-up"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            Back to top ↑
          </button>
        )}
      </div>
    </footer>
  );
}
