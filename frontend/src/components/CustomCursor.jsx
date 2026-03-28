import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState({ x: -100, y: -100 });

  useEffect(() => {
    let timeoutId = 0;
    const handleMove = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setTrail({ x: event.clientX, y: event.clientY }), 30);
    };

    window.addEventListener("pointermove", handleMove);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  return (
    <>
      <Motion.div
        className="cursor-trail"
        animate={{ x: trail.x - 6, y: trail.y - 6 }}
        transition={{ type: "spring", stiffness: 160, damping: 20, mass: 0.3 }}
      />
      <Motion.div
        className="custom-cursor"
        animate={{ x: position.x - 16, y: position.y - 16 }}
        transition={{ type: "spring", stiffness: 500, damping: 32, mass: 0.2 }}
      >
        <span className="cursor-crosshair">
          <span className="cursor-center" />
        </span>
      </Motion.div>
    </>
  );
}
