"use client";

import React from 'react';
import Modal from './modals/Modal';
import UserProfileView from '@/components/profile/UserProfileView';
import { XMarkIcon } from "@heroicons/react/24/solid";

interface ProfileModalProps {
    userAddress: string;
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ userAddress, isOpen, onClose }) => {
    if (!isOpen) {
        return null;
        }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="User Profile" size="xl">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
                aria-label="Close Profile"
            >
                <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="pt-6">
                <UserProfileView userAddress={userAddress} onClose={onClose} isModal={true} />
            </div>
        </Modal>
    );
};

export default ProfileModal; 