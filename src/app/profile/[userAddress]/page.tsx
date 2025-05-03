"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import UserProfileView from '@/components/profile/UserProfileView'; // Yeni bileşenin yolunu doğrulayın

const UserProfilePage = () => {
    const params = useParams();
    const userAddress = params?.userAddress as string;

    if (!userAddress) {
        // Adres yoksa bir hata veya yükleniyor durumu gösterilebilir
        return <div className="p-6 text-center text-red-500">User address not found.</div>;
    }

    return (
        // Tam sayfa görünümü için container ve paddingler burada kalabilir
        <div className="container mx-auto max-w-4xl p-4 md:p-6">
            <UserProfileView userAddress={userAddress} isModal={false} />
        </div>
    );
};

export default UserProfilePage; 