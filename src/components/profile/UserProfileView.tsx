"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // useRouter'ı yine geri butonu için kullanabiliriz, ancak modalda farklı davranabilir.
import Link from 'next/link';
import Web3 from 'web3';
import { useUP } from '@/context/UPContext';
import { LSP3ProfileManager } from '@/hooks/useLSP3Profile';
import { Poll, VotedPollInfo, ProfileData } from '@/types';
import { getCachedProfile, setCachedProfile, getCachedPollStaticDetails } from '@/utils/localStorageCache';
import { formatDistanceToNowStrict } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
    getPollDetails,
    getUserCreatedPollIds,
    POLL_CONTRACT_ABI,
} from '@/contracts/contract-config';

// --- Kontrat ABI ve Adres Tanımları (page.tsx'den kopyalandı) ---
const LSP26_FOLLOWER_ABI = [{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"followerCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"followingCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"follower","type":"address"},{"internalType":"address","name":"addr","type":"address"}],"name":"isFollowing","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"follow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"unfollow","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const LSP26_REGISTRY_ADDRESS = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA";
const DEFAULT_IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
// --- End ABI Definitions ---

interface UserProfileViewProps {
    userAddress: string;
    // Modal context'i için onClose prop'u ekleyelim
    onClose?: () => void;
    isModal?: boolean; // Modal içinde mi render edildiğini belirtmek için
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ userAddress, onClose, isModal = false }) => {
    const router = useRouter(); // Geri butonu için veya linkler için
    const { web3, address: viewerAddress, upProvider, contract: pollContractGlobal } = useUP();

    // State'ler page.tsx'den kopyalandı
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [createdPolls, setCreatedPolls] = useState<Poll[]>([]);
    const [votedPollsInfo, setVotedPollsInfo] = useState<VotedPollInfo[]>([]);
    const [followingCount, setFollowingCount] = useState<number>(0);
    const [followerCount, setFollowerCount] = useState<number>(0);
    const [isFollowingViewer, setIsFollowingViewer] = useState<boolean>(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isLoadingCreatedPolls, setIsLoadingCreatedPolls] = useState(true);
    const [isLoadingVotedPolls, setIsLoadingVotedPolls] = useState(true);
    const [isLoadingFollowStats, setIsLoadingFollowStats] = useState(true);
    const [isFollowProcessing, setIsFollowProcessing] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [createdPollsError, setCreatedPollsError] = useState<string | null>(null);
    const [votedPollsError, setVotedPollsError] = useState<string | null>(null);
    const [followStatsError, setFollowStatsError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'created' | 'voted'>('created');

    // Kontrat örnekleri page.tsx'den kopyalandı
    const pollContract = useMemo(() => {
        if (!web3 || !pollContractGlobal?.options?.address) return null;
        return new web3.eth.Contract(POLL_CONTRACT_ABI as any, pollContractGlobal.options.address);
    }, [web3, pollContractGlobal]);

    const followerSystemContract = useMemo(() => {
        if (!web3) return null;
        return new web3.eth.Contract(LSP26_FOLLOWER_ABI as any, LSP26_REGISTRY_ADDRESS);
    }, [web3]);

    // --- Veri Çekme Fonksiyonları (Güncellenmiş Hata Yönetimi) ---
     const fetchProfile = useCallback(async () => {
        if (!upProvider || !userAddress) return;
        setIsLoadingProfile(true);
        setProfileError(null); // Clear previous profile error
        const lowerCaseAddress = userAddress.toLowerCase();
        const cached = getCachedProfile(lowerCaseAddress);
        if (cached !== undefined) {
            setProfileData(cached);
            setIsLoadingProfile(false);
            return;
        }
        try {
            const lsp3Manager = new LSP3ProfileManager(upProvider);
            const data = await lsp3Manager.getProfileData(userAddress);
            let profileInfo: ProfileData | null = null;
            if (data) {
                let imageUrl = lsp3Manager.getProfileImageUrl(data) || '/default-avatar.png';
                profileInfo = {
                    name: data.name || `User ${userAddress.substring(0, 6)}...`,
                    image: imageUrl, // Geriye dönük uyumluluk için
                    description: data.description || '',
                    tags: data.tags || [],
                    links: data.links || [],
                    // Profil ve arkaplan resimlerini doğrudan al
                    profileImage: data.profileImage || [],
                    backgroundImage: data.backgroundImage || [],
                    // Avatar verisini kopyala
                    avatar: data.avatar || []
                };
            }
            setProfileData(profileInfo);
            setCachedProfile(lowerCaseAddress, profileInfo); // Cache'e kaydet
        } catch (err) {
            console.error("Failed to fetch profile:", err);
            setProfileError(`Failed to load user profile (${userAddress.substring(0,6)}...).`);
            setProfileData(null); // Clear data on error
        } finally {
            setIsLoadingProfile(false);
        }
    }, [upProvider, userAddress]);


    const fetchFollowStats = useCallback(async () => {
        if (!followerSystemContract || !userAddress) return;
        setIsLoadingFollowStats(true);
        setFollowStatsError(null); // Clear previous follow error
        try {
            // Paralel olarak çek
            const [followersResult, followingResult, isViewerFollowingResult] = await Promise.all([
                followerSystemContract.methods.followerCount(userAddress).call(),
                followerSystemContract.methods.followingCount(userAddress).call(),
                (viewerAddress && viewerAddress.toLowerCase() !== userAddress.toLowerCase())
                    ? followerSystemContract.methods.isFollowing(viewerAddress, userAddress).call()
                    : Promise.resolve(false) // Kendi kendini takip edemez
            ]);

            setFollowerCount(Number(followersResult));
            setFollowingCount(Number(followingResult));
            setIsFollowingViewer(Boolean(isViewerFollowingResult));

        } catch (err) {
            console.error("Failed to fetch follow/following stats:", err);
            setFollowStatsError("Failed to load follow information.");
            // Reset counts on error?
            setFollowerCount(0);
            setFollowingCount(0);
            setIsFollowingViewer(false);
        } finally {
            setIsLoadingFollowStats(false);
        }
    }, [followerSystemContract, userAddress, viewerAddress]);


    const fetchCreatedPollsData = useCallback(async () => {
        if (!pollContract || !web3 || !userAddress) return;
        setIsLoadingCreatedPolls(true);
        setCreatedPollsError(null); // Clear previous created polls error

        try {
            console.log(`[fetchCreatedPollsData] Fetching created poll IDs for: ${userAddress}`);
            const createdPollIds: number[] = await getUserCreatedPollIds(pollContract, userAddress);
            console.log(`[fetchCreatedPollsData] Received ${createdPollIds.length} created poll IDs:`, createdPollIds);

            if (!createdPollIds || createdPollIds.length === 0) {
                setCreatedPolls([]);
                setIsLoadingCreatedPolls(false);
                return;
            }

            // Fetch details only for the retrieved IDs
            const pollDetailPromises = createdPollIds.map(async (pollId) => {
                try {
                    // Check cache first (optional but good for performance)
                    // const cached = getCachedPollStaticDetails(pollId); 
                    // if (cached) { /* ... use cached ... */ return cached; }

                    console.log(`[fetchCreatedPollsData] Fetching details for created poll ID: ${pollId}`);
                    const pollDetailsRaw = await getPollDetails(pollContract, pollId, web3);
                    
                    // --- START: Type Conversion and ID Addition ---
                    if (!pollDetailsRaw) return null; // Handle case where getPollDetails might return null/undefined

                    // Explicitly construct a Poll object, adding the missing ID
                    const pollData: Poll = {
                        id: pollId, // Add the pollId
                        question: pollDetailsRaw.question,
                        description: pollDetailsRaw.description,
                        options: pollDetailsRaw.options || [], // Ensure options array exists
                        startTime: pollDetailsRaw.startTime,
                        endTime: pollDetailsRaw.endTime,
                        isActive: pollDetailsRaw.isActive,
                        totalVotes: pollDetailsRaw.totalVotes,
                        rewardPerVote: pollDetailsRaw.rewardPerVote,
                        creator: pollDetailsRaw.creator,
                        rewardsEnabled: pollDetailsRaw.rewardsEnabled,
                        rewardType: pollDetailsRaw.rewardType,
                        rewardToken: pollDetailsRaw.rewardToken,
                        votingRequirement: pollDetailsRaw.votingRequirement,
                        requiredTokenAddress: pollDetailsRaw.requiredTokenAddress,
                        requiredMinTokenAmount: pollDetailsRaw.requiredMinTokenAmount,
                        targetVoterCount: pollDetailsRaw.targetVoterCount,
                        // Add any other potentially missing fields from Poll type with defaults
                        permanentlyClosed: pollDetailsRaw.permanentlyClosed || false,
                        isDataCleaned: pollDetailsRaw.isDataCleaned || false,
                        fundsWithdrawn: pollDetailsRaw.fundsWithdrawn || false,
                        ended: pollDetailsRaw.ended || false, // Assuming getPollDetails calculates this
                        // Make sure all required fields in Poll type are present
                    };
                    // --- END: Type Conversion and ID Addition ---
                    
                    // ... (optional cache logic) ...

                    return pollData; // Return the correctly typed Poll object
                
                } catch (err) {
                    console.error(`[fetchCreatedPollsData] Failed to fetch poll details (ID: ${pollId}):`, err);
                    return null; 
                }
            });

            const results = await Promise.all(pollDetailPromises);
            // Filter out null results and the type assertion should now be safe
            const validPolls = (results.filter(Boolean) as Poll[]).sort((a, b) => b.id - a.id);
            setCreatedPolls(validPolls);

        } catch (err: any) {
            console.error("[fetchCreatedPollsData] Failed to load created polls (General Error):", err);
            setCreatedPollsError(`An error occurred while loading created polls: ${err.message}`);
            setCreatedPolls([]); // Clear polls on error
        } finally {
            setIsLoadingCreatedPolls(false);
        }
    }, [pollContract, web3, userAddress]);


    const fetchVotedPollsData = useCallback(async () => {
        if (!pollContract || !userAddress) return;
        setIsLoadingVotedPolls(true);
        setVotedPollsError(null); // Clear previous voted polls error
        try {
             // Kontrattan direkt olarak oy geçmişini çek
             // Dönüş tipini daha belirgin hale getir
            type VotingHistoryResult = {
                 0: string[]; // pollIds (genellikle bigint döner, string'e çevrilir)
                 1: string[]; // optionIds (genellikle bigint döner, string'e çevrilir)
                 2: string[]; // questions
                 3: string[]; // options
                 pollIds: string[]; // İsimlendirilmiş erişim için (bazı web3 versiyonları destekler)
                 optionIds: string[];
                 questions: string[];
                 options: string[];
             };
            const historyResult: VotingHistoryResult = await pollContract.methods.getUserVotingHistory(userAddress).call();

            // İndeks veya isimle erişimi dene (güvenli)
            const pollIds = historyResult[0] ?? historyResult.pollIds;
            const optionIds = historyResult[1] ?? historyResult.optionIds;
            const questions = historyResult[2] ?? historyResult.questions;
            const options = historyResult[3] ?? historyResult.options;


            if (!Array.isArray(pollIds) || !Array.isArray(optionIds) || !Array.isArray(questions) || !Array.isArray(options)) {
                 console.error("getUserVotingHistory did not return the expected array structure:", historyResult);
                 throw new Error("Voting history data could not be retrieved.");
            }

            const votedInfo: VotedPollInfo[] = pollIds.map((id: string, index: number) => ({ // Tipi string olarak al
                pollId: Number(id), // Number'a çevir
                optionId: Number(optionIds[index]), // Number'a çevir
                question: questions[index] || "Question Unavailable", // Fallback
                optionText: options[index] || "Option Unavailable" // Fallback
            }));

            // En son oylananlar üstte olacak şekilde ters çevir
            setVotedPollsInfo(votedInfo.reverse());
        } catch (err: any) {
            console.error("Failed to load voted polls:", err);
            setVotedPollsError(`An error occurred while loading voting history: ${err.message}`);
            setVotedPollsInfo([]); // Clear voted info on error
        } finally {
            setIsLoadingVotedPolls(false);
        }
    }, [pollContract, userAddress]);

    // --- Effects (Güncellenmiş Hata Yönetimi) ---
    useEffect(() => {
        if (userAddress && web3) {
            // Fetch all data
            fetchProfile();
            fetchFollowStats();
            fetchCreatedPollsData();
            fetchVotedPollsData();
        } else if (!userAddress) {
            setProfileError("User address prop not provided.");
            setIsLoadingProfile(false);
            setIsLoadingFollowStats(false);
            setIsLoadingCreatedPolls(false);
            setIsLoadingVotedPolls(false);
        }
    // fetchProfile, fetchFollowStats etc. are stable due to useCallback, added as deps
    }, [userAddress, web3, fetchProfile, fetchFollowStats, fetchCreatedPollsData, fetchVotedPollsData]);


    // --- Handlers (Aynı kalabilir) ---
      const handleFollowToggle = async () => {
        if (!followerSystemContract || !viewerAddress || !userAddress || isFollowProcessing || viewerAddress.toLowerCase() === userAddress.toLowerCase()) return;
        setIsFollowProcessing(true);
        const originalFollowingState = isFollowingViewer; // Hata durumunda geri almak için
        try {
            if (isFollowingViewer) {
                 // İyimser güncelleme
                setIsFollowingViewer(false);
                setFollowerCount(prev => Math.max(0, prev - 1));
                await followerSystemContract.methods.unfollow(userAddress).send({ from: viewerAddress });
            } else {
                 // İyimser güncelleme
                setIsFollowingViewer(true);
                setFollowerCount(prev => prev + 1);
                await followerSystemContract.methods.follow(userAddress).send({ from: viewerAddress });
            }
            // No need to refetch stats on success (optimistic update is sufficient)
        } catch (err) {
            console.error("Failed to follow/unfollow:", err);
             // Revert optimistic update on error and refetch state
            setIsFollowingViewer(originalFollowingState);
            await fetchFollowStats(); 
        } finally {
            setIsFollowProcessing(false);
        }
    };

    // --- Render Functions (Güncellenmiş Hata/Loading Durumları) ---
    const renderProfileHeader = () => {
        // Background image varsa stili değiştir
        const hasBackgroundImage = profileData?.backgroundImage && profileData.backgroundImage.length > 0;
        const backgroundImageUrl = hasBackgroundImage && profileData?.backgroundImage ? profileData.backgroundImage[0] : undefined;
        
        const headerStyle = backgroundImageUrl 
            ? { 
                backgroundImage: `linear-gradient(rgba(255, 240, 247, 0.85), rgba(232, 245, 255, 0.85)), url('${backgroundImageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } 
            : {};
            
        return (
            <div 
                className="bg-gradient-to-r from-[#FFF0F7] to-[#E8F5FF] p-4 rounded-lg border border-[#FFDAE9] mb-6 shadow-sm relative"
                style={headerStyle}
            >
                {/* Kapatma Butonu (Eğer modal ise onClose'u çağır, değilse router.back()) */}
                <button
                    onClick={isModal ? onClose : () => router.back()}
                    className="absolute top-3 right-3 text-[#8F0C4C] hover:text-[#ED1169] transition-colors p-1 rounded-full hover:bg-[#FFE2EA]/50 focus:outline-none focus:ring-2 focus:ring-[#FF9FBD]"
                    title={isModal ? "Close" : "Back"}
                >
                    {isModal ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    )}
                </button>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start">
                    <img
                        src={profileData?.image || '/default-avatar.png'}
                        alt={profileData?.name || 'Profile Picture'}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 object-cover"
                    />
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-2xl md:text-3xl font-bold text-[#500126] break-words">
                            {profileData?.name || 'Anonymous User'}
                        </h1>
                        <p className="text-sm text-[#8F0C4C] break-all mt-1 mb-1 font-mono hover:text-[#ED1169] transition-colors">
                            <a href={`https://universalprofile.cloud/${userAddress}`} target="_blank" rel="noopener noreferrer" title="View on Universal Profile">
                                {userAddress}
                            </a>
                        </p>
                        
                        {/* Description eklendi */}
                        {profileData?.description && (
                            <p className="text-sm text-gray-700 mb-2 mt-1 max-w-sm">
                                {profileData.description}
                            </p>
                        )}
                        
                        {/* Tags eklendi */}
                        {profileData?.tags && profileData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {profileData.tags.map((tag, index) => (
                                    <span 
                                        key={`tag-${index}`}
                                        className="px-2 py-0.5 bg-[#FFE2EA] text-[#8F0C4C] rounded-full text-xs"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        
                        {/* Sosyal medya linkleri */}
                        {profileData?.links && profileData.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {profileData.links.map((link, index) => (
                                    <a
                                        key={`link-${index}`}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-white text-[#005A9C] border border-[#B3D9FF] hover:bg-[#E8F5FF] transition-colors"
                                    >
                                        <span className="mr-1">🔗</span>
                                        {link.title}
                                    </a>
                                ))}
                            </div>
                        )}
                        
                        <div className="flex justify-center sm:justify-start space-x-4 text-sm text-[#C8085A] mb-2">
                            {/* Show follow stats error if exists */} 
                            {followStatsError ? (
                                <span className="text-red-600 text-xs">{followStatsError}</span>
                            ) : isLoadingFollowStats ? (
                                <span className="animate-pulse text-xs">Loading stats...</span>
                            ) : (
                                <>
                                    <span><strong className="font-semibold">{followerCount}</strong> Followers</span>
                                    <span><strong className="font-semibold">{followingCount}</strong> Following</span>
                                </>
                            )}
                        </div>
                    </div>
                    {viewerAddress && userAddress && viewerAddress.toLowerCase() !== userAddress.toLowerCase() && (
                        <button
                            onClick={handleFollowToggle}
                            disabled={isLoadingFollowStats || isFollowProcessing}
                            className={`mt-4 sm:mt-0 sm:ml-auto px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex-shrink-0 transform active:scale-95 ${
                                isFollowingViewer
                                    ? 'bg-[#FFD4E5] text-[#8F0C4C] border border-[#FFB0C8] hover:bg-[#FFC4D9] shadow-sm hover:shadow-md'
                                    : 'bg-[#E8F5FF] text-[#005A9C] border border-[#B3D9FF] hover:bg-[#D9EBFF] shadow-sm hover:shadow-md'
                            } ${isLoadingFollowStats || isFollowProcessing ? 'opacity-60 cursor-wait animate-pulse' : ''}`}
                        >
                            {isFollowProcessing ? 'Processing...' : isFollowingViewer ? 'Unfollow' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Oluşturulan ve Oy verilen anket kartları render fonksiyonları (page.tsx'den aynı)
    const renderPollCard = (poll: Poll) => {
        const now = new Date();
        const endTimeDate = new Date(poll.endTime);
        const isActiveReal = poll.isActive && endTimeDate > now;
        const timeString = isActiveReal 
                    ? `${formatDistanceToNowStrict(endTimeDate, { locale: enUS, addSuffix: true })}`
                    : `Ended on ${endTimeDate.toLocaleDateString('en-US')}`;

        return (
             <Link href={`/poll/${poll.id}`} key={`created-${poll.id}`} className="block border border-[#FFCADB]/80 rounded-lg p-3 shadow-sm bg-white hover:shadow-lg hover:border-[#FF9FBD] transition-all duration-200 ease-in-out transform hover:-translate-y-1">
                 <div className="flex justify-between items-center mb-1">
                     <h4 className="text-sm font-semibold text-[#500126] break-words line-clamp-2">{poll.question}</h4>
                     <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isActiveReal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                         {isActiveReal ? 'Active' : 'Ended'}
                     </span>
                 </div>
                 <p className="text-xs text-gray-500 mb-1">{timeString}</p>
                 <p className="text-xs text-[#8F0C4C]">{poll.totalVotes} votes</p>
             </Link>
        );
    };

    const renderVotedPollCard = (votedInfo: VotedPollInfo) => (
        <Link href={`/poll/${votedInfo.pollId}`} key={`voted-${votedInfo.pollId}`} className="block border border-[#D9EBFF]/80 rounded-lg p-3 shadow-sm bg-white hover:shadow-lg hover:border-[#B3D9FF] transition-all duration-200 ease-in-out transform hover:-translate-y-1">
           <h4 className="text-sm font-semibold text-[#003E75] mb-1 break-words line-clamp-2">{votedInfo.question}</h4>
           <p className="text-xs text-gray-500">Your vote: <span className="font-medium text-[#005A9C]">{votedInfo.optionText}</span></p>
       </Link>
    );

    // --- Ana JSX Yapısı (Güncellenmiş Ana Hata/Loading Mantığı) ---
    // 1. Handle Profile Loading State
     if (isLoadingProfile) {
        return <div className="p-6 text-center text-[#ED1169] animate-pulse text-lg">Loading Profile...</div>;
    }

    // 2. Handle Profile Error State (Only if profile failed to load)
    if (profileError && !profileData) {
        return (
             <div className="p-6 mx-auto max-w-lg"> 
                 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">
                     <strong className="font-bold">Profile Error!</strong>
                     <span className="block sm:inline"> {profileError}</span>
                 </div>
             </div>
        );
    }

    // 3. Handle Profile Not Found State (No error, but no data)
     if (!profileData && !isLoadingProfile && !profileError) {
         return (
             <div className="p-6 mx-auto max-w-lg">
                 <div className="bg-gradient-to-r from-[#FFF0F7] to-[#E8F5FF] p-6 rounded-lg border border-[#FFDAE9] shadow-md text-center">
                     <img src="/default-avatar.png" alt="Profile Not Found" className="w-20 h-20 rounded-full border-4 border-white shadow-lg mb-4 mx-auto"/>
                     <h1 className="text-lg font-bold text-[#500126] mb-2">Profile Not Found</h1>
                     <p className="text-xs text-[#8F0C4C] break-all font-mono mb-3">{userAddress}</p>
                     <p className="text-gray-600 text-sm">A LUKSO profile could not be found for this address.</p>
                 </div>
             </div>
         );
     }

    // 4. Profile Loaded - Render Header and Tabs
    return (
         // Ana div'de padding'ler kaldırıldı, modal'da yönetilecek
         // min-h-screen de modal için gereksiz
        <div className="bg-[#FFF8FA]">
            {renderProfileHeader()}

            {/* Sekmeler */}
            <div className="mb-6 border-b border-[#FF9FBD]">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-px px-4" aria-label="Tabs"> {/* Sekmelere padding eklendi */}
                    <button
                        onClick={() => setActiveTab('created')}
                        className={`whitespace-nowrap pb-3 pt-1 px-3 sm:px-4 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-150 ${
                            activeTab === 'created'
                                ? 'border-[#ED1169] text-[#8F0C4C]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Created Polls {isLoadingCreatedPolls ? '...' : `(${createdPolls.length})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('voted')}
                        className={`whitespace-nowrap pb-3 pt-1 px-3 sm:px-4 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-150 ${
                            activeTab === 'voted'
                                ? 'border-[#ED1169] text-[#8F0C4C]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Voted Polls {isLoadingVotedPolls ? '...' : `(${votedPollsInfo.length})`}
                    </button>
                </nav>
            </div>

            {/* Sekme İçeriği */}
             {/* Padding eklendi */}
            <div className="min-h-[250px] px-4 pb-4">
                {activeTab === 'created' && (
                    <div>
                        {/* Show created polls error inside the tab */} 
                        {createdPollsError ? (
                            <p className="text-center text-red-600 mt-6 py-8 bg-red-50/50 rounded-lg text-sm">{createdPollsError}</p>
                        ) : isLoadingCreatedPolls ? (
                            <p className="text-center text-[#ED1169] animate-pulse py-10">Loading Polls...</p>
                        ) : createdPolls.length === 0 ? (
                            <p className="text-center text-[#8F0C4C] mt-6 py-8 bg-white/50 rounded-lg text-sm">No active or recently ended polls found created by this user.</p>
                        ) : (
                             // Modal içinde daha az sütun olabilir
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {createdPolls.map(renderPollCard)}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'voted' && (
                    <div>
                        {/* Show voted polls error inside the tab */} 
                        {votedPollsError ? (
                            <p className="text-center text-red-600 mt-6 py-8 bg-red-50/50 rounded-lg text-sm">{votedPollsError}</p>
                        ) : isLoadingVotedPolls ? (
                            <p className="text-center text-[#ED1169] animate-pulse py-10">Loading Voted Polls...</p>
                        ) : votedPollsInfo.length === 0 ? (
                            <p className="text-center text-[#8F0C4C] mt-6 py-8 bg-white/50 rounded-lg text-sm">No voted polls found for this user.</p>
                        ) : (
                            <div className="space-y-3">
                                {votedPollsInfo.map(renderVotedPollCard)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileView; 