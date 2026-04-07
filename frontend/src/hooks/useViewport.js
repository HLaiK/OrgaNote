import { useEffect, useState } from "react";

function getViewportWidth() {
  if (typeof window === "undefined") {
    return 1440;
  }

  return window.innerWidth;
}

function getViewportHeight() {
  if (typeof window === "undefined") {
    return 900;
  }

  return window.innerHeight;
}

export default function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    width: getViewportWidth(),
    height: getViewportHeight(),
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: getViewportWidth(),
        height: getViewportHeight(),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { width, height } = viewport;

  const isPhone = width < 768;
  const isTablet = width < 1024;
  const isCompact = width < 1200;
  const isLandscape = width > height;
  const isTabletLandscape =
    isLandscape && width >= 900 && width <= 1366 && height <= 1024;

  return {
    width,
    height,
    isPhone,
    isTablet,
    isCompact,
    isLandscape,
    isTabletLandscape,
  };
}
