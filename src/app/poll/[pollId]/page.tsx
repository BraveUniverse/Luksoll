"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import PollDetailModal from '@/components/modals/PollDetailModal'; // Mevcut modal bileşenini kullanacağız

// Sayfayı sarmallayacak basit bir container ekleyebiliriz
const PageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#fff0f7] to-[#e8f5ff] py-6 flex flex-col justify-center sm:py-12">
    <div className="relative py-3 sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
      <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
        {children}
      </div>
    </div>
  </div>
);


const PollPage = () => {
  const params = useParams();
  const router = useRouter();
  const pollIdParam = params?.pollId;

  // pollId'nin bir sayı olduğundan emin olalım
  const pollId = typeof pollIdParam === 'string' ? parseInt(pollIdParam, 10) : null;

  // Geri dönme fonksiyonu
  const handleClose = () => {
    router.back(); // Tarayıcı geçmişinde bir önceki sayfaya dön
  };

  if (pollId === null || isNaN(pollId)) {
    return (
      <PageContainer>
        <div className="text-center text-red-600">
          Geçersiz Anket ID'si.
           <button onClick={handleClose} className="mt-4 text-sm text-blue-600 hover:underline">Geri Dön</button>
        </div>
      </PageContainer>
    );
  }

  return (
    // Normalde PollDetailModal bir modal'dı, ama burada doğrudan sayfa içeriği olarak kullanacağız.
    // `Modal` bileşeninin kendi içindeki yapıyı kaldırıp sadece içeriğini render etmesi için
    // PollDetailModal'ı biraz düzenlemek gerekebilir, ama şimdilik bu şekilde deneyelim.
    // onClose prop'unu handleClose fonksiyonumuza bağlıyoruz.
    // isOpen prop'unu kaldırdık çünkü artık modal değil.
    <PageContainer>
       {/* Belki başlık eklemek iyi olabilir */}
       <div className="mb-4 flex justify-between items-center">
           <h1 className="text-xl font-semibold text-[#500126]">Anket Detayı</h1>
           <button onClick={handleClose} className="text-sm text-[#8F0C4C] hover:text-[#ED1169]"> &larr; Geri</button>
       </div>
      <PollDetailModal pollId={pollId} onClose={handleClose} />
    </PageContainer>
  );
};

export default PollPage; 