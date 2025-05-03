"use client";

import React from 'react';
import Modal from './Modal'; // General Modal component
import Leaderboard, { LeaderboardEntry } from '@/components/Leaderboard'; // Main leaderboard content

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LeaderboardEntry[];
  isLoading: boolean;
  currentUserAddress?: string | null;
  onUserClick: (address: string) => void;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
  currentUserAddress,
  onUserClick,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🏆 Leaderboard" size="lg"> {/* Size can be adjusted */}
      {/* Embed the Leaderboard component inside the modal */}
      {/* We don't add a title again since the Leaderboard component already displays its own */}
      {/* We could remove Leaderboard's own styling (shadow, background, etc.) and use the Modal's */}
      {/* For now, let's use the Leaderboard as is */}
       <Leaderboard 
         data={data} 
         isLoading={isLoading} 
         currentUserAddress={currentUserAddress} 
         onUserClick={onUserClick}
      />
    </Modal>
  );
};

export default LeaderboardModal; 