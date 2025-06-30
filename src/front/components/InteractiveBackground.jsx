import React, { useRef, useEffect } from 'react';

const InteractiveBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = [
            { r: 255, g: 127, b: 80 },  // Coral
            { r: 138, g: 43, b: 226 }, // Lavender
            { r: 2, g: 132, b: 199 }    // Marine
        ];

        class Orb {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 200 + 400; // Larger orbs
                const color = colors[Math.floor(Math.random() * colors.length)];
                this.color = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.vx *= -1;
                if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) this.vy *= -1;
            }

            draw() {
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        const orbs = Array.from({ length: 4 }, () => new Orb());

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            orbs.forEach(orb => {
                orb.update();
                orb.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        }

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full -z-10 bg-dark-900"
        />
    );
};

export default InteractiveBackground;