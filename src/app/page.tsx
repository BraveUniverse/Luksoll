'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUP } from '@/context/UPContext';
import WelcomeScreen from '@/components/WelcomeScreen';
import ProfileCard from '@/components/ProfileCard';
import CreatePollModal from '@/components/modals/CreatePollModal';
import PollListModal from '@/components/modals/PollListModal';
import ProfileModal from '@/components/modals/ProfileModal';
import Leaderboard, { LeaderboardEntry } from '@/components/Leaderboard';
import { LSP3ProfileManager } from '@/hooks/useLSP3Profile';
import { getCachedProfile, setCachedProfile } from '@/utils/localStorageCache';
import { ProfileData } from '@/types';
import LeaderboardModal from '@/components/modals/LeaderboardModal';
import { getOwner, getTotalPollCount, getTotalInteractingUsersCount } from '@/contracts/contract-config';
import OwnerPanelModal from '@/components/modals/OwnerPanelModal';

// Baloncuk konumları için sabit değerler - hydration hatasını önlemek için
const BUBBLE_POSITIONS = [
  { x: 10, y: 20, size: 25, duration: 15 },
  { x: 20, y: 80, size: 15, duration: 20 },
  { x: 30, y: 40, size: 30, duration: 18 },
  { x: 40, y: 60, size: 20, duration: 25 },
  { x: 50, y: 30, size: 35, duration: 22 },
  { x: 60, y: 70, size: 18, duration: 16 },
  { x: 70, y: 20, size: 28, duration: 20 },
  { x: 80, y: 50, size: 22, duration: 19 },
  { x: 90, y: 30, size: 32, duration: 24 },
  { x: 15, y: 65, size: 24, duration: 21 },
  { x: 25, y: 35, size: 20, duration: 17 },
  { x: 75, y: 85, size: 30, duration: 23 },
  { x: 85, y: 15, size: 26, duration: 19 },
  { x: 45, y: 55, size: 33, duration: 22 },
  { x: 65, y: 25, size: 19, duration: 18 }
];

export default function Home() {
  const { 
    isConnected, 
    connectUP, 
    disconnectUP,
    profileData: contextProfileData,
    connecting, 
    isInitialized, 
    address,
    contract,
    error,
    upProvider,
    web3
  } = useUP();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Array<{id: number, x: number, y: number, size: number, duration: number}>>([]);
  const [userStats, setUserStats] = useState({
    points: 0,
    votedPolls: 0,
    createdPolls: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [globalStats, setGlobalStats] = useState({ totalPolls: 0, totalUsers: 0 });
  const [loadingGlobalStats, setLoadingGlobalStats] = useState(false);

  // Modal açma fonksiyonları
  const openCreatePollModal = () => setActiveModal('createPoll');
  const openPollListModal = () => setActiveModal('pollList');
  const openProfileModal = () => setActiveModal('profile');
  const openLeaderboardModal = () => setActiveModal('leaderboard');
  const openOwnerPanelModal = () => setActiveModal('ownerPanel');
  const closeModal = () => setActiveModal(null);

  // Anket oluşturulduğunda açık anketleri yenilemek için
  const handlePollCreated = () => {
    fetchUserStats();
  };

  // Kullanıcı istatistiklerini getir
  const fetchUserStats = async () => {
    if (!isConnected || !contract || !address) return;
    
    try {
      setLoadingStats(true);
      
      // Kullanıcı puanlarını al
      const points = await contract.methods.getUserPoints(address).call();
      
      // Kullanıcının oy verdiği anketleri al
      const votedPollIds = await contract.methods.getUserVotedPollIds(address).call();
      
      // Aktif anket sayacını kullanarak oluşturulan anketleri al
      const createdPolls = await contract.methods.creatorActivePollCount(address).call();
      
      setUserStats({
        points: Number(points),
        votedPolls: votedPollIds.length,
        createdPolls: Number(createdPolls)
      });
      
    } catch (error) {
      console.error("Kullanıcı istatistikleri alınırken hata:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Liderlik Tablosu Verilerini Getir
  const fetchLeaderboardData = async () => {
    // Provider'ın varlığını VE hazır olma durumunu kontrol et
    if (!contract || !upProvider || !isConnected || !isInitialized) {
        console.log("[Leaderboard] Fetch skipped: Provider/Contract not ready or user not connected.", {
            hasContract: !!contract,
            hasProvider: !!upProvider,
            isConnected: isConnected,
            isInitialized: isInitialized
        });
       return;
    }
    
    // isConnected ve isInitialized true ise devam et
    setLoadingLeaderboard(true);
    try {
      console.log("Leaderboard verisi çekiliyor...");
      const rankedUserAddresses: string[] = await contract.methods.getAllRankedUsers().call();
      console.log(`Sıralamaya giren ${rankedUserAddresses.length} kullanıcı bulundu.`);

      if (rankedUserAddresses.length === 0) {
        setLeaderboardData([]);
        setLoadingLeaderboard(false);
        return;
      }

      const pointPromises = rankedUserAddresses.map(addr => 
        contract.methods.getUserPoints(addr).call()
           .then((points: bigint | number | string) => ({ address: addr, points: Number(points) }))
           .catch((err: any) => {
              console.warn(`Puan alınamadı (${addr}):`, err.message);
              return { address: addr, points: 0 }; 
           })
      );
      const usersWithPoints = await Promise.all(pointPromises);
      console.log("Puanlar çekildi:", usersWithPoints);

      const sortedUsers = usersWithPoints.sort((a, b) => b.points - a.points);

      // 4. İlk N kullanıcıyı al - KALDIRILDI
      // const topUsers = sortedUsers.slice(0, 10); 
      const topUsers = sortedUsers; // Tüm kullanıcıları al
      console.log(`${topUsers.length} kullanıcı için profil çekilecek.`);

      // 5. TÜM kullanıcıların profillerini çek (cache kullanarak)
      const profilePromises = topUsers.map(async (user, index) => {
        const lowerCaseAddress = user.address.toLowerCase();
        let fetchedProfileData: ProfileData | null = null;
        console.log(`[Leaderboard] Profil işleniyor: ${user.address} (Rank: ${index + 1})`);
        
        try {
            const cachedProfile = getCachedProfile(lowerCaseAddress);
            
            // Cache kontrolü: Sadece geçerli profil varsa kullan, null ise yeniden çek
            if (cachedProfile !== undefined && cachedProfile !== null) {
                fetchedProfileData = cachedProfile;
                console.log(`[Leaderboard] Cache hit (Valid Profile) for ${user.address}`);
            } else {
                // Null cache veya undefined ise yeniden çek
                if (cachedProfile === null) {
                    console.log(`[Leaderboard] Cache hit (Profile is null) for ${user.address}. Re-fetching from network...`);
                } else {
                    console.log(`[Leaderboard] Cache miss for ${user.address}. Fetching from network...`);
                }
                
                // Fetch using the manager and context web3
                const lsp3Manager = new LSP3ProfileManager(); 
                const data = await lsp3Manager.getProfileData(user.address, web3);
                 
                if (data) {
                    console.log(`[Leaderboard] Network fetch SUCCESS for ${user.address}`);
                    const imageUrl = lsp3Manager.getProfileImageUrl(data) || '';
                    fetchedProfileData = {
                        name: data.name || `User ${user.address.substring(0, 6)}...`,
                        image: imageUrl,
                    };
                    setCachedProfile(lowerCaseAddress, fetchedProfileData);
                } else {
                    console.log(`[Leaderboard] Network fetch FAILED (No profile data) for ${user.address}`);
                    setCachedProfile(lowerCaseAddress, null); 
                    fetchedProfileData = null;
                }
            }
        } catch (profileErr: any) {
             console.warn(`[Leaderboard] Profile processing ERROR for ${user.address}:`, profileErr.message);
             // Hata durumunda da null cache'le ki sürekli denemesin
             setCachedProfile(lowerCaseAddress, null); 
             fetchedProfileData = null;
        }
        
        // Profil verisi oluşturma kısmı (kodu tekrarlamamak için birleştirilebilir)
        if (fetchedProfileData && !fetchedProfileData.name) {
             // Eğer bir şekilde data geldi ama name yoksa, default ata
             fetchedProfileData.name = `User ${user.address.substring(0, 6)}...`;
         }
         if (fetchedProfileData && !fetchedProfileData.image) {
             fetchedProfileData.image = ''; // veya varsayılan avatar URL'si
         }

        return {
          ...user,
          rank: index + 1, 
          profile: fetchedProfileData
        };
      });

      const finalLeaderboardData = await Promise.all(profilePromises);
      console.log("Leaderboard verisi işlendi:", finalLeaderboardData);
      setLeaderboardData(finalLeaderboardData);

    } catch (error) {
      console.error("Liderlik tablosu verisi alınırken hata:", error);
      setLeaderboardData([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Fetch global stats
  const fetchGlobalStats = async () => {
    if (!contract) return;
    setLoadingGlobalStats(true);
    try {
      const [totalPolls, totalUsers] = await Promise.all([
        getTotalPollCount(contract),
        getTotalInteractingUsersCount(contract)
      ]);
      setGlobalStats({ totalPolls, totalUsers });
    } catch (error) {
      console.error("Error fetching global stats:", error);
      setGlobalStats({ totalPolls: 0, totalUsers: 0 }); // Reset on error
    } finally {
      setLoadingGlobalStats(false);
    }
  };

  useEffect(() => {
    // Debug için durum bilgilerini konsola yazdıralım
    console.log("Ana sayfa: Durum değişikliği", {
      isConnected,
      isInitialized,
      connecting,
      profileData: !!contextProfileData,
      address
    });
    
    // Zaten bağlı değilse ve provider initializedsa otomatik bağlan
    if (!isConnected && isInitialized && !connecting) {
      console.log("Ana sayfa: Otomatik bağlantı başlatılıyor...");
      connectUP();
    }
    
    // Kullanıcı bağlandığında VE provider hazır olduğunda istatistikleri VE leaderboard'u getir
    if (isConnected && isInitialized && contract && address && upProvider) {
      console.log("[useEffect] Conditions met, fetching data...");
      fetchUserStats();
      fetchLeaderboardData();
      fetchGlobalStats();
    } else {
      // Koşullar karşılanmadığında nedenini logla (opsiyonel debug)
      console.log("[useEffect] Conditions not met for fetching data.", {
          isConnected, isInitialized, hasContract: !!contract, hasAddress: !!address, hasProvider: !!upProvider
      });
    }
  }, [isConnected, isInitialized, connecting, connectUP, address, contract, upProvider]);

  // Baloncukları sadece istemci tarafında oluştur - hydration hatasını önlemek için
  useEffect(() => {
    setBubbles(
      BUBBLE_POSITIONS.map((position, i) => ({
        id: i,
        x: position.x,
        y: position.y,
        size: position.size,
        duration: position.duration,
      }))
    );
  }, []);

  // NEW useEffect for checking owner status
  useEffect(() => {
    const checkOwnerStatus = async () => {
      // Check only if connected and contract is available
      if (contract && address && isConnected) { 
        try {
          console.log('[DEBUG Main Page] Checking owner status...');
          const ownerAddress = await getOwner(contract);
          
          // <<< YENİ LOGLAR BAŞLANGIÇ >>>
          console.log(`[DEBUG Main Page] Owner address from contract (getOwner): ${ownerAddress}`);
          console.log(`[DEBUG Main Page] Current connected address (useUP): ${address}`);
          // <<< YENİ LOGLAR BİTİŞ >>>

          // Karşılaştırmadan önce küçük harfe çevirerek kontrol edelim
          const isUserOwner = ownerAddress !== null && address.toLowerCase() === ownerAddress.toLowerCase();
          setIsOwner(isUserOwner);
          console.log(`[DEBUG Main Page] Comparison result (case-insensitive): ${isUserOwner}`);
        } catch (error) {
          console.error('[ERROR Main Page] Failed to check owner status:', error);
          setIsOwner(false); // Set to false on error
        } 
      } else {
        // Reset if not connected or contract not ready
        console.log('[DEBUG Main Page] Skipping owner check: Not connected or contract/address unavailable.');
        setIsOwner(false); 
      }
    };
    
    checkOwnerStatus();
    // Dependencies: Check when connection status, address, or contract instance changes
  }, [contract, address, isConnected]); 

  // Profile Modal Handlers
  const handleOpenProfileModal = (address: string) => {
    console.log("Opening profile modal for:", address);
    setSelectedProfileAddress(address);
    // Optionally close other modals if needed
    // setActiveModal(null); 
  };

  const handleCloseProfileModal = () => {
    console.log("Closing profile modal");
    setSelectedProfileAddress(null);
  };

  // Ana içerik bileşenleri
  const renderContent = () => {
    console.log("Ana sayfa: renderContent çağrıldı:", {
      isConnected,
      connecting,
      hasProfile: !!contextProfileData,
      address
    });
    
    // Loading durumu
    if (connecting) {
      return (
        <WelcomeScreen onConnect={connectUP} isLoading={true} />
      );
    }
    
    // Bağlı durum kontrolü
    if (isConnected) {
      // Profil verisi varsa (veya varsayılan profil kullanıldıysa) ana ekranı göster

      // ProfileCard için profile prop'unu formatla
      const formattedProfileDataForCard: ProfileData | null = contextProfileData ? {
          name: contextProfileData.name || 'LUKSO User',
          image: contextProfileData.profileImage || '/default-avatar.png', // UPContext'teki profileImage'dan image alanını doldur
          // types.ts'deki diğer opsiyonel alanları da ekleyelim
          description: contextProfileData.description,
          tags: contextProfileData.tags || [], // tags UPContext'te opsiyonel
          links: contextProfileData.links || [], // links UPContext'te opsiyonel
          // types.ts'deki profileImage/backgroundImage dizilerini şimdilik doldurmuyoruz
          // çünkü UPContext tekil string döndürüyor.
          profileImage: contextProfileData.profileImage ? [contextProfileData.profileImage] : undefined, // type uyumu için
          backgroundImage: contextProfileData.backgroundImage ? [contextProfileData.backgroundImage] : undefined // type uyumu için
      } : null;

      return (
        <div className="flex flex-col items-center space-y-6">
          {/* Profil kartı - formatlanmış veriyi kullan */}
          <ProfileCard 
            address={address || ''}
            provider={upProvider}
            onDisconnect={disconnectUP}
            stats={userStats}
            loadingStats={loadingStats}
            profile={formattedProfileDataForCard} // Dönüştürülmüş veriyi geç
          />
          
          {/* Kullanıcı istatistikleri */}
          <div className="flex justify-between w-full max-w-md mx-auto mt-4 mb-6 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{userStats.points}</p>
              <p className="text-xs text-gray-300">Points</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{userStats.votedPolls}</p>
              <p className="text-xs text-gray-300">Votes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{userStats.createdPolls}</p>
              <p className="text-xs text-gray-300">Polls</p>
            </div>
          </div>
          
          {/* NEW: Global Stats Section */}
          <div className="w-full max-w-md mx-auto mt-2 text-center">
            <h3 className="text-lg font-semibold text-primary-200 mb-2">Platform Stats</h3>
            {loadingGlobalStats ? (
              <div className="flex justify-center items-center h-10">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-300 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex justify-around bg-white/5 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{globalStats.totalPolls}</p>
                  <p className="text-xs text-gray-400">Total Polls</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{globalStats.totalUsers}</p>
                  <p className="text-xs text-gray-400">Engaged Users</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Ana butonlar */}
          <div className="flex flex-col gap-4 mt-2 w-full max-w-md mx-auto">
            <motion.button
              className="btn-primary py-4 text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCreatePollModal}
            >
              Create Poll
            </motion.button>
            
            <motion.button
              className="btn-secondary py-4 text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openPollListModal}
            >
              Explore Polls
            </motion.button>
            
            <motion.button
              className="btn-tertiary py-2 text-lg"
              whileHover={{ y: -2 }}
              onClick={openProfileModal}
            >
              Profile Details
            </motion.button>
            
            {/* YENİ: Leaderboard Butonu */}
            <motion.button
              className="btn-secondary py-3 text-base" // Stilini diğerlerine göre ayarlayabiliriz
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openLeaderboardModal}
            >
              🏆 Leaderboard
            </motion.button>
          </div>
          
          {/* Hata mesajı (varsa) */}
          {error && (
            <motion.div 
              className="mt-4 p-2 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm max-w-md mx-auto text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Owner Panel Button - Conditionally Rendered */}
          {isOwner && (
            <div className="my-4 text-center">
              <button
                onClick={openOwnerPanelModal}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
              >
                🛠️ Owner Panel
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Bağlı değilse hoşgeldin ekranını göster
    return (
      <WelcomeScreen onConnect={connectUP} isLoading={connecting} />
    );
  };
  
  return (
    <main className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Arka plan animasyonlu baloncuklar */}
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="absolute rounded-full bg-primary-100 opacity-30"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Ana içerik */}
      <div className="z-10 w-full max-w-3xl">
        {renderContent()}
      </div>

      {/* Modaller */}
      <AnimatePresence>
        {activeModal === 'createPoll' && (
          <CreatePollModal 
            isOpen={activeModal === 'createPoll'}
            onClose={closeModal} 
            contract={contract}
            account={address || ''}
            onPollCreated={() => { 
              handlePollCreated(); 
              fetchLeaderboardData(); 
            }}
          />
        )}
        
        {activeModal === 'pollList' && (
          <PollListModal 
            onClose={closeModal}
            onPollSelect={() => {}}
          />
        )}
        
        {activeModal === 'profile' && address && (
          <ProfileModal 
            userAddress={address}
            isOpen={activeModal === 'profile'}
            onClose={closeModal}
          />
        )}
        
        {activeModal === 'leaderboard' && (
          <LeaderboardModal
            isOpen={activeModal === 'leaderboard'}
            onClose={() => setActiveModal(null)}
            data={leaderboardData}
            isLoading={loadingLeaderboard}
            currentUserAddress={address}
            onUserClick={handleOpenProfileModal}
          />
        )}
        
        {activeModal === 'ownerPanel' && (
          <OwnerPanelModal isOpen={true} onClose={closeModal} />
        )}
      </AnimatePresence>

      {/* Profile Modal - activeModal'dan bağımsız */}
      {selectedProfileAddress && (
        <ProfileModal
          isOpen={!!selectedProfileAddress}
          onClose={handleCloseProfileModal}
          userAddress={selectedProfileAddress}
        />
      )}
    </main>
  );
} 