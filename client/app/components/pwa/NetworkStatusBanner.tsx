"use client";

import React, { useEffect, useState } from "react";
import { usePWA } from "../../context/pwa-provider";
import { useLanguage } from "../../context/language-provider";
import { MdWifiOff, MdWifi } from "react-icons/md";

const NetworkStatusBanner = () => {
  const { isOnline } = usePWA();
  const { language } = useLanguage();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (isOnline && wasOffline) {
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 transition-all duration-300 ${
        !isOnline
          ? "bg-red-500 text-white"
          : "bg-green-500 text-white"
      }`}
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '0.5rem 1rem',
        borderRadius: '9999px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: !isOnline ? '#ef4444' : '#22c55e',
        color: 'white',
        fontWeight: '500',
        fontSize: '0.875rem'
      }}
    >
      {!isOnline ? <MdWifiOff size={20} /> : <MdWifi size={20} />}
      <span>
        {!isOnline
          ? language === "vi"
            ? "Bạn đang ngoại tuyến. Ứng dụng có thể hiển thị dữ liệu cũ."
            : "You are offline. App may show cached data."
          : language === "vi"
          ? "Đã khôi phục kết nối mạng."
          : "Back online."}
      </span>
    </div>
  );
};

export default NetworkStatusBanner;
