import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";
import { WifiOff } from "lucide-react";

export const NetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial Network Check
    Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    }).catch(() => {
      // Fallback for web browser
      setIsOffline(!navigator.onLine);
    });

    // Listen for network changes
    let networkHandler = null;
    Network.addListener("networkStatusChange", (status) => {
      setIsOffline(!status.connected);
    }).then(h => { networkHandler = h; });

    // Handle Browser online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Hardware Back Button handling for Android Native
    let backHandler = null;
    App.addListener("backButton", (event) => {
      if (!event.canGoBack || window.location.pathname === "/" || window.location.pathname === "/login") {
        App.minimizeApp();
      } else {
        window.history.back();
      }
    }).then(h => { backHandler = h; });

    return () => {
      if (networkHandler && networkHandler.remove) networkHandler.remove();
      if (backHandler && backHandler.remove) backHandler.remove();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg">
      <WifiOff size={16} />
      <span>No Internet Connection. Please check your Wi-Fi or Mobile Data.</span>
    </div>
  );
};
