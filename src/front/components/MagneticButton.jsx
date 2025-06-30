import React, { useRef } from 'react';
import { motion } from 'framer-motion';

const MagneticButton = ({ children, className, ...props }) => {
    const ref = useRef(null);

    const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const { width, height, left, top } = ref.current.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);
        ref.current.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    };

    const handleMouseLeave = () => {
        ref.current.style.transform = 'translate(0px, 0px)';
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={className}
            style={{ transition: 'transform 0.1s linear' }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default MagneticButton;