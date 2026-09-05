import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isNative: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
}

const getDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }
  return {
    width: window.innerWidth || (document?.documentElement?.clientWidth) || 390,
    height: window.innerHeight || (document?.documentElement?.clientHeight) || 844,
  };
};

export const useDeviceType = (): DeviceInfo => {
  const [windowSize, setWindowSize] = useState(getDimensions);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getDimensions());
    };

    // Update dimensions immediately on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isNative = Capacitor.isNativePlatform();
  const width = windowSize.width;
  const height = windowSize.height;
  const isLandscape = width > height;

  // On phones in portrait, width is typically 360-430px.
  // Standard responsive breakpoint:
  // Phone: width < 768px
  // Tablet: width >= 768px && width < 1100px
  // Desktop: width >= 1100px
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;

  const deviceType: DeviceType = isPhone ? 'phone' : (isTablet ? 'tablet' : 'desktop');

  return {
    deviceType,
    isPhone,
    isTablet,
    isDesktop,
    isNative,
    width,
    height,
    isLandscape,
  };
};
