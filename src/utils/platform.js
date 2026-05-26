import { Capacitor } from '@capacitor/core';

/**
 * Checks if the app is running on a native platform (iOS/Android) 
 * via Capacitor, as opposed to running in a web browser.
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Checks if the app is specifically running on Android natively.
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Checks if the app is specifically running on iOS natively.
 */
export const isIOS = () => Capacitor.getPlatform() === 'ios';

/**
 * Checks if the app is running as a standard web application in a browser.
 */
export const isWeb = () => Capacitor.getPlatform() === 'web';

/**
 * Gets the current platform name ('web', 'ios', or 'android').
 */
export const getPlatformName = () => Capacitor.getPlatform();
