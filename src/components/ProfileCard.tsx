"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UPClientProvider } from '@lukso/up-provider';
import { ProfileData } from '@/types';
import Link from 'next/link';
import { formatIPFSUrl } from '@/utils/ipfs';

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

const shortenAddress = (addr: string | null): string => {
  if (!addr) return '';
  if (addr.length < 10) return addr;
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const getImageUrlFromProfile = (profile: ProfileData | null): string => {
  if (!profile) return '/default-avatar.png';

  if (profile.avatar && profile.avatar.length > 0) {
    const avatarElement = profile.avatar[0];
    if (avatarElement && 
        typeof avatarElement === 'object' && 
        avatarElement !== null &&
        'url' in avatarElement && 
        typeof (avatarElement as any).url === 'string') {
      return formatIPFSUrl((avatarElement as any).url);
    }
  }

  if (profile.profileImage && profile.profileImage.length > 0) {
    const imageElement = profile.profileImage[0];
    if (imageElement) {
      if (typeof imageElement === 'object' && 
          imageElement !== null &&
          'url' in imageElement && 
          typeof (imageElement as any).url === 'string') {
         return formatIPFSUrl((imageElement as any).url);
      }
      if (typeof imageElement === 'string') {
        return formatIPFSUrl(imageElement);
      }
    }
  }

  return '/default-avatar.png';
};

const ProfileCard: React.FC<ProfileCardProps> = ({ 
  profile, 
  address, 
  provider,
  onDisconnect, 
  stats,
  loadingStats,
  showStatus = true 
}) => {
  const displayName = profile?.name || shortenAddress(address);
  const derivedProfileImageUrl = getImageUrlFromProfile(profile);
  
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    console.log('ProfileCard: Resim yükleme hatası, varsayılan avatar kullanılıyor');
    setImgError(true);
  };

  const imageToShow = imgError ? '/default-avatar.png' : (derivedProfileImageUrl || '/default-avatar.png');

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
        <h2 className="text-xl font-heading font-bold text-primary-900 truncate" title={profile?.name ? `${profile.name} (${shortenAddress(address)})` : address || ''}>
          {displayName}
        </h2>
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