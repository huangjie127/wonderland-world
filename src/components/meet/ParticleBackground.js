"use client";
import { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // Cycle configuration
    const CYCLE_DURATION = 900; // Frames (~15 seconds)
    let frameCount = 0;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize particles
    const createParticles = () => {
      particles = [];
      const count = Math.min(window.innerWidth / 3, 300); // Responsive count
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          originX: Math.random() * canvas.width,
          originY: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          // Void colors: White, Grey, faint Blue
          color: `rgba(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${220 + Math.random() * 35}, ${Math.random() * 0.4 + 0.1})`,
          speed: Math.random() * 0.02 + 0.01,
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * 150 + 50, // For gathering radius
          offset: Math.random() * 100,
        });
      }
    };
    
    createParticles();

    const render = () => {
      // Fade effect for trails - Dark Void Background
      ctx.fillStyle = 'rgba(10, 11, 16, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      frameCount = (frameCount + 1) % CYCLE_DURATION;
      
      // Phases:
      // 0-400: Formation (Gathering)
      // 400-600: Stability (Pulsing)
      // 600-900: Collapse (Dispersing)
      
      particles.forEach(p => {
        if (frameCount < 400) {
          // Formation: Spiral towards center
          const progress = frameCount / 400;
          const currentRadius = p.radius + (1 - progress) * 500; // Start far, end at radius
          const currentAngle = p.angle + progress * 2;
          
          const targetX = centerX + Math.cos(currentAngle) * currentRadius;
          const targetY = centerY + Math.sin(currentAngle) * currentRadius;
          
          p.x += (targetX - p.x) * 0.05;
          p.y += (targetY - p.y) * 0.05;
          
        } else if (frameCount < 600) {
          // Stability: Gentle float / Pulse
          const pulse = Math.sin((frameCount - 400) * 0.05) * 10;
          const orbitAngle = p.angle + (frameCount - 400) * 0.005;
          
          const targetX = centerX + Math.cos(orbitAngle) * (p.radius + pulse + p.offset * 0.1);
          const targetY = centerY + Math.sin(orbitAngle) * (p.radius + pulse + p.offset * 0.1);
          
          p.x += (targetX - p.x) * 0.1;
          p.y += (targetY - p.y) * 0.1;
          
        } else {
          // Collapse: Disperse outwards like dust
          const progress = (frameCount - 600) / 300;
          // Move towards original random position (chaos)
          const destX = p.originX + (Math.random() - 0.5) * 20;
          const destY = p.originY + (Math.random() - 0.5) * 20;
          
          // Accelerate out
          p.x += (destX - p.x) * 0.02 * (1 + progress * 2);
          p.y += (destY - p.y) * 0.02 * (1 + progress * 2);
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Glow effect
        if (Math.random() > 0.9) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        } else {
            ctx.shadowBlur = 0;
        }
      });
      
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" />;
};

export default ParticleBackground;
