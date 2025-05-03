"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Web3 from 'web3';
import { useUP } from '@/context/UPContext';
import Modal from './Modal';
import PollDetailModal from './PollDetailModal';
import { LSP3ProfileManager } from '@/hooks/useLSP3Profile';
import { formatDistanceToNowStrict } from 'date-fns';
import { enUS } from 'date-fns/locale'; // Import English locale
import { ERC725 } from '@erc725/erc725.js';
import lsp4Schema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import { 
    getCachedMetadataAll, setCachedMetadata, getCachedMetadata,
    getCachedProfileAll, setCachedProfile, getCachedProfile,
    getCachedPollStaticDetails, setCachedPollStaticDetails
} from '@/utils/localStorageCache'; // Cache utility functions
import Link from 'next/link';
import ProfileModal from './ProfileModal'; // Import the profile modal component
import Image from 'next/image';
import { RewardType } from '@/types'; // Import RewardType enum from types.ts

// Import VotingRequirementType enum and helper functions
import { VotingRequirementType, VotingRequirementHelper } from '@/utils/voting-requirements';

// Interface for Poll data structure
interface Poll {
  id: number;
  question: string;
  description: string;
  options: string[];
  startTime: number; // Unix timestamp (seconds)
  endTime: number;   // Unix timestamp (seconds)
  isActive: boolean;
  totalVotes: number;
  rewardPerVote: string; // Amount in Wei (as string)
  creator: string;
  rewardsEnabled: boolean;
  rewardType: RewardType;
  rewardToken: string; // Token address or address(0)
  votingRequirement: VotingRequirementType;
  requiredTokenAddress: string; // Token/NFT address or address(0)
  requiredMinTokenAmount: string; // Amount in Wei (as string)
  targetVoterCount: number;
  creatorProfile?: { name: string; image: string } | null;
  requiredAssetMetadata?: AssetMetadata | null;
  // Fields for eligibility checks and UI state management
  isCheckingVote?: boolean;
  hasVotedCheck?: boolean | null;
  isCheckingFollow?: boolean;
  isFollowingCreator?: boolean | null;
  isCheckingToken?: boolean;
  hasEnoughTokens?: boolean | null;
  isCheckingNft?: boolean;
  hasNFT?: boolean | null;
  canVoteOverall?: boolean | null; // Overall voting eligibility status
}

// Interface for Asset Metadata (name, symbol, icon, decimals)
interface AssetMetadata {
    name: string;
    symbol?: string;
    decimals?: number;
  iconUrl: string | null;
}

// Default IPFS Gateway URL used for resolving ipfs:// URLs
const DEFAULT_IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';

// Interface for basic Profile Data used within this component
interface ProfileData { name: string; image: string; }

// Props definition for the PollListModal component
interface PollListModalProps {
  onClose: () => void;
  onPollSelect: (pollId: number) => void;
}

// Types for poll filtering tabs
type PollFilterType = 'active' | 'ended' | 'rewarded' | 'following' | 'canVote' | 'cannotVote' | 'voted' | 'all';

// LSP26 Follower System contract address and ABI
const FOLLOWER_SYSTEM_ADDRESS = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA";
const FOLLOWER_SYSTEM_ABI = [{"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getFollowsByIndex","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"}, {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"followingCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}, {"inputs":[{"internalType":"address","name":"follower","type":"address"},{"internalType":"address","name":"addr","type":"address"}],"name":"isFollowing","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]; 

const ERC721_LIKE_ABI = [{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function"}]; // LSP7 & LSP8 için balanceOf
// Minimal ABI for the main Poll Contract (used for hasVoted checks)
const POLL_CONTRACT_ABI_MINIMAL = [{"inputs":[{"internalType":"uint256","name":"_pollId","type":"uint256"},{"internalType":"address","name":"_voter","type":"address"}],"name":"hasVoted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];

// Minimal ABI for LSP7 Decimals function
const LSP7_DECIMALS_ABI = [{
    "inputs": [],
    "name": "decimals",
    "outputs": [
        {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}];

const PollListModal: React.FC<PollListModalProps> = ({ onClose, onPollSelect }) => {
  // Hooks for context, state management
  const { web3, contract: pollContract, upProvider, address } = useUP();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true); // General loading state for initial poll list
  const [error, setError] = useState<string | null>(null); // General error state for loading polls
  const [selectedPoll, setSelectedPoll] = useState<number | null>(null); // ID of the poll selected for detail view
  const [activeTab, setActiveTab] = useState<PollFilterType>('active'); // Current active filter tab
  
  // State for caching token metadata (address -> metadata)
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Record<string, AssetMetadata | null>>({});
  // State for caching creator profiles (address -> profile)
  const [creatorProfileCache, setCreatorProfileCache] = useState<Record<string, ProfileData | null>>({});
  // State for storing the list of addresses the viewer is currently following
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState<boolean>(false); // Loading state for fetching following list

  // State for various eligibility check caches (improves performance by avoiding repeated checks)
  const [followStatusCache, setFollowStatusCache] = useState<Record<string, boolean | null>>({}); // key: viewerAddr-creatorAddr
  const [tokenBalanceCache, setTokenBalanceCache] = useState<Record<string, boolean | null>>({}); // key: pollId-tokenAddr
  const [nftBalanceCache, setNftBalanceCache] = useState<Record<string, boolean | null>>({});    // key: pollId-nftAddr
  const [hasVotedCache, setHasVotedCache] = useState<Record<number, boolean | null>>({});      // key: pollId

  // State to track visited (clicked) poll IDs for UI styling (e.g., dimming visited polls)
  const [visitedPollIds, setVisitedPollIds] = useState<Set<number>>(new Set());

  // State for managing the profile modal visibility and the address to display
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);

  // Effect to load initial caches from local storage on component mount
  useEffect(() => {
    const initialMetadata = getCachedMetadataAll();
    setTokenMetadataCache(initialMetadata);
    const initialProfiles = getCachedProfileAll();
    setCreatorProfileCache(initialProfiles);
  }, []);

  // --- Data Fetching Callbacks (useCallback for memoization) ---

  // Callback to fetch creator profile data (uses state cache, then local storage, then RPC)
  const fetchCreatorProfile = useCallback(async (creatorAddress: string): Promise<ProfileData | null> => {
    if (!upProvider || !creatorAddress) return null;
    const lowerCaseAddress = creatorAddress.toLowerCase();
    
    // 1. Check state cache first
    if (creatorProfileCache[lowerCaseAddress] !== undefined) {
        return creatorProfileCache[lowerCaseAddress];
    }

    // 2. Check local storage cache
    const cached = getCachedProfile(lowerCaseAddress);
    if(cached !== undefined) {
        setCreatorProfileCache(prev => ({ ...prev, [lowerCaseAddress]: cached })); // Update state from storage
        return cached;
    }

    // 3. Fetch from RPC if not in cache
    try {
      const lsp3Manager = new LSP3ProfileManager(upProvider);
      const profileData = await lsp3Manager.getProfileData(creatorAddress);
      let profileInfo: ProfileData | null = null;
      if (profileData) {
         let imageUrl = '/default-avatar.png'; 
         const imageMetadata = profileData.profileImage; // Extract profile image data

         // Determine the image URL from various possible formats
         if (Array.isArray(imageMetadata) && imageMetadata.length > 0) {
             const firstImage = imageMetadata[0];
             if (typeof firstImage === 'object' && firstImage !== null && 'url' in firstImage && typeof (firstImage as any).url === 'string') {
                 imageUrl = (firstImage as any).url;
             } else if (typeof firstImage === 'string') {
                 imageUrl = firstImage;
             }
         } else if (typeof imageMetadata === 'string') {
             imageUrl = imageMetadata;
         }

         profileInfo = {
              name: profileData.name || `User ${creatorAddress.substring(0,6)}...`,
              image: imageUrl 
          };
          
          // Format IPFS URL to use the gateway
          if (profileInfo.image.startsWith('ipfs://')) {
             profileInfo.image = `${DEFAULT_IPFS_GATEWAY}${profileInfo.image.substring(7)}`;
           } else if (!profileInfo.image.startsWith('http') && profileInfo.image !== '/default-avatar.png') {
             // Assume it's just the hash if not http/https/default
             profileInfo.image = `${DEFAULT_IPFS_GATEWAY}${profileInfo.image}`;
           } 
           // Otherwise (http, https, default), keep as is
      }
      
      // 4. Update state cache and local storage with fetched data (or null)
      setCreatorProfileCache(prev => ({ ...prev, [lowerCaseAddress]: profileInfo }));
      setCachedProfile(lowerCaseAddress, profileInfo);
      return profileInfo;
    } catch (err) {
      console.warn(`Failed to fetch profile ${creatorAddress}:`, err);
      setCreatorProfileCache(prev => ({ ...prev, [lowerCaseAddress]: null })); // Cache null on error
      setCachedProfile(lowerCaseAddress, null);
      return null;
    }
  }, [upProvider, creatorProfileCache]); // Depend on provider and state cache

  // Callback to fetch LSP4 asset metadata (uses state cache, then local storage, then RPC)
  const fetchMetadataForAddress = useCallback(async (assetAddress: string): Promise<AssetMetadata | null> => {
    if (!assetAddress || assetAddress === '0x0000000000000000000000000000000000000000') return null;
    const lowerCaseAddress = assetAddress.toLowerCase();

    // 1. Check state cache
    if (tokenMetadataCache[lowerCaseAddress] !== undefined) {
         return tokenMetadataCache[lowerCaseAddress];
    }

    // 2. Check local storage cache
    const cached = getCachedMetadata(lowerCaseAddress);
    // Ensure cached data includes decimals, otherwise refetch
    if(cached !== undefined && cached.decimals !== undefined) { 
        setTokenMetadataCache(prev => ({ ...prev, [lowerCaseAddress]: cached })); 
        return cached;
    }

    // 3. Fetch from RPC
    if (!web3?.currentProvider) {
      console.warn('fetchMetadataForAddress: Web3 provider not available');
      return null;
    }
    try {
      const erc725js = new ERC725(lsp4Schema as any, assetAddress, web3.currentProvider, { ipfsGateway: DEFAULT_IPFS_GATEWAY });
      // Fetch name, symbol, and metadata
      const fetchedData = await erc725js.fetchData(['LSP4TokenName', 'LSP4TokenSymbol', 'LSP4Metadata']); 
      let name = 'Unknown Asset';
      let symbol = '???'; 
      let iconUrl = null;
      let decimals = 18; // Default to 18 decimals

      // Fetch decimals separately using specific LSP7 call
      try {
          const tokenContract = new web3.eth.Contract(LSP7_DECIMALS_ABI as any, assetAddress);
          const decimalsResult = await tokenContract.methods.decimals().call();
          decimals = Number(decimalsResult); // Convert uint8 result to number
      } catch (decError) {
          console.warn(`Could not fetch decimals for ${assetAddress}, defaulting to 18:`, decError);
          // Keep default 18 if decimals call fails
      }

      // Extract token name
      const nameData = fetchedData.find(d => d.name === 'LSP4TokenName');
      if (nameData && typeof nameData.value === 'string') {
        name = nameData.value;
      }
      
      // Extract token symbol 
      const symbolData = fetchedData.find(d => d.name === 'LSP4TokenSymbol'); 
      if (symbolData && typeof symbolData.value === 'string') { 
        symbol = symbolData.value; 
      }
      
      // Extract icon URL from complex metadata structure
      const metadataData = fetchedData.find(d => d.name === 'LSP4Metadata');
      if (metadataData?.value && typeof metadataData.value === 'object') {
        const value = metadataData.value as any; 
        const metadataValue = value?.LSP4Metadata;
        let rawIconUrl = null;
        if (metadataValue?.icon) {
            if(Array.isArray(metadataValue.icon) && metadataValue.icon.length > 0) {
                 const firstIcon = metadataValue.icon[0];
                 rawIconUrl = firstIcon?.url || (typeof firstIcon === 'string' ? firstIcon : null);
            } else if (typeof metadataValue.icon === 'string') {
                rawIconUrl = metadataValue.icon;
            }
        }
        if (!rawIconUrl && metadataValue?.images && Array.isArray(metadataValue.images) && metadataValue.images.length > 0) {
            const firstImageSet = metadataValue.images[0];
            if(Array.isArray(firstImageSet) && firstImageSet.length > 0) {
                 const firstImage = firstImageSet[0];
                 rawIconUrl = firstImage?.url || (typeof firstImage === 'string' ? firstImage : null);
            }
        }
        if (rawIconUrl && typeof rawIconUrl === 'string') {
            if (rawIconUrl.startsWith('ipfs://')) {
               iconUrl = `${DEFAULT_IPFS_GATEWAY}${rawIconUrl.substring(7)}`;
            } else if (!rawIconUrl.startsWith('http')) {
               iconUrl = `${DEFAULT_IPFS_GATEWAY}${rawIconUrl}`;
            } else {
              iconUrl = rawIconUrl; 
            }
        }
      }
      
      const newMetadata: AssetMetadata = { name, symbol, decimals, iconUrl }; // <-- Add decimals to object

      // 4. Update state cache and local storage
      setTokenMetadataCache(prevCache => ({ ...prevCache, [lowerCaseAddress]: newMetadata }));
      setCachedMetadata(lowerCaseAddress, newMetadata);
      return newMetadata;

    } catch (error: any) {
      console.warn(`Failed to fetch asset (${assetAddress}) metadata:`, error);
      setTokenMetadataCache(prevCache => ({ ...prevCache, [lowerCaseAddress]: null })); 
      setCachedMetadata(lowerCaseAddress, null);
      return null;
    }
  }, [web3, tokenMetadataCache]); // Depend on provider and state cache
  
  // Effect to fetch the list of accounts the current user follows
  // Runs when the connected address or web3 instance changes
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!address || !web3) {
        setFollowingList([]); // Clear list if address is missing
        return;
      }
      setIsLoadingFollowing(true);
      try {
        const followerContract = new web3.eth.Contract(FOLLOWER_SYSTEM_ABI as any, FOLLOWER_SYSTEM_ADDRESS);
        const count = await followerContract.methods.followingCount(address).call();
        const followingCount = Number(count);
        
        if (followingCount > 0) {
          // Fetch up to 200 followed addresses (adjust limit if needed)
          const endIndex = Math.min(followingCount, 200);
          const followsResult = await followerContract.methods.getFollowsByIndex(address, 0, endIndex).call();
          
          // Ensure the result is an array and convert addresses to lowercase for consistency
          if (Array.isArray(followsResult)) {
             setFollowingList(followsResult.map((addr: string) => addr.toLowerCase()));
          } else {
             console.warn('getFollowsByIndex did not return the expected array format:', followsResult);
             setFollowingList([]);
          }
        } else {
          setFollowingList([]); // No one followed
        }
      } catch (err) {
        console.error("Failed to fetch following list:", err);
        setFollowingList([]); // Clear list on error
      } finally {
        setIsLoadingFollowing(false);
      }
    };

    fetchFollowing();
  }, [address, web3]);

  // Callback to check follow status between viewer and a creator (with caching)
  const checkFollowStatus = useCallback(async (creatorAddress: string): Promise<boolean | null> => {
    if (!address || !web3 || !creatorAddress) return null;
    const cacheKey = `${address}-${creatorAddress}`.toLowerCase();
    if (followStatusCache[cacheKey] !== undefined) return followStatusCache[cacheKey];

    try {
      const followerContract = new web3.eth.Contract(FOLLOWER_SYSTEM_ABI as any, FOLLOWER_SYSTEM_ADDRESS);
      const isFollowingResult = await followerContract.methods.isFollowing(address, creatorAddress).call();
      const isFollowing = Boolean(isFollowingResult);
      setFollowStatusCache(prev => ({ ...prev, [cacheKey]: isFollowing })); // Update cache
      return isFollowing;
    } catch (err) {
      console.warn(`Failed to check follow status for ${creatorAddress}:`, err);
      setFollowStatusCache(prev => ({ ...prev, [cacheKey]: null })); // Cache null on error
      return null;
    }
  }, [address, web3, followStatusCache]); // Depend on address, web3, and cache

  // Callback to check LSP7 token balance for a poll requirement (with caching)
  const checkTokenBalance = useCallback(async (pollId: number, tokenAddress: string, minAmount: string): Promise<boolean | null> => {
    if (!address || !web3 || !tokenAddress || minAmount === '0') return null;
    const cacheKey = `${pollId}-${tokenAddress}`.toLowerCase();
    if (tokenBalanceCache[cacheKey] !== undefined) return tokenBalanceCache[cacheKey];

    try {
      const tokenContract = new web3.eth.Contract(ERC721_LIKE_ABI as any, tokenAddress);
      const balanceResult: unknown = await tokenContract.methods.balanceOf(address).call();
      // Validate balance result before conversion
      if (balanceResult === null || balanceResult === undefined) {
        throw new Error('Invalid balance result received from contract');
      }
      const balanceString = String(balanceResult);
      const hasEnough = BigInt(balanceString) >= BigInt(minAmount);
      setTokenBalanceCache(prev => ({ ...prev, [cacheKey]: hasEnough })); // Update cache
      return hasEnough;
    } catch (err) {
      console.warn(`Failed to check token (${tokenAddress}) balance:`, err);
      setTokenBalanceCache(prev => ({ ...prev, [cacheKey]: null })); // Cache null on error
      return null;
    }
  }, [address, web3, tokenBalanceCache]); // Depend on address, web3, and cache

  // Callback to check LSP8 NFT balance for a poll requirement (with caching)
  const checkNftBalance = useCallback(async (pollId: number, nftAddress: string): Promise<boolean | null> => {
    if (!address || !web3 || !nftAddress) return null;
    const cacheKey = `${pollId}-${nftAddress}`.toLowerCase();
    if (nftBalanceCache[cacheKey] !== undefined) return nftBalanceCache[cacheKey];

    try {
      const nftContract = new web3.eth.Contract(ERC721_LIKE_ABI as any, nftAddress);
      const balanceResult: unknown = await nftContract.methods.balanceOf(address).call();
      // Validate balance result
       if (balanceResult === null || balanceResult === undefined) {
        throw new Error('Invalid NFT balance result received from contract');
      }
      const balanceString = String(balanceResult);
      const hasNFT = BigInt(balanceString) > 0n; // Check if balance is greater than 0
      setNftBalanceCache(prev => ({ ...prev, [cacheKey]: hasNFT })); // Update cache
      return hasNFT;
    } catch (err) {
      console.warn(`Failed to check NFT (${nftAddress}) ownership:`, err);
      setNftBalanceCache(prev => ({ ...prev, [cacheKey]: null })); // Cache null on error
      return null;
    }
  }, [address, web3, nftBalanceCache]); // Depend on address, web3, and cache

  // Callback to check if the current user has voted on a specific poll (with caching)
  const checkHasVoted = useCallback(async (pollId: number): Promise<boolean | null> => {
    if (!address || !pollContract || !web3) return null;
    if (hasVotedCache[pollId] !== undefined) return hasVotedCache[pollId];

    try {
      // Use minimal ABI contract for this specific check
      const minimalContract = new web3.eth.Contract(POLL_CONTRACT_ABI_MINIMAL as any, pollContract.options.address);
      const votedResult = await minimalContract.methods.hasVoted(pollId, address).call();
      const voted = Boolean(votedResult);
      setHasVotedCache(prev => ({ ...prev, [pollId]: voted })); // Update cache
      return voted;
    } catch (err) {
      console.warn(`Failed to check vote status for poll #${pollId}:`, err);
      setHasVotedCache(prev => ({ ...prev, [pollId]: null })); // Cache null on error
      return null;
    }
  }, [address, pollContract, web3, hasVotedCache]); // Depend on address, contract, web3, and cache

  // loadPollsAndEligibility fonksiyonunu useCallback içine alıyorum
  const loadPollsAndEligibility = useCallback(async () => {
      if (!pollContract || !web3) { 
        setError("Web3 connection or contract not found.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        let pollCount = 0;
        try {
          // Fetch the total number of polls
          const pollCountResult = await pollContract.methods.pollCount().call();
          pollCount = Number(pollCountResult);
        } catch (countErr) {
          console.warn('Failed to fetch pollCount:', countErr);
          setError('Could not fetch poll count.');
          setIsLoading(false);
          return;
        }

        if (pollCount === 0) {
             setPolls([]); // No polls to show
             setIsLoading(false);
             return;
        }
        
        const pollPromises: Promise<Poll | null>[] = [];
        // Fetch latest ~20 polls for performance (adjust as needed)
        const startId = Math.max(0, pollCount - 20);
        for (let i = pollCount - 1; i >= startId; i--) {
          pollPromises.push(
            // Use an async IIFE to handle async operations within the loop safely
            (async () => {
                try {
                    // 1. Try to get static poll data from cache
                    const cachedStaticData = getCachedPollStaticDetails(i);
                    let details: any; // Data from contract or cache
                    let pollData: Poll | null = null;

                    if (cachedStaticData) {
                        // Cache hit: Fetch only dynamic data (status, votes) later if needed
                        // FOR NOW: Still call getPollDetails to get dynamic parts
                        // FUTURE OPTIMIZATION: Use a lighter contract call like getPollStatus
                        details = await pollContract.methods.getPollDetails(i).call(); 
                        // Combine cached static data with live dynamic data
                        pollData = {
                            id: i,
                            question: cachedStaticData.question,
                            description: cachedStaticData.description,
                            options: [], // Options fetched separately or not needed in list view?
                            startTime: cachedStaticData.startTime,
                            creator: cachedStaticData.creator,
                            rewardsEnabled: cachedStaticData.rewardsEnabled,
                            rewardType: cachedStaticData.rewardType,
                            rewardToken: cachedStaticData.rewardToken,
                            votingRequirement: cachedStaticData.votingRequirement,
                            requiredTokenAddress: cachedStaticData.requiredTokenAddress,
                            requiredMinTokenAmount: cachedStaticData.requiredMinTokenAmount,
                            targetVoterCount: cachedStaticData.targetVoterCount,
                            rewardPerVote: cachedStaticData.rewardPerVote || '0',
                            // Dynamic Fields (from contract call)
                            endTime: Number(details.endTime || 0),
                            isActive: Boolean(details.isActive), 
                            totalVotes: Number(details.totalVotes || 0),
                            // Initial eligibility fields (will be checked later)
                            hasVotedCheck: null, isCheckingVote: false, 
                            isFollowingCreator: null, isCheckingFollow: false,
                            hasEnoughTokens: null, isCheckingToken: false,
                            hasNFT: null, isCheckingNft: false,
                            canVoteOverall: null,
                        };
                    } else {
                        // Cache miss: Fetch all details from contract
                        details = await pollContract.methods.getPollDetails(i).call();
                        
                        // Process timestamps and amounts safely
                        const startTime = Number(details.startTime || 0);
                        const endTime = Number(details.endTime || 0);
                        const requiredTokenAmount = details.requiredTokenAmount?.toString() || '0';
                        const rewardPerVote = details.rewardPerVote?.toString() || '0';
                        const targetVoterCount = Number(details.targetVoterCount || 0);
                        const totalVotes = Number(details.totalVotes || 0);

                        // Extract static data to cache it
                        const staticDataToCache = {
                            question: details.question,
                            description: details.description,
                            startTime: startTime,
                            creator: details.creator,
                            rewardsEnabled: details.rewardsEnabled,
                            rewardType: Number(details.rewardType || 0) as RewardType,
                            rewardToken: details.rewardToken,
                            votingRequirement: Number(details.votingRequirement || 0) as VotingRequirementType,
                            requiredTokenAddress: details.requiredTokenAddress,
                            requiredMinTokenAmount: requiredTokenAmount,
                            targetVoterCount: targetVoterCount,
                            rewardPerVote: rewardPerVote,
                        };
                        setCachedPollStaticDetails(i, staticDataToCache); // Save static data

                        // Construct the poll data object for the state
                        pollData = {
                            id: i,
                            ...staticDataToCache, // Use the cached static data
                            options: [], // Options might be fetched later if needed
                            // Dynamic Fields
                            endTime: endTime,   
                            isActive: Boolean(details.isActive),
                            totalVotes: totalVotes, 
                            // Initial eligibility fields
                            hasVotedCheck: null, isCheckingVote: false,
                            isFollowingCreator: null, isCheckingFollow: false,
                            hasEnoughTokens: null, isCheckingToken: false,
                            hasNFT: null, isCheckingNft: false,
                            canVoteOverall: null,
                        };
                    }

                   // Fetch creator profile and asset metadata (using cached versions)
                    if (pollData && pollData.creator) {
                        pollData.creatorProfile = await fetchCreatorProfile(pollData.creator);
                    }
                    if (pollData && pollData.requiredTokenAddress && pollData.requiredTokenAddress !== '0x0000000000000000000000000000000000000000') {
                         pollData.requiredAssetMetadata = await fetchMetadataForAddress(pollData.requiredTokenAddress);
                    }
                    // Fetch reward token metadata if applicable
                    if (pollData && pollData.rewardsEnabled && pollData.rewardType === RewardType.LSP7 && pollData.rewardToken) {
                         // Check state cache; fetchMetadataForAddress writes to it if needed
                         if(!tokenMetadataCache[pollData.rewardToken.toLowerCase()]){
                             await fetchMetadataForAddress(pollData.rewardToken);
                         }
                    }

                    return pollData;

                } catch (err: any) {
                    console.warn(`Failed to fetch or process details for poll #${i}:`, err);
                    return null; // Return null if fetching failed for this specific poll
                }
            })()
          );
        }
        
        // Wait for all poll detail promises to resolve
        const fetchedPollResults = await Promise.all(pollPromises);
        const validPolls = fetchedPollResults.filter(Boolean) as Poll[]; // Filter out nulls
        
      // İlk olarak verileri ayarla ve yüklemeyi bitir
      const sortedPolls = validPolls.sort((a: Poll, b: Poll) => b.id - a.id); // Sort by ID descending
      setPolls(sortedPolls);
        setIsLoading(false); // Initial poll data loading finished

      // Asenkron olarak uygunluk kontrollerini başlat
      // Bu kontrollerini ana iş akışından ayırıyoruz
      setTimeout(() => {
        checkPollEligibilities(sortedPolls);
      }, 200);

    } catch (err: any) {
      console.error("Error loading polls:", err);
      setError(err.message || "Failed to load polls.");
      setIsLoading(false);
    }
  }, [pollContract, web3, address]); // Bağımlılıkları minimuma indirgiyoruz
  
  // Uygunluk kontrollerini ayrı bir fonksiyona taşıyoruz
  const checkPollEligibilities = async (pollsToCheck: Poll[]) => {
    if (!web3 || !address) return;

        const eligibilityCheckDelay = 50; // ms delay between checks for each poll
    
    for (const poll of pollsToCheck) {
            await new Promise(resolve => setTimeout(resolve, eligibilityCheckDelay));
            
            // Check vote status (always check, use cache)
            if (hasVotedCache[poll.id] === undefined) { // Check cache first
                 setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingVote: true } : p));
        try {
                 const hasVotedResult = await checkHasVoted(poll.id);
          // Güncellemeden önce poll'un hala state'te olduğundan emin olalım
          setPolls(prev => {
            const pollExists = prev.some(p => p.id === poll.id);
            if (!pollExists) return prev; // Poll artık listede yoksa güncelleme yapma
            return prev.map(p => p.id === poll.id ? { ...p, hasVotedCheck: hasVotedResult, isCheckingVote: false } : p);
          });
        } catch (error) {
          console.error(`Error checking vote status for poll ${poll.id}:`, error);
          setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingVote: false } : p));
        }
            } else {
                 // Use cached value, update UI state if it was initially null
                 setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, hasVotedCheck: hasVotedCache[poll.id], isCheckingVote: false } : p));
            }
            
            // Check follower status (if required and not cached)
            if (VotingRequirementHelper.requiresFollower(poll.votingRequirement) && poll.creator) {
                const followCacheKey = `${address}-${poll.creator}`.toLowerCase();
                if (followStatusCache[followCacheKey] === undefined) {
                    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingFollow: true } : p));
          try {
                    const isFollowingResult = await checkFollowStatus(poll.creator);
            setPolls(prev => {
              const pollExists = prev.some(p => p.id === poll.id);
              if (!pollExists) return prev;
              return prev.map(p => p.id === poll.id ? { ...p, isFollowingCreator: isFollowingResult, isCheckingFollow: false } : p);
            });
          } catch (error) {
            console.error(`Error checking follow status for poll ${poll.id}:`, error);
            setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingFollow: false } : p));
          }
                } else {
                     setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isFollowingCreator: followStatusCache[followCacheKey], isCheckingFollow: false } : p));
                }
            }
            
      // Benzer şekilde, diğer kontroller için de hata yakalamayı ekleyerek devam edin...
            // Check token balance (if required and not cached)
            if (VotingRequirementHelper.requiresLSP7(poll.votingRequirement) && poll.requiredTokenAddress) {
                const tokenCacheKey = `${poll.id}-${poll.requiredTokenAddress}`.toLowerCase();
                 if (tokenBalanceCache[tokenCacheKey] === undefined) {
                    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingToken: true } : p));
          try {
                    const hasEnoughTokensResult = await checkTokenBalance(poll.id, poll.requiredTokenAddress, poll.requiredMinTokenAmount);
            setPolls(prev => {
              const pollExists = prev.some(p => p.id === poll.id);
              if (!pollExists) return prev;
              return prev.map(p => p.id === poll.id ? { ...p, hasEnoughTokens: hasEnoughTokensResult, isCheckingToken: false } : p);
            });
          } catch (error) {
            console.error(`Error checking token balance for poll ${poll.id}:`, error);
            setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingToken: false } : p));
          }
                 } else {
                      setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, hasEnoughTokens: tokenBalanceCache[tokenCacheKey], isCheckingToken: false } : p));
                 }
            }
            
            // Check NFT ownership (if required and not cached)
            if (VotingRequirementHelper.requiresLSP8(poll.votingRequirement) && poll.requiredTokenAddress) {
                const nftCacheKey = `${poll.id}-${poll.requiredTokenAddress}`.toLowerCase();
                if (nftBalanceCache[nftCacheKey] === undefined) {
                    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingNft: true } : p));
          try {
                    const hasNftResult = await checkNftBalance(poll.id, poll.requiredTokenAddress);
            setPolls(prev => {
              const pollExists = prev.some(p => p.id === poll.id);
              if (!pollExists) return prev;
              return prev.map(p => p.id === poll.id ? { ...p, hasNFT: hasNftResult, isCheckingNft: false } : p);
            });
          } catch (error) {
            console.error(`Error checking NFT ownership for poll ${poll.id}:`, error);
            setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isCheckingNft: false } : p));
          }
        } else {
                     setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, hasNFT: nftBalanceCache[nftCacheKey], isCheckingNft: false } : p));
                }
            }
    }
  };
  
  // Sade ve basit bir useEffect ile pollsAndEligibility'i çağırıyoruz
  useEffect(() => {
    loadPollsAndEligibility();
  }, [loadPollsAndEligibility]); // Sadece bu callback fonksiyonuna bağımlı

  // --- Helper and Utility Functions ---
  
  const formatTimeLeft = (endTime: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const endsInSeconds = endTime - now;

    if (endsInSeconds <= 0) {
      return "Ended"; 
    }
    
    try {
      return formatDistanceToNowStrict(new Date(endTime * 1000), { addSuffix: true, locale: enUS }); 
    } catch (e) {
      return "Invalid date";
    }
  };

  // Callback to calculate overall vote eligibility (used by renderVoteStatus and filter)
  const calculateCanVote = useCallback((poll: Poll): boolean | null => {
      // Check if the viewer is the creator
      if (address && poll.creator && address.toLowerCase() === poll.creator.toLowerCase()) {
          return false; // Creator cannot vote
      }

      // Check basic conditions: voted status, poll activity, and end time
      if (poll.hasVotedCheck === null) return null; // Vote status not checked yet or failed
      if (poll.hasVotedCheck === true) return false; // Already voted
      if (!poll.isActive || (poll.endTime * 1000 <= Date.now())) return false; // Inactive or ended

      const reqType = poll.votingRequirement;

      // Evaluate each requirement based on its status (true, false, or null if not checked/failed)
      let followerMet: boolean | null = true;
      if (VotingRequirementHelper.requiresFollower(reqType)) {
          if (poll.isCheckingFollow) return null; // Still checking
          followerMet = poll.isFollowingCreator ?? null; // Use null if check failed
      }

      let tokenMet: boolean | null = true;
      if (VotingRequirementHelper.requiresLSP7(reqType)) {
          if (poll.isCheckingToken) return null; // Still checking
          tokenMet = poll.hasEnoughTokens ?? null; // Use null if check failed
      }

      let nftMet: boolean | null = true;
      if (VotingRequirementHelper.requiresLSP8(reqType)) {
          if (poll.isCheckingNft) return null; // Still checking
          nftMet = poll.hasNFT ?? null; // Use null if check failed
      }
      
      // If any required check has failed (is null), the overall status is undetermined (null)
      if (followerMet === null || tokenMet === null || nftMet === null) {
          return null; 
      }

      // All required checks are done and didn't fail, return true only if all are met
      return followerMet === true && tokenMet === true && nftMet === true;
  }, [address]); 

  // Memoized calculation to filter polls based on the active tab and eligibility
  const filteredPolls = useMemo(() => {
    const now = Date.now();
    let intermediatePolls = polls;

    // Filter by the main active tab
    if (activeTab === 'active') {
      intermediatePolls = polls.filter(p => p.isActive && p.endTime * 1000 > now);
    } else if (activeTab === 'ended') {
      intermediatePolls = polls.filter(p => !p.isActive || p.endTime * 1000 <= now);
    } else if (activeTab === 'rewarded') { 
      intermediatePolls = polls.filter(p => p.rewardsEnabled);
    } else if (activeTab === 'following') { 
      // Filter polls created by addresses the viewer follows
      intermediatePolls = polls.filter(p => p.creator && followingList.includes(p.creator.toLowerCase()));
    } else if (activeTab === 'canVote') {
        intermediatePolls = polls.filter(p => calculateCanVote(p) === true);
    } else if (activeTab === 'cannotVote') {
         intermediatePolls = polls.filter(p => calculateCanVote(p) === false);
    } else if (activeTab === 'voted') { // Filter for polls the user has voted on
        intermediatePolls = polls.filter(p => p.hasVotedCheck === true);
    } 
    // 'all' tab requires no filtering here

    return intermediatePolls;
  }, [polls, activeTab, followingList, calculateCanVote]); // Dependencies for recalculation

  // Memoized calculation to group filtered polls into active and ended sections
  const { activePollsInFilter, endedPollsInFilter } = useMemo(() => {
    const active: Poll[] = [];
    const ended: Poll[] = [];
    const now = Date.now(); // Get current timestamp in milliseconds
    
    filteredPolls.forEach(poll => {
      // Compare timestamps directly (both in milliseconds)
      const isTimeEnded = (poll.endTime * 1000) <= now; // Corrected comparison
      // Decide based on both isActive flag and time
      if (poll.isActive && !isTimeEnded) {
        active.push(poll);
      } else {
        ended.push(poll);
      }
    });
    
    return { activePollsInFilter: active, endedPollsInFilter: ended };
  }, [filteredPolls]);

  // Handler when a poll card is clicked
  const handlePollClick = (pollId: number) => {
    // Mark poll as visited for UI styling
    setVisitedPollIds(prev => new Set(prev).add(pollId)); 
    setSelectedPoll(pollId); // Set state to open the detail modal
  };
  
  // Handler to close the poll detail modal
  const handleCloseDetail = () => {
    setSelectedPoll(null);
  };

  // Handler to open the profile modal for a given address
  const handleOpenProfileModal = (profileAddress: string) => {
      // If the viewer clicks their own profile, redirect to their profile page
      if (address && profileAddress && address.toLowerCase() === profileAddress.toLowerCase()) {
          window.location.href = `/profile/${profileAddress}`;
          return;
      }
      // Otherwise, open the profile in a modal
      setSelectedProfileAddress(profileAddress);
  };

  // Handler to close the profile modal
  const handleCloseProfileModal = () => {
      setSelectedProfileAddress(null);
  };
  
  // Render a status tag (Active/Ended) for a poll
  const renderPollStatusTag = (poll: Poll) => {
    if (poll.isActive) {
      return <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">Active</span>;
    } else {
      return <span className="px-2 py-0.5 text-xs font-medium text-red-800 bg-red-100 rounded-full">Ended</span>;
    }
  };
  
  // Render the voting requirements display for a poll card
  const renderRequirements = (poll: Poll) => {
     // Helper to render a single requirement line with status icon
     const renderSingleRequirement = (text: string, status: boolean | null | undefined, loading: boolean | undefined, icon?: React.ReactNode) => (
        <div className="flex items-center space-x-1.5" title={text}>
             {loading ? (
                 <svg className="animate-spin h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : status === true ? (
                 <span className="text-green-500 text-sm">✓</span>
             ) : status === false ? (
                 <span className="text-red-500 text-sm">✗</span>
             ) : (
                 <span className="text-gray-400 text-sm">?</span>
             )}
             {icon || <span className="text-xs text-gray-500 truncate">{text}</span>}
         </div>
     );

     const reqType = poll.votingRequirement;
     const reqToken = poll.requiredAssetMetadata?.name || 'Token';
     const reqAmount = web3 ? web3.utils.fromWei(poll.requiredMinTokenAmount || '0', 'ether') : '?';
     const reqIcon = poll.requiredAssetMetadata?.iconUrl;
     const creatorName = poll.creatorProfile?.name || poll.creator.substring(0, 6) + '...';
 
     const showFollow = VotingRequirementHelper.requiresFollower(reqType);
     const showToken = VotingRequirementHelper.requiresLSP7(reqType);
     const showNft = VotingRequirementHelper.requiresLSP8(reqType);

     return (
         <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
             {showFollow && renderSingleRequirement(
                 `Follow ${creatorName}`,
                                poll.isFollowingCreator, 
                                poll.isCheckingFollow,
                 <span className="text-xs text-gray-500 truncate flex items-center">Follow <UserIcon className="h-3 w-3 ml-1"/></span> 
             )}
             {showToken && renderSingleRequirement(
                 `Hold ${reqAmount} ${reqToken}`,
                                poll.hasEnoughTokens, 
                                poll.isCheckingToken,
                 <span className="text-xs text-gray-500 truncate flex items-center">
                     {reqAmount} {reqToken}
                     {reqIcon && <img src={reqIcon} alt={reqToken} className="w-3 h-3 rounded-full ml-1"/>}
                 </span>
             )}
             {showNft && renderSingleRequirement(
                 `Hold ${reqToken} NFT`,
                                poll.hasNFT, 
                                poll.isCheckingNft,
                 <span className="text-xs text-gray-500 truncate flex items-center">
                     {reqToken} NFT
                     {reqIcon && <img src={reqIcon} alt={reqToken} className="w-3 h-3 rounded-full ml-1"/>}
                 </span>
             )}
             {reqType === VotingRequirementType.NONE && (
                 <span className="text-xs text-gray-400 italic">No requirements</span>
             )}
        </div>
     );
  };
  
  // Updated function to render vote status with better handling for loading/error states
  const renderVoteStatus = (poll: Poll) => {
     if (!address) {
         return <span className="text-xs text-gray-400 italic">Connect wallet</span>;
     }
     
     // Combine all checking flags
     const isChecking = poll.isCheckingVote || poll.isCheckingFollow || poll.isCheckingToken || poll.isCheckingNft;

     if (isChecking) {
         return <span className="text-xs text-gray-400 animate-pulse">Checking...</span>;
     }

     // Check results *after* loading is complete
     if (poll.hasVotedCheck === true) {
         return <span className="text-xs text-green-600 font-medium">Voted</span>;
     }
     
     // Check poll end time accurately
     if (!poll.isActive || (poll.endTime * 1000 <= Date.now())) { 
         return <span className="text-xs text-red-600 font-medium">Poll ended</span>;
     }

     // Calculate overall eligibility using the potentially updated poll state
     const canVote = calculateCanVote(poll);

     // Handle cases where checks failed (calculateCanVote returns null)
     if (canVote === null) {
         // Check if the specific check failed *after* attempting
         const reqType = poll.votingRequirement;
         const voteCheckFailed = poll.hasVotedCheck === null;
         const followCheckFailed = VotingRequirementHelper.requiresFollower(reqType) && poll.isFollowingCreator === null;
         const tokenCheckFailed = VotingRequirementHelper.requiresLSP7(reqType) && poll.hasEnoughTokens === null;
         const nftCheckFailed = VotingRequirementHelper.requiresLSP8(reqType) && poll.hasNFT === null;
         
         if (voteCheckFailed || followCheckFailed || tokenCheckFailed || nftCheckFailed) {
             return <span className="text-xs text-yellow-600 italic" title="Could not determine eligibility status">Status Error</span>;
         } else {
             // Should ideally not happen if not checking, but use Checking as fallback
              return <span className="text-xs text-gray-400 animate-pulse">Checking...</span>;
         }
     }

     // Display final eligibility status
     if (canVote === true) {
         return <span className="text-xs text-blue-600 font-medium">Eligible to Vote</span>;
     }
     
     // If canVote is false, it means not eligible for some reason
     return <span className="text-xs text-orange-600 font-medium" title="Voting requirements not met or poll ended">Not Eligible</span>;
     
 };

  
  const tabs: { key: PollFilterType; label: string; count?: number }[] = [
    { key: 'active', label: 'Active' },
    { key: 'canVote', label: 'Can Vote' },
    { key: 'cannotVote', label: 'Cannot Vote' },
    { key: 'following', label: 'Following' },
    { key: 'voted', label: 'Voted' },
    { key: 'rewarded', label: 'Rewarded' },
    { key: 'ended', label: 'Ended' },
    { key: 'all', label: 'All' },
  ];

  
  const renderPollCard = (poll: Poll) => {
    const timeLeft = formatTimeLeft(poll.endTime);
    const isVisited = visitedPollIds.has(poll.id);

    // Helper function to render the reward part conditionally
    const renderRewardInfo = () => {
        if (!poll.rewardsEnabled || !web3) return null; // No reward or web3 not ready

        let rewardDisplay: React.ReactNode = null;
        let iconDisplay: React.ReactNode = <GiftIcon className="h-3 w-3 text-purple-500 flex-shrink-0" />;

        if (poll.rewardType === RewardType.NATIVE) {
            rewardDisplay = (
                <span>{`${web3.utils.fromWei(poll.rewardPerVote || '0', 'ether')} LYX / Vote`}</span>
            );
            // Use LYX logo if available
            iconDisplay = (
                <img src="/luksologo.png" alt="LYX" className="w-3 h-3 rounded-full mr-0.5" />
            );
        } else if (poll.rewardType === RewardType.LSP7 && poll.rewardToken) {
            const tokenAddrLower = poll.rewardToken.toLowerCase();
            const metadata = tokenMetadataCache[tokenAddrLower]; // Get from state cache
            const symbol = metadata?.symbol || 'Token';
            const decimals = metadata?.decimals ?? 18; // Use fetched decimals, default 18
            const rawAmount = BigInt(poll.rewardPerVote || '0');
            const divisor = 10n ** BigInt(decimals);
            const quotient = rawAmount / divisor;
            const remainder = rawAmount % divisor;
            let formattedAmount = quotient.toString();
            if (decimals > 0 && remainder > 0n) {
                const remainderString = remainder.toString().padStart(decimals, '0');
                // Show up to 4 decimal places, remove trailing zeros
                const fractionalPart = remainderString.substring(0, 4).replace(/0+$/, ''); 
                if (fractionalPart.length > 0) {
                    formattedAmount += '.' + fractionalPart;
                }
            }

            rewardDisplay = (
                <span className="flex items-center space-x-1">
                    <span>{`${formattedAmount} ${symbol} / Vote`}</span>
                </span>
            );
            // Use token icon if available, otherwise default gift icon
            if (metadata?.iconUrl) {
                iconDisplay = <img src={metadata.iconUrl} alt={symbol} className="w-3 h-3 rounded-full mr-0.5" />
            } else {
                 iconDisplay = <GiftIcon className="h-3 w-3 text-gray-400 flex-shrink-0 mr-0.5" />; // Default icon if no metadata icon
            }

        } else {
            // Fallback for unknown or missing type/token
            rewardDisplay = <span>Reward / Vote</span>;
            iconDisplay = <GiftIcon className="h-3 w-3 text-gray-400 flex-shrink-0 mr-0.5" />;
        }

        return (
            <div className="flex items-center space-x-0.5 mt-0.5"> {/* Reduced space for icon */}
                {iconDisplay} 
                <span className="text-xs text-purple-700 font-medium truncate">
                    {rewardDisplay}
                </span>
            </div>
        );
    };

                        return (
                          <div
            key={poll.id}
            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer ${isVisited ? 'opacity-70' : 'opacity-100'}`}
                            onClick={() => handlePollClick(poll.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                <h3 className="text-md font-semibold text-gray-800 mr-2 flex-1 line-clamp-2">{poll.question}</h3>
                              {renderPollStatusTag(poll)}
            </div>
            
            <div 
                className="flex items-center space-x-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    handleOpenProfileModal(poll.creator); 
                }}
                title={`View profile: ${poll.creatorProfile?.name || poll.creator}`}
            >
                <img 
                    src={poll.creatorProfile?.image || '/default-avatar.png'} 
                    alt={poll.creatorProfile?.name || 'Creator'} 
                    className="w-6 h-6 rounded-full border border-gray-200"
                />
                <span className="text-xs text-gray-600 truncate">{poll.creatorProfile?.name || poll.creator}</span>
            </div>

            {poll.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{poll.description}</p>}
            
            <div className="text-xs text-gray-500 mb-2">
                <span>Ends: {timeLeft}</span> 
                            </div>
                            
            {address && renderRequirements(poll)}

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                <div className="flex flex-col space-y-0"> 
                    <span className="text-xs text-gray-500">
                        {/* Conditionally display vote count with target */}
                        {poll.rewardsEnabled && poll.targetVoterCount > 0
                            ? `${poll.totalVotes} / ${poll.targetVoterCount}`
                            : poll.totalVotes || '-' 
                        } Votes
                            </span>
                    {renderRewardInfo()} 
                              </div>
                {renderVoteStatus(poll)}
                            </div>
                </div>
    );
};


                        return (
    <Modal isOpen={true} onClose={onClose} title="Explore Polls" size="xl">
      <div className="p-1">
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-3 overflow-x-auto pb-px" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-xs rounded-t-md ${activeTab === tab.key
                                    ? 'border-[#FF60A0] text-[#8F0C4C] bg-[#FFF0F7]' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            aria-current={activeTab === tab.key ? 'page' : undefined}
                        >
                             {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
                        </button>
                    ))}
                </nav>
                              </div>

            {isLoading ? (
                <div className="text-center py-10 text-gray-500">Loading polls...</div>
            ) : error ? (
                <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">Error: {error}</div>
            ) : filteredPolls.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-2 pb-2">
                    {filteredPolls.map(renderPollCard)}
                </div>
             ) : (
                 <div className="text-center py-10 text-gray-500">
                    No polls found for "{tabs.find(t => t.key === activeTab)?.label}" filter.
                              </div>
                      )}
                    </div>
      
      {selectedPoll !== null && (
        <PollDetailModal 
          pollId={selectedPoll} 
          onClose={handleCloseDetail} 
          isCreator={polls.find(p => p.id === selectedPoll)?.creator?.toLowerCase() === address?.toLowerCase()}
        />
      )}

      {selectedProfileAddress && (
          <ProfileModal
              userAddress={selectedProfileAddress}
              isOpen={true}
              onClose={handleCloseProfileModal}
          />
      )}
    </Modal>
  );
};

export default PollListModal; 


import { 
    UserIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    QuestionMarkCircleIcon,
    GiftIcon // Make sure GiftIcon is imported
} from '@heroicons/react/24/outline';