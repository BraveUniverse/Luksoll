"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useLSP3Profile from '@/hooks/useLSP3Profile';
import { UPClientProvider } from '@lukso/up-provider';
import { ProfileData } from '@/types';
import Link from 'next/link';

interface ProfileCardProps {
  profile: ProfileData | null;
  address: string | null;
  provider: UPClientProvider | null;
  onDisconnect: () => void;
  stats: {
    points: number;
    votedPolls: number;
    createdPolls: number;
  };
  loadingStats: boolean;
  showStatus?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ 
  profile, 
  address, 
  provider,
  onDisconnect, 
  stats,
  loadingStats,
  showStatus = true 
}) => {
  const { 
    profileImageUrl,
    displayName
  } = useLSP3Profile(address, provider);
  
  const [imgError, setImgError] = useState(false);

  // Resim yükleme hatası
  const handleImageError = () => {
    console.log('ProfileCard: Resim yükleme hatası, varsayılan avatar kullanılıyor');
    setImgError(true);
  };

  // Gerçek profil resmi URL'si
  const imageToShow = imgError ? '/default-avatar.png' : (profileImageUrl || '/default-avatar.png');

  return (
    <motion.div 
      className="card flex items-center p-4 w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-primary-300">
        {loadingStats ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="animate-spin w-8 h-8 border-4 border-primary-300 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <img 
            src={imageToShow} 
            alt={displayName} 
            className="w-full h-full object-cover" 
            onError={handleImageError}
          />
        )}
      </div>
      
      <div className="flex-1">
        <h2 className="text-xl font-heading font-bold text-primary-900 truncate">{displayName}</h2>
        <p className="text-sm text-primary-600">Universal Profile</p>
      </div>
      
      {showStatus && (
        <div className="flex items-center space-x-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-green-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          
          {onDisconnect && (
            <motion.button
              onClick={onDisconnect}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors duration-200 bg-white/10 hover:bg-white/20 rounded-full p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Disconnect"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ProfileCard; 