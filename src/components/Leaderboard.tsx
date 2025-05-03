"use client";

import React, { useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProfileData } from '@/types'; // Import ProfileData type
import { TrophyIcon, UserCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid'; // Icons
import { SparklesIcon } from '@heroicons/react/24/outline'; // Icon for points
import { LSP3Profile } from "@lukso/lsp-factory.js"; // Removed .js extension

export interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  profile?: ProfileData | null; // Profil bilgisi opsiyonel
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
  isLoading: boolean;
  currentUserAddress?: string | null;
  onUserClick: (address: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ data, isLoading, currentUserAddress, onUserClick }) => {
  // Her satır için ref'leri tutacak bir map oluştur
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  
  // Mevcut kullanıcının listedeki verisini ve indexini bulalım
  const currentUserEntry = useMemo(() => {
    if (!currentUserAddress || !data || data.length === 0) return null;
    const lowerCaseAddress = currentUserAddress.toLowerCase();
    return data.find(entry => entry.address.toLowerCase() === lowerCaseAddress);
  }, [data, currentUserAddress]);

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex items-center justify-between p-3 bg-gray-100/50 rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-200/70 flex-shrink-0"></div>
          <div className="w-8 h-8 rounded-full bg-gray-200/70 flex-shrink-0"></div>
          <div className="w-24 h-4 rounded bg-gray-200/70"></div>
        </div>
        <div className="w-12 h-4 rounded bg-gray-200/70"></div>
      </div>
    ))
  );

  const renderRankBadge = (rank: number) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-500';
    let ringColor = 'ring-gray-200';

    if (rank === 1) { bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; ringColor = 'ring-yellow-300'; }
    if (rank === 2) { bgColor = 'bg-gray-200'; textColor = 'text-gray-600'; ringColor = 'ring-gray-300'; }
    if (rank === 3) { bgColor = 'bg-orange-100'; textColor = 'text-orange-700'; ringColor = 'ring-orange-300'; }
    
    return (
      <span 
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-1 ${bgColor} ${textColor} ${ringColor}`}
      >
        {rank}
      </span>
    );
  }

  const handleFindMe = () => {
    if (currentUserEntry) {
      const node = itemRefs.current.get(currentUserEntry.address);
      node?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      node?.classList.add('ring-2', 'ring-[#ED1169]', 'ring-offset-2', 'ring-offset-gray-800/50', 'rounded-lg');
       setTimeout(() => {
         node?.classList.remove('ring-2', 'ring-[#ED1169]', 'ring-offset-2', 'ring-offset-gray-800/50', 'rounded-lg');
       }, 2000); 
    }
  };

  const renderProfileImage = (profile: LSP3Profile | null, address: string) => {
    const avatarSize = 32;
    let imageUrl: string | null = null;

    if (profile?.profileImage?.[0]?.url) {
      const ipfsUrl =
        profile.profileImage[0].url.startsWith("ipfs://") &&
        profile.profileImage[0].url.length > 7
          ? `https://api.universalprofile.cloud/v1/ipfs/${profile.profileImage[0].url.substring(7)}`
          : profile.profileImage[0].url;
      imageUrl = ipfsUrl;
    }

    // Eğer imageUrl yoksa, ui-avatars kullan
    if (!imageUrl) {
      const nameForAvatar = profile?.name || address.substring(2, 8); // İsim yoksa adresin bir kısmını kullan
      imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=E8F5FF&color=005A9C&bold=true&size=64`;
    }

    return (
      <img
        src={imageUrl} // Her zaman imageUrl kullanılacak
        alt={profile?.name || address}
        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
        width={avatarSize}
        height={avatarSize}
        onError={(e) => { 
          // Hata durumunda basit bir placeholder veya başka bir avatar servisi denenebilir
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${address.substring(2, 4)}&background=cccccc&color=ffffff&size=64`; 
        }}
      />
    );
  };

  const renderUsername = (profile: LSP3Profile | null, address: string) => {
    let name = address.substring(0, 6) + "..." + address.substring(38);
    let isVerified = false;

    if (profile?.name) {
      name = profile.name.length > 15 ? profile.name.substring(0, 15) + "..." : profile.name;
      // Basit bir "verified" kontrolü (örneğin tag'e bakılabilir)
      isVerified = profile.tags?.includes("verified") ?? false;
    }

    return (
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {name}
        </span>
        {isVerified && (
          <CheckCircleIcon className="w-4 h-4 text-sky-500 ml-1 flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-[#500126] flex items-center gap-2">
           <TrophyIcon className="w-5 h-5 text-yellow-500"/> Leaderboard
        </h2>
        {currentUserEntry && (
          <button 
            onClick={() => onUserClick(currentUserEntry.address)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFF0F7] text-[#8F0C4C] hover:bg-[#FFE2EA] border border-[#FFCADB]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ED1169] focus:ring-offset-1"
          >
            <UserCircleIcon className="w-4 h-4" />
            Find Me
          </button>
        )}
      </div>
      
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
        {isLoading ? (
          renderSkeleton()
        ) : data.length === 0 ? (
          <p className="text-center text-gray-500 py-6 text-sm">No users ranked yet.</p>
        ) : (
          data.map((entry) => {
            const isCurrentUser = currentUserAddress && entry.address.toLowerCase() === currentUserAddress.toLowerCase();
            const displayName = isCurrentUser && !entry.profile?.name 
                                ? "You" 
                                : entry.profile?.name || `${entry.address.substring(0, 5)}...${entry.address.substring(entry.address.length - 3)}`;
            const avatarUrl = entry.profile?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.profile?.name || entry.address.substring(2, 5))}&background=E8F5FF&color=005A9C&bold=true&size=64`;

            return (
              <motion.div 
                key={entry.address}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(entry.address, node);
                  } else {
                    itemRefs.current.delete(entry.address);
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 group border 
                           ${isCurrentUser 
                             ? 'bg-[#FFF0F7] border-[#ED1169]/80 shadow-sm'
                             : 'bg-white border-gray-200 hover:bg-gray-50/80 hover:border-gray-300'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: entry.rank * 0.03, duration: 0.3 }}
                onClick={() => onUserClick(entry.address)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {renderRankBadge(entry.rank)}
                  <img 
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full border border-gray-200 object-cover flex-shrink-0 shadow-sm"
                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.profile?.name || entry.address.substring(2, 5))}&background=E8F5FF&color=005A9C&bold=true&size=64`; }}
                  />
                  <Link 
                     href={`/profile/${entry.address}`} 
                     className="text-sm font-medium text-gray-700 hover:text-[#8F0C4C] truncate flex-1 min-w-0 group-hover:underline" 
                     title={displayName + ` (${entry.address})`}
                  >
                     {displayName}
                  </Link>
                </div>
                <span 
                  className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100/80 px-2 py-1 rounded-full ml-2 whitespace-nowrap shadow-xs border border-yellow-300/50"
                  title={`${entry.points} Points`}
                >
                   <SparklesIcon className="w-3 h-3 text-yellow-500" />
                   {entry.points}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 