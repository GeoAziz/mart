"use client";

import React, { useEffect, useRef } from 'react';

const NUM_PARTICLES = 60;
const COLORS = ['#00f0ff', '#ff00e6', '#ffffff', '#00ffb3'];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}


const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particles = useRef<any[]>([]);

  useEffect(() => {
    // Only run on client
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Initialize particles on mount (client only)
    particles.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: randomBetween(0, width),
      y: randomBetween(0, height),
      r: randomBetween(0.7, 2.2),
      dx: randomBetween(-0.15, 0.15),
      dy: randomBetween(-0.1, 0.1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: randomBetween(0.3, 0.8),
    }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = width;
    let h = height;
    canvas.width = w;
    canvas.height = h;

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', handleResize);

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
        // Move
        p.x += p.dx;
        p.y += p.dy;
        // Wrap
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }
      animationRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-bg pointer-events-none fixed inset-0 z-0"
      style={{ width: '100vw', height: '100vh' }}
      aria-hidden="true"
    />
  );
};

export default ParticleBackground;
