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

export const useDeviceType = (): DeviceInfo => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

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

  // Tablet detection on Android & iOS:
  // Usually min dimension >= 600px and max dimension >= 960px
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);

  const isTabletByDimensions = minDimension >= 600 && maxDimension >= 900;

  let deviceType: DeviceType = 'desktop';

  if (isNative) {
    if (isTabletByDimensions) {
      deviceType = 'tablet';
    } else {
      deviceType = 'phone';
    }
  } else {
    if (width < 768) {
      deviceType = 'phone';
    } else if (width >= 768 && width < 1100) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }
  }

  return {
    deviceType,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isNative,
    width,
    height,
    isLandscape,
  };
};
