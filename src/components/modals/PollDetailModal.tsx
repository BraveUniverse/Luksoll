"use client";

import React, { useState, useEffect, useCallback, FC } from 'react';
import Modal from './Modal';
import { useUP } from '@/context/UPContext';
import Web3 from 'web3';
import { 
  getPollDetails, 
  vote, 
  claimReward, 
  closePoll, 
  withdrawRemainingFunds, 
  pausePoll,  
  resumePoll, 
  CONTRACT_ADDRESS as PRIMARY_CONTRACT_ADDRESS,
  fetchTokenMetadataFromLSP,
  hasVoted as checkHasVoted,
  hasClaimedReward as checkHasClaimedReward
} from '@/contracts/contract-config';
import useLSP3Profile, { LSP3ProfileManager } from '@/hooks/useLSP3Profile';
import { formatDistanceToNowStrict } from 'date-fns';
import { enUS } from 'date-fns/locale'; 

import { 
    getCachedMetadata, setCachedMetadata, 
    getCachedProfile, setCachedProfile, 
    getCachedPollStaticDetails, setCachedPollStaticDetails 
} from '@/utils/localStorageCache'; 
import Link from 'next/link';
import ProfileModal from './ProfileModal'; 
import { VotingRequirementType, VotingRequirementHelper } from '@/utils/voting-requirements';

const BACKUP_CONTRACT_ADDRESS = "0x58d63232f7EB2D9efa082A85639011C9A78D8979"; 

interface PollDetailModalProps {
  pollId: number;
  onClose: () => void;
  isCreator?: boolean;
}

interface PollOption {
  id: number;
  text: string;
  voteCount: number;
  percentage: number;
}

interface PollDetail {
  question: string;
  description: string;
  options: PollOption[];
  totalVotes: number;
  startTime: number;
  endTime: number;
  isActive: boolean;
  hasVoted: boolean;
  targetVoterCount: number;
  rewardsEnabled: boolean;
  rewardPerVote: string;
  creator: string;
  creatorProfile: {
    name: string;
    image: string;
  } | null;
  hasClaimedReward: boolean;
  canClaimReward: boolean;
  userVotedOption: number;
  requirementType: number;
  
  requiredTokenAddress: string;
  requiredMinTokenAmount: string;
  rewardType: number;
  rewardToken: string;
  ended: boolean; 
}

interface VoterInfo {
  address: string;
  profile: {
    name: string;
    image: string;
  } | null;
  loading: boolean;
}

interface ProfileData { name: string; image: string; }
interface AssetMetadata { name: string; iconUrl: string | undefined; }

const claimPollReward = claimReward; 


const DEFAULT_IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';

const PollDetailModal: FC<PollDetailModalProps> = ({ pollId, onClose, isCreator }) => {
  

  const { contract, address, upProvider, web3, isConnected } = useUP();
  const [pollDetails, setPollDetails] = useState<PollDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [canVote, setCanVote] = useState(false);
  const [voteErrorMessage, setVoteErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [votersPerOption, setVotersPerOption] = useState<VoterInfo[][]>([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isClosingPoll, setIsClosingPoll] = useState(false);
  const [isExtendingDuration, setIsExtendingDuration] = useState(false);
  const [additionalHours, setAdditionalHours] = useState(24);
  const [managementMessage, setManagementMessage] = useState('');
  const [withdrawingFunds, setWithdrawingFunds] = useState(false);
  const [isLoadingAssetMetadata, setIsLoadingAssetMetadata] = useState(false);
  const [assetMetadataError, setAssetMetadataError] = useState<string | null>(null);
  const [requiredAssetMetadata, setRequiredAssetMetadata] = useState<{ name: string; iconUrl?: string } | null>(null);
  
  const [rewardAssetMetadata, setRewardAssetMetadata] = useState<{ name: string; iconUrl?: string } | null>(null);
  const [isLoadingRewardMetadata, setIsLoadingRewardMetadata] = useState(false);
  const [rewardMetadataError, setRewardMetadataError] = useState<string | null>(null);
  const [isPausingPoll, setIsPausingPoll] = useState(false); 
  const [isResumingPoll, setIsResumingPoll] = useState(false); 
  
  
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);
  
  
  const handleOpenProfileModal = (profileAddress: string) => {
      
      if (address && profileAddress && address.toLowerCase() === profileAddress.toLowerCase()) {
          window.location.href = `/profile/${profileAddress}`;
          return;
      }
      
      
      setSelectedProfileAddress(profileAddress);
  };

  const handleCloseProfileModal = () => {
      setSelectedProfileAddress(null);
  };
  
  
  const getUserVoteInfo = async (contractInstance: any, currentPollId: number, userAddress: string) => {
    try {
      
      const votedStatus = await contractInstance.methods.hasVoted(currentPollId, userAddress).call();
      
      if (!votedStatus) {
        return { hasVoted: false, votedOption: -1, hasClaimedReward: false };
      }
      
      
      
      let votedOption = -1;
      try {
        
        votedOption = await contractInstance.methods.votedOption(currentPollId, userAddress).call();
      } catch (err) {
        console.error(`Error fetching votedOption for ${userAddress} on poll ${currentPollId}:`, err);
      }
      
      
      let hasClaimedReward = false;
      try {
        
        hasClaimedReward = await contractInstance.methods.hasClaimedReward(currentPollId, userAddress).call();
      } catch (err) {
        console.error(`Error fetching hasClaimedReward for ${userAddress} on poll ${currentPollId}:`, err);
      }
      
      return { hasVoted: votedStatus, votedOption: Number(votedOption), hasClaimedReward };
    } catch (error) {
      console.error(`Error fetching vote info for ${userAddress} on poll ${currentPollId}:`, error);
      return { hasVoted: false, votedOption: -1, hasClaimedReward: false };
    }
  };

  
  const fetchVoters = async (currentPollId: number) => {
    if (!web3 || !contract || !pollDetails) {
      console.warn("fetchVoters: Web3, contract, or poll data not available.");
      return;
    }
    
    try {
      
      setIsLoadingVoters(true);
      
      const votersArrays: VoterInfo[][] = pollDetails?.options?.map(() => []) || [];
      
      
      if (!pollDetails?.options || pollDetails.options.length === 0) {
        console.warn("fetchVoters: No options found in poll data.");
        setIsLoadingVoters(false);
        return;
      }
      
      try {
        
        const pollIdNum = currentPollId;
        
        
        let usedGetVotersByOption = false;
        
        
        for (let optionId = 0; optionId < pollDetails.options.length; optionId++) {
          try {
            
            
            
            const votersByOption = await contract.methods.getVotersByOption(pollIdNum, optionId).call();
            
            
            if (votersByOption && Array.isArray(votersByOption) && votersByOption.length > 0) {
              for (const voterAddress of votersByOption) {
                votersArrays[optionId].push({
                  address: voterAddress,
                  profile: null,
                  loading: true
                });
              }
              usedGetVotersByOption = true;
            }
          } catch (optionVotersErr) {
            console.warn(`Could not use getVotersByOption for option ${optionId} on poll ${pollIdNum}:`, optionVotersErr);
          }
        }
        
        
        if (!usedGetVotersByOption) {
          try {
            
            
            const allVoters = await contract.methods.getVoters(pollIdNum).call();
            
            
            if (allVoters && Array.isArray(allVoters) && allVoters.length > 0) {
              for (const voterAddress of allVoters) {
                try {
                  let votedOptionId: number = -1;
                  try {
                    
                    const result = await contract.methods.votedOption(pollIdNum, voterAddress).call();
                    votedOptionId = Number(result);
                    
                  } catch (optionErr) {
                    console.warn(`Could not fetch votedOption for ${voterAddress} on poll ${pollIdNum}:`, optionErr);
                    // Continue to try and add to a default/unknown option or skip
                  }
                  
                  // Ensure votedOptionId is a valid index
                  if (votedOptionId >= 0 && votedOptionId < votersArrays.length) {
                    votersArrays[votedOptionId].push({
                      address: voterAddress,
                      profile: null,
                      loading: true
                    });
                  } else if (votedOptionId === -1 && allVoters.length < 100) { // Only if not too many voters to avoid spamming general list
                     // Maybe add to a general list if option is unknown or error
                     // For now, just log if an option couldn't be determined.
                     console.log(`Voter ${voterAddress} found but their option could not be determined for poll ${pollIdNum}.`);
                  }
                } catch (singleVoterErr) {
                  console.warn(`Error processing single voter ${voterAddress} from getVoters list:`, singleVoterErr);
                }
              } 
            } else {
              console.log("No voters found using getVoters.")
            }
          } catch (allVotersErr) {
            console.warn(`Could not use getVoters for poll ${pollIdNum}:`, allVotersErr);
          }
        }

      } catch (outerError) {
        console.error("Error in fetching voter lists (getVotersByOption/getVoters part):", outerError);
      }

      
      setVotersPerOption(votersArrays);
      
      
      const lsp3Manager = new LSP3ProfileManager();
      
      
      for (let i = 0; i < votersArrays.length; i++) {
        for (let j = 0; j < votersArrays[i].length; j++) {
          const voterAddress = votersArrays[i][j].address;
          // Check if profile already fetched or cached (optional optimization here)
          try {
            
            const profileData = await lsp3Manager.getProfileData(votersArrays[i][j].address, web3); // Added web3 argument
            let imageUrl = '/default-avatar.png';
            if (profileData) {
                const processedImageUrl = lsp3Manager.getProfileImageUrl(profileData);
                if(processedImageUrl) imageUrl = processedImageUrl;
            }
            
            setVotersPerOption(prev => {
              const newVoters = [...prev];
              if (newVoters[i] && newVoters[i][j]) {
                newVoters[i][j].profile = profileData ? { name: profileData.name || `User ${voterAddress.substring(0,6)}...`, image: imageUrl } : { name: `User ${voterAddress.substring(0,6)}...`, image: imageUrl };
                newVoters[i][j].loading = false;
              }
              return newVoters;
            });
          } catch (profileError) {
            console.error(`Failed to fetch profile for ${voterAddress}:`, profileError);
            setVotersPerOption(prev => {
              const newVoters = [...prev];
              if (newVoters[i] && newVoters[i][j]) {
                newVoters[i][j].profile = { name: `User ${voterAddress.substring(0,6)}...`, image: '/default-avatar.png' }; // Fallback profile
                newVoters[i][j].loading = false;
              }
              return newVoters;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching voters:", error);
    } finally {
      setIsLoadingVoters(false);
    }
  };

  
  const getRemainingTime = (endTimeMs: number | undefined): string => {
    if (typeof endTimeMs !== 'number' || endTimeMs <= 0) {
      return "No duration info"; 
    }

    const nowMs = Date.now(); 
    const remainingMs = endTimeMs - nowMs;

    if (remainingMs <= 0) {
      
      try {
          
          return `Ended (${new Date(endTimeMs).toLocaleDateString('en-US')} ${new Date(endTimeMs).toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' })})`; 
      } catch {
          return "Ended"; 
      }
    }

    
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    let result = "Remaining: "; 
    if (days > 0) result += `${days}d `; 
    if (hours > 0) result += `${hours}h `; 
    if (minutes > 0) result += `${minutes}m `; 
    if (result === "Remaining: ") result = "Remaining: <1m"; 
    
    return result.trim();
  };

  
  const renderRequirementStatusInline = () => {
    if (!pollDetails || pollDetails.requirementType === VotingRequirementType.NONE) return null;

    const reqType = pollDetails.requirementType as VotingRequirementType;

    const getStatusIcon = (isMet: boolean | null | undefined) => {
      if (isMet === true) return <span className="text-green-500 text-lg mr-1.5">✓</span>; 
      if (isMet === false) return <span className="text-red-500 text-lg mr-1.5">✗</span>; 
      if (isMet === null || isMet === undefined || isLoadingAssetMetadata || (VotingRequirementHelper.requiresFollower(reqType) && isFollowingLoading) ) {
           return <span className="text-gray-400 text-xs animate-pulse mr-1.5">•••</span>; 
      } 
      return <span className="text-gray-400 text-lg mr-1.5">?</span>; 
    };


    
    const generalEligibilityMet = canVote; 

    
    const followStatus = VotingRequirementHelper.requiresFollower(reqType) ? isFollowing : null;
    
    const tokenStatus = VotingRequirementHelper.requiresLSP7(reqType) ? generalEligibilityMet : null;
    const nftStatus = VotingRequirementHelper.requiresLSP8(reqType) ? generalEligibilityMet : null;

    const tokenName = requiredAssetMetadata?.name || 'Token';
    const nftName = requiredAssetMetadata?.name || 'NFT';
    const requiredAmountFormatted = web3 ? Web3.utils.fromWei(pollDetails.requiredMinTokenAmount || '0', 'ether') : '...';

    return (
      
      <div className="flex flex-col items-start space-y-1 text-xs text-gray-600 mt-2 py-2 border-y border-gray-100">
        <span className="font-medium text-gray-700 mb-1">Voting Requirements:</span> 
        
        {VotingRequirementHelper.requiresFollower(reqType) && (
          <span className="flex items-center w-full" title="Follow poll creator status"> 
            {getStatusIcon(followStatus)} 
            Follow poll creator 
          </span>
        )}
        {VotingRequirementHelper.requiresLSP7(reqType) && (
          <span className="flex items-center w-full" title={`Minimum ${requiredAmountFormatted} ${tokenName} ownership status`}> 
            {getStatusIcon(tokenStatus)} 
            Own min. {requiredAmountFormatted} <span className="font-medium mx-1">{tokenName}</span> 
            
          </span>
        )}
        {VotingRequirementHelper.requiresLSP8(reqType) && (
          <span className="flex items-center w-full" title={`Required ${nftName} NFT ownership status`}> 
             {getStatusIcon(nftStatus)} 
             Own required <span className="font-medium mx-1">{nftName}</span> NFT 
             
          </span>
        )}
         
         {(assetMetadataError || rewardMetadataError) && (
             <span className="flex items-center text-red-500 mt-1" title={assetMetadataError || rewardMetadataError || ''}>
                 <span className="text-lg mr-1.5">❗️</span>Error loading requirement information. 
            </span>
        )}
      </div>
    );
  };

  
  const checkVotingEligibility = useCallback(async (pollDetail: PollDetail | null) => {
    if (!pollDetail) { setCanVote(false); setVoteErrorMessage("Poll details not found."); return false; } 
    if (!web3 || !address || !isConnected || !contract) { setCanVote(false); setVoteErrorMessage("Wallet connection required."); return false; } 
    
    if (address.toLowerCase() === pollDetail.creator.toLowerCase()) {
        setCanVote(false);
        setVoteErrorMessage("Poll creator cannot vote."); 
        return false;
    }
    if (!pollDetail.isActive) { setCanVote(false); setVoteErrorMessage("This poll is no longer active."); return false; } 
    if (pollDetail.hasVoted) { setCanVote(false); setVoteErrorMessage("You have already voted in this poll."); return false; } 
    
    let canUserVote = false;
    
    let finalErrorMsg: string | null = null; 
    const requirement = pollDetail.requirementType as VotingRequirementType;
    

    try {
      let isFollower = false;
      let hasEnoughTokens = false;
      let hasNFT = false;

      
      if (VotingRequirementHelper.requiresFollower(requirement)) {
        setIsFollowingLoading(true); 
        try {
               
          const followerSystemAddress = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA";
          const followerSystemABI = [{"inputs":[{"internalType":"address","name":"follower","type":"address"},{"internalType":"address","name":"addr","type":"address"}],"name":"isFollowing","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
          const followerSystem = new web3.eth.Contract(followerSystemABI as any, followerSystemAddress);
          const result = await followerSystem.methods.isFollowing(address, pollDetail.creator).call();
          isFollower = Boolean(result);
               
        } catch (err) {
               
          console.error("Error checking follower status:", err); 
          setCanVote(false);
          setVoteErrorMessage("Could not check follower status."); 
               setIsFollowingLoading(false); 
          return false;
        } finally {
            setIsFollowingLoading(false);
        }
      }

      
      if (VotingRequirementHelper.requiresLSP7(requirement)) {
        
        try {
               
          const lsp7ABI = [{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function"}];
               const lsp7Token = new web3.eth.Contract(lsp7ABI as any, pollDetail.requiredTokenAddress);
            const balance = await lsp7Token.methods.balanceOf(address).call();
               
          if (balance !== null && balance !== undefined) {
            hasEnoughTokens = BigInt(String(balance)) >= BigInt(pollDetail.requiredMinTokenAmount);
                 
          } else {
            console.warn(`balanceOf returned null/undefined for LSP7 token ${pollDetail.requiredTokenAddress} and user ${address}`);
            hasEnoughTokens = false;
          }
        } catch (err) {
                
           console.error(`Error checking LSP7 balance (${pollDetail.requiredTokenAddress}):`, err); 
           setCanVote(false);
           setVoteErrorMessage("Could not check token amount."); 
           return false;
        }
      }

      
      if (VotingRequirementHelper.requiresLSP8(requirement)) {
        
        try {
               
          const lsp8ABI = [{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function"}];
               const lsp8NFT = new web3.eth.Contract(lsp8ABI as any, pollDetail.requiredTokenAddress);
            const balance = await lsp8NFT.methods.balanceOf(address).call();
                
           if (balance !== null && balance !== undefined) {
             hasNFT = BigInt(String(balance)) > 0n;
                  
           } else {
             console.warn(`balanceOf returned null/undefined for LSP8 NFT ${pollDetail.requiredTokenAddress} and user ${address}`);
             hasNFT = false;
          }
        } catch (err) {
                
           console.error(`Error checking LSP8 balance (${pollDetail.requiredTokenAddress}):`, err);
           setCanVote(false);
           setVoteErrorMessage("Could not check NFT ownership."); 
           return false;
        }
      }

      
      
      

      switch (requirement) {
          case VotingRequirementType.NONE:
              
              canUserVote = true;
              break;
          case VotingRequirementType.FOLLOWERS_ONLY:
              
              canUserVote = isFollower;
              if (!canUserVote) finalErrorMsg = "Requirement: You must follow the poll creator."; 
              break;
          case VotingRequirementType.LSP7_HOLDER:
              
              canUserVote = hasEnoughTokens;
              if (!canUserVote) finalErrorMsg = `Requirement: You must own at least ${Web3.utils.fromWei(pollDetail.requiredMinTokenAmount || '0', 'ether')} token.`; 
              break;
          case VotingRequirementType.LSP8_HOLDER:
              
              canUserVote = hasNFT;
              if (!canUserVote) finalErrorMsg = "Requirement: You must own the required NFT."; 
              break;
          case VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER:
              
              canUserVote = isFollower && hasEnoughTokens;
              
              if (!canUserVote) {
                  finalErrorMsg = "Requirements: " + 
                                (!isFollower ? "Must be a follower. " : "") + 
                                (!hasEnoughTokens ? `Must own min token amount.` : "");
              }
              break;
          case VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER:
              
              canUserVote = isFollower && hasNFT;
              
              if (!canUserVote) {
                  finalErrorMsg = "Requirements: " + 
                                (!isFollower ? "Must be a follower. " : "") + 
                                (!hasNFT ? "Must own the NFT." : "");
              }
              break;
          default:
              
              canUserVote = false;
              finalErrorMsg = "Unknown voting requirement type."; 
              break;
      }

    } catch (error) {
      console.error("Error checking voting eligibility:", error);
      canUserVote = false;
      finalErrorMsg = "Error occurred while checking eligibility."; 
    }

      setCanVote(canUserVote);
      setVoteErrorMessage(finalErrorMsg);
      return canUserVote;
  }, [address, web3, isConnected, contract]);

  
  const fetchPollDetails = async () => {
    if (!contract || !web3) {
      setError("Contract or Web3 instance not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const details = await getPollDetails(contract, pollId, web3);
      if (!details) {
        throw new Error("Poll details could not be fetched or poll does not exist.");
      }

      let creatorProfileData: { name: string; image: string } | null = null;
      if (details.creator) {
        const cachedCreatorProfile = getCachedProfile(details.creator.toLowerCase());
        if (cachedCreatorProfile) {
          creatorProfileData = cachedCreatorProfile;
        } else {
          const lsp3Manager = new LSP3ProfileManager();
          const profileData = await lsp3Manager.getProfileData(details.creator, web3);
          if (profileData) {
            const imageUrl = lsp3Manager.getProfileImageUrl(profileData);
            creatorProfileData = {
              name: profileData.name || `User ${details.creator.substring(0, 6)}...`,
              image: imageUrl || '/default-avatar.png'
            };
            setCachedProfile(details.creator.toLowerCase(), creatorProfileData);
          } else {
            creatorProfileData = {
              name: `User ${details.creator.substring(0, 6)}...`,
              image: '/default-avatar.png'
            };
             setCachedProfile(details.creator.toLowerCase(), creatorProfileData);
          }
        }
      }

      let userVoteInfo = { hasVoted: false, votedOption: -1, hasClaimedReward: false };
      if (address && isConnected) {
        userVoteInfo = await getUserVoteInfo(contract, pollId, address);
      }

      const pollEndTime = Number(details.endTime) * 1000;
      const isPollEnded = Date.now() > pollEndTime;

      setPollDetails({
        question: details.question,
        description: details.description,
        options: details.options.map((opt: any, index: number) => ({
          id: index,
          text: opt.text,
          voteCount: Number(opt.voteCount),
          percentage: details.totalVotes > 0 ? (Number(opt.voteCount) / Number(details.totalVotes)) * 100 : 0,
        })),
        totalVotes: Number(details.totalVotes),
        startTime: Number(details.startTime),
        endTime: Number(details.endTime),
        isActive: details.isActive && !isPollEnded,
        ended: isPollEnded,
        hasVoted: userVoteInfo.hasVoted,
        userVotedOption: userVoteInfo.votedOption,
        targetVoterCount: Number(details.targetVoterCount),
        rewardsEnabled: details.rewardsEnabled,
        rewardPerVote: details.rewardPerVote.toString(),
        creator: details.creator,
        creatorProfile: creatorProfileData,
        hasClaimedReward: userVoteInfo.hasClaimedReward,
        canClaimReward: details.rewardsEnabled && userVoteInfo.hasVoted && !userVoteInfo.hasClaimedReward,
        requirementType: Number(details.votingRequirement),
        requiredTokenAddress: details.requiredTokenAddress,
        requiredMinTokenAmount: details.requiredMinTokenAmount.toString(),
        rewardType: Number(details.rewardType),
        rewardToken: details.rewardToken,
      });

      if (address && details.isActive && !isPollEnded && !userVoteInfo.hasVoted) {
        setCanVote(true);
      } else {
        setCanVote(false);
      }

    } catch (e: any) {
      console.error("Error fetching poll details:", e);
      setError(e.message || "Failed to load poll details. It might have been deleted or an error occurred.");
      setPollDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  
  const fetchCreatorProfile = useCallback(async (creatorAddress: string): Promise<ProfileData | null> => {
      if (!upProvider || !creatorAddress) return null;
      const lowerCaseAddress = creatorAddress.toLowerCase();

      
      const cachedProfile = getCachedProfile(lowerCaseAddress);
      if (cachedProfile !== undefined) { 
           // console.log(`Returning cached profile for ${creatorAddress}`); 
          return cachedProfile; 
      }

      
      
      try {
        
        const lsp3Manager = new LSP3ProfileManager(); 
        const profileData = await lsp3Manager.getProfileData(creatorAddress, web3);
        let profileInfo: ProfileData | null = null;
        
        if (profileData) {
           let imageUrl = '/default-avatar.png'; 
           
           const processedImageUrl = lsp3Manager.getProfileImageUrl(profileData);
           if (processedImageUrl) {
               imageUrl = processedImageUrl; 
           } else {
               // console.warn(`Could not process image URL for profile: ${creatorAddress}`);
               
           }

            profileInfo = { 
                name: profileData.name || `User ${creatorAddress.substring(0,6)}...`, 
                image: imageUrl 
            };
            // console.log(`Fetched profile for ${creatorAddress}:`, profileInfo);
        } else {
            // console.log(`No LSP3 profile data found for ${creatorAddress}`);
        }
        
        
        setCachedProfile(lowerCaseAddress, profileInfo);
        return profileInfo;
      } catch (err) {
        console.error(`Error fetching LSP3 profile for ${creatorAddress}:`, err);
        setCachedProfile(lowerCaseAddress, null); 
        return null;
      }
    
    }, [upProvider, web3]); 

  
  const fetchMetadataForAddress = useCallback(async (assetAddress: string): Promise<AssetMetadata | null> => { 
      
      
      if (!web3 || !assetAddress || assetAddress === '0x0000000000000000000000000000000000000000') {
          return null;
      }
      const lowerCaseAddress = assetAddress.toLowerCase();

      const cached = getCachedMetadata(lowerCaseAddress);
      if (cached !== undefined) return cached;

      
      try {
          const lsp4Metadata = await fetchTokenMetadataFromLSP(web3.currentProvider, assetAddress);
          const fetchedMetadata: AssetMetadata | null = lsp4Metadata 
              ? { name: lsp4Metadata.name || 'Unknown Asset', iconUrl: lsp4Metadata.iconUrl } 
              : null;

          setCachedMetadata(lowerCaseAddress, fetchedMetadata); 
      return fetchedMetadata;
      } catch (error) {
          console.error(`Failed to fetch metadata for asset ${assetAddress}:`, error);
          setCachedMetadata(lowerCaseAddress, null); 
          return null;
      }
  }, [web3]); 

 
 const checkFollowStatus = useCallback(async () => { 
     if (!address || !pollDetails?.creator || !web3 || !isConnected) return false; 
     setIsFollowingLoading(true);
     try {
         const followerSystemAddress = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA";
         const followerSystemABI = [
             {"inputs":[{"internalType":"address","name":"follower","type":"address"},{"internalType":"address","name":"addr","type":"address"}],"name":"isFollowing","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
         ];
         const followerSystem = new web3.eth.Contract(followerSystemABI as any, followerSystemAddress);
         const result = await followerSystem.methods.isFollowing(address, pollDetails.creator).call();
         // console.log(`Follow status for ${address} following ${pollDetails.creator}: ${result}`);
         setIsFollowing(Boolean(result)); 
         return Boolean(result); 
     } catch (error) {
         console.error(`Error checking follow status for ${pollDetails.creator}:`, error);
          setIsFollowing(false);
         return false; 
    } finally {
      setIsFollowingLoading(false);
    }
 }, [address, pollDetails?.creator, web3, isConnected]); 

  
  
  useEffect(() => {
    // console.log("PollDetailModal useEffect: Fetching poll details", { pollId });
    fetchPollDetails(); 
  }, [pollId, web3, contract, address]); 

  
  useEffect(() => {
    const loadProfileAndFollowStatus = async () => {
      if (pollDetails?.creator && address) {
        setIsFollowingLoading(true); 
        try {
          // console.log("Fetching creator profile and follow status", { creator: pollDetails.creator });
          const [profile, followStatusResult] = await Promise.all([
            fetchCreatorProfile(pollDetails.creator),
            checkFollowStatus() 
          ]);
          
          // console.log("Profile & Follow Status fetched", { profile, followStatusResult });
          setPollDetails(currentPoll => currentPoll ? { ...currentPoll, creatorProfile: profile } : null); 
          
          // setIsFollowing is set within checkFollowStatus
          
        } catch (err) {
          console.error("Error loading creator profile or follow status:", err);
          
          setPollDetails(currentPoll => currentPoll ? { ...currentPoll, creatorProfile: null } : null);
          setIsFollowing(false); 
        } finally {
           setIsFollowingLoading(false); 
          }
        } else {
         
         setPollDetails(currentPoll => currentPoll ? { ...currentPoll, creatorProfile: null } : null);
         setIsFollowing(false);
         setIsFollowingLoading(false);
      }
    };

    if (pollDetails?.creator) { 
      loadProfileAndFollowStatus();
    }
  }, [pollDetails?.creator, address, fetchCreatorProfile, checkFollowStatus]); 

  
  useEffect(() => {
    if (pollDetails && isConnected && address) { 
        checkVotingEligibility(pollDetails);
            } else {
        
        setCanVote(false); 
        
    }
  }, [pollDetails, isConnected, address, checkVotingEligibility]); 

   
   useEffect(() => {
    const fetchAllMetadata = async () => {
      if (!pollDetails) return;

      
      if (pollDetails.requirementType !== VotingRequirementType.NONE && pollDetails.requiredTokenAddress && pollDetails.requiredTokenAddress !== '0x0000000000000000000000000000000000000000') {
        setIsLoadingAssetMetadata(true);
        setAssetMetadataError(null);
        try {
          const metadata = await fetchMetadataForAddress(pollDetails.requiredTokenAddress);
          setRequiredAssetMetadata(metadata);
        } catch (err: any) {
          console.error(`Error fetching requirement asset metadata (${pollDetails.requiredTokenAddress}):`, err);
          setAssetMetadataError(`Could not fetch requirement info: ${err.message}`); 
          setRequiredAssetMetadata(null);
        } finally {
          setIsLoadingAssetMetadata(false);
        }
      } else {
           setRequiredAssetMetadata(null); 
           setIsLoadingAssetMetadata(false); 
      }
      
      
       if (pollDetails.rewardsEnabled && pollDetails.rewardToken && pollDetails.rewardToken !== '0x0000000000000000000000000000000000000000') {
         setIsLoadingRewardMetadata(true);
         setRewardMetadataError(null);
         try {
           const metadata = await fetchMetadataForAddress(pollDetails.rewardToken);
           setRewardAssetMetadata(metadata);
      } catch (err: any) {
           console.error(`Error fetching reward asset metadata (${pollDetails.rewardToken}):`, err);
           setRewardMetadataError(`Could not fetch reward info: ${err.message}`); 
           setRewardAssetMetadata(null);
      } finally {
           setIsLoadingRewardMetadata(false);
         }
       } else {
            setRewardAssetMetadata(null); 
            setIsLoadingRewardMetadata(false);
       }
    };

    fetchAllMetadata();
  }, [pollDetails?.requirementType, pollDetails?.requiredTokenAddress, pollDetails?.rewardsEnabled, pollDetails?.rewardToken, fetchMetadataForAddress]); 


  
  const handleVote = async (optionIndex: number) => { 
      if (!contract || !address || !isConnected || pollDetails === null) return;
    if (!canVote) {
      // console.log("Cannot vote:", voteErrorMessage);
      
      return;
    }
      if (selectedOption === null) {
           console.warn("Vote attempt with no selected option.");
           
              return;
            }
            
      setIsVoting(true);
      setVoteErrorMessage(null);
      try {
           await vote(contract, pollId, selectedOption, address);
           // console.log("Vote successful, refetching details...");
           
           setPollDetails(prevPoll => prevPoll ? { 
               ...prevPoll, 
               hasVoted: true,
               userVotedOption: selectedOption!
           } : null); 
           setCanVote(false); 

           await fetchPollDetails(); 
    } catch (error: any) {
           console.error(`Error during vote transaction for poll ${pollId}:`, error);
           setVoteErrorMessage(`Error while voting: ${error.message}`); 
    } finally {
      setIsVoting(false);
    }
  };

  const handleClaimReward = async () => {
    if (!contract || !address || !pollDetails || !pollDetails.canClaimReward) return;

      setIsClaimingReward(true);
      try {
         // console.log(`Claiming reward for poll ${pollId}`);
      await claimPollReward(contract, pollId, address);
        // console.log("Reward claimed successfully, refetching details...");
         
         await fetchPollDetails(); 
         
         // Optionally update local state immediately
         // setPollDetails(prev => prev ? {...prev, hasClaimedReward: true, canClaimReward: false} : null);
      } catch (error: any) {
         console.error(`Error during claim reward transaction for poll ${pollId}:`, error);
         // Maybe set an error message state here to display to user
    } finally {
      setIsClaimingReward(false);
    }
  };

  
  const handleFollow = async () => {
      if (!address || !pollDetails?.creator || !web3 || !isConnected) return;
      
      setIsFollowingLoading(true);
      try {
      const followerSystemAddress = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA";
          // ABI for follow/unfollow/isFollowing
          const followerSystemABI = [
              {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"follow","outputs":[],"stateMutability":"nonpayable","type":"function"}, 
              {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"unfollow","outputs":[],"stateMutability":"nonpayable","type":"function"}, 
              {"inputs":[{"internalType":"address","name":"follower","type":"address"},{"internalType":"address","name":"addr","type":"address"}],"name":"isFollowing","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
          ];
      const followerSystem = new web3.eth.Contract(followerSystemABI as any, followerSystemAddress);

          if (isFollowing) {
              // console.log(`Unfollowing ${pollDetails.creator}...`);
              
              await followerSystem.methods.unfollow(pollDetails.creator).send({ from: address });
        setIsFollowing(false);
      } else {
              // console.log(`Following ${pollDetails.creator}...`);
               
              await followerSystem.methods.follow(pollDetails.creator).send({ from: address });
        setIsFollowing(true);
      }
    } catch (error) {
          console.error(`Error during follow/unfollow transaction for ${pollDetails.creator}:`, error);
          // Optionally revert local state or show error message
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleClosePoll = async () => {
      if (!contract || !address || !isConnected || !pollDetails) return;
    
      setIsClosingPoll(true);
      setManagementMessage('');
      try {
           // console.log(`Closing poll ${pollId}...`);
          await closePoll(contract, pollId, address);
          // console.log("Poll closed successfully, refetching details...");
      setManagementMessage('Poll closed successfully.'); 
          await fetchPollDetails(); 
      } catch (error: any) {
          console.error(`Error closing poll ${pollId}:`, error);
          setManagementMessage(`Error closing poll: ${error.message}`); 
    } finally {
      setIsClosingPoll(false);
    }
  };
  
  
  
  
  const handleWithdrawRemainingFunds = async () => {
      // console.log(`Attempting to withdraw funds for poll ${pollId}`);
      
      // Add more checks? e.g., check if poll is actually ended and has funds
      if (!contract || !address || !isConnected || !pollDetails) {
           console.warn("Withdraw funds prerequisites not met.");
           return;
      }
    
       setWithdrawingFunds(true);
       setManagementMessage('');
       try {
           // console.log(`Calling withdrawRemainingFunds for poll ${pollId} by ${address}`);
          await withdrawRemainingFunds(contract, pollId, address); 
          // console.log("Withdraw funds successful, refetching...");
           setManagementMessage('Remaining funds withdrawn successfully.'); 
           await fetchPollDetails(); 
       } catch (error: any) {
           console.error(`Error withdrawing funds for poll ${pollId}:`, error);
           setManagementMessage(`Error withdrawing funds: ${error.message}`); 
    } finally {
           setWithdrawingFunds(false);
       }
  };

  
  const handlePausePoll = async () => {
      // console.log(`Attempting to pause poll ${pollId}`);
      if (!contract || !address || !isConnected || !pollDetails) return;

      setIsPausingPoll(true);
      setManagementMessage('');
      try {
          // console.log(`Calling pausePoll for poll ${pollId} by ${address}`);
          await pausePoll(contract, pollId, address); 
          // console.log("Pause successful, refetching...");
          setManagementMessage('Poll paused successfully.'); 
          await fetchPollDetails(); 
      } catch (error: any) {
          console.error(`Error pausing poll ${pollId}:`, error);
          setManagementMessage(`Error pausing poll: ${error.message}`); 
      } finally {
          setIsPausingPoll(false);
      }
  };

  
  const handleResumePoll = async () => {
      // console.log(`Attempting to resume poll ${pollId}`);
      if (!contract || !address || !isConnected || !pollDetails) return;

      setIsResumingPoll(true);
      setManagementMessage('');
      try {
          // console.log(`Calling resumePoll for poll ${pollId} by ${address}`);
          await resumePoll(contract, pollId, address); 
          // console.log("Resume successful, refetching...");
          setManagementMessage('Poll resumed successfully.'); 
          await fetchPollDetails(); 
      } catch (error: any) {
          console.error(`Error resuming poll ${pollId}:`, error);
          setManagementMessage(`Error resuming poll: ${error.message}`);
    } finally {
          setIsResumingPoll(false);
    }
  };

  
  const renderFollowButton = () => {
    if (!address || !pollDetails?.creator || address.toLowerCase() === pollDetails.creator.toLowerCase()) {
      return null; 
    }
    
    return (
      <button 
        onClick={handleFollow}
        disabled={isFollowingLoading}
        className={`px-3 py-1 text-sm rounded-full transition-colors ${
          isFollowing
            ? 'bg-[#FFD4E5] text-[#8F0C4C] border border-[#FFB0C8] hover:bg-[#FFC4D9]'
            : 'bg-[#E8F5FF] text-[#005A9C] border border-[#B3D9FF] hover:bg-[#D9EBFF]'
        } ${isFollowingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isFollowingLoading ? 'Processing...' : isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    );
  };
  
  const renderOptions = () => {
    if (!pollDetails || !pollDetails.options || pollDetails.options.length === 0) {
      return <p className="text-center text-gray-500 my-4">Poll options not found.</p>; 
    }
    
  return (
      <div className="space-y-3 mt-4">
        {pollDetails.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const hasUserVotedForThis = pollDetails.hasVoted && pollDetails.userVotedOption === index;
          
          return (
            <div 
              key={option.id} 
              onClick={() => !pollDetails.hasVoted && setSelectedOption(index)}
              className={`
                p-3 rounded-lg border transition-all duration-200 ease-in-out relative overflow-hidden
                ${pollDetails.hasVoted ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}
                ${isSelected && !pollDetails.hasVoted ? 'border-[#FF60A0] bg-[#FFF0F7]' : 'border-gray-200 bg-white'}
                ${hasUserVotedForThis ? 'border-[#8F0C4C] bg-[#FFECF5] ring-2 ring-[#FFB0C8]' : ''} 
              `}
            >
              <div className="flex justify-between items-center text-sm z-10 relative">
                <span className={`font-medium ${isSelected && !pollDetails.hasVoted ? 'text-[#8F0C4C]' : hasUserVotedForThis ? 'text-[#6D093A]' : 'text-gray-800'}`}>
                  {option.text}
                </span>
                <span className="text-gray-600 font-semibold">
                  {option.voteCount} Vote{option.voteCount !== 1 ? 's' : ''} (%{option.percentage.toFixed(1)})
                </span>
                  </div>
              
              {(pollDetails.hasVoted || pollDetails.ended) && (
                <div className="absolute top-0 left-0 h-full bg-[#FFD4E5] transition-width duration-500 ease-out z-0" 
                     style={{ width: `${option.percentage}%` }}>
          </div>
        )}
                  </div>
          );
        })}
      </div>
    );
  };

  
  const renderManagementSection = () => {
    if (!pollDetails) return null;
    
      const nowSeconds = Math.floor(Date.now() / 1000);
      const pollEndTimeSeconds = Math.floor((pollDetails.endTime || 0) / 1000); 
      
      // Anketin gerçekten sona erip ermediğini kontrol ederken isActive durumunu dikkate almamak gerekiyor
      // çünkü durdurulmuş (pause) anketler de isActive = false olur
      const timeHasEnded = pollEndTimeSeconds > 0 && nowSeconds >= pollEndTimeSeconds;
      const targetReached = pollDetails.targetVoterCount > 0 && pollDetails.totalVotes >= pollDetails.targetVoterCount;
      
      // Süre doldu veya hedef katılımcı sayısına ulaşıldı demek - gerçek sonlanma durumunu gösterir
      const hasPollEnded = timeHasEnded || targetReached || pollDetails.ended;
          
          return (
          <div className="mt-4 space-y-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800">Poll Management</h4> 
              
              
              {pollDetails.isActive && (
                  <div>
                     <button
                        onClick={handleClosePoll}
                        disabled={isClosingPoll || isPausingPoll} 
                        className={`w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                            isClosingPoll || isPausingPoll ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isClosingPoll ? 'Closing...' : 'Close Poll Now'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Ends the poll prematurely. This action cannot be undone.</p> 
                  </div>
              )}

              
              {pollDetails.isActive && (
                   <div>
                      <button
                          onClick={handlePausePoll}
                          disabled={isPausingPoll || isClosingPoll} 
                          className={`w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                              isPausingPoll || isClosingPoll ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700' 
                          }`}
                      >
                          {isPausingPoll ? 'Pausing...' : 'Pause Poll'} 
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Temporarily stops the poll, voting is disabled.</p> 
                  </div>
              )}
                  
               
               {/* Durdurulmuş anket ama süresi bitmemiş */}
               {!pollDetails.isActive && !hasPollEnded && ( 
                   <div>
                    <button
                          onClick={handleResumePoll}
                          disabled={isResumingPoll}
                          className={`w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                              isResumingPoll ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                          }`}
                      >
                          {isResumingPoll ? 'Resuming...' : 'Resume Poll'} 
                    </button>
                      <p className="text-xs text-gray-500 mt-1">Reactivates the paused poll.</p> 
                  </div>
               )}

              
              {pollDetails.rewardsEnabled && hasPollEnded && (
                           <div>
                              <button
                                  onClick={handleWithdrawRemainingFunds}
                                  disabled={withdrawingFunds}
                                  className={`w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                                      withdrawingFunds ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                  }`}
                              >
                          {withdrawingFunds ? 'Withdrawing...' : 'Withdraw Remaining Reward Funds'} 
                              </button>
                      <p className="text-xs text-gray-500 mt-1">Withdraws deposited and undistributed reward funds from the poll.</p> 
                </div>
              )}
              
              
              

              {managementMessage && (
                  <p className={`text-sm mt-2 ${managementMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                      {managementMessage}
                  </p>
              )}
            </div>
          );
  }

  
  
  const renderContent = () => {
      if (isLoading) return <div className="p-6 text-center text-gray-500">Loading...</div>; 
      if (error) return <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg">Error: {error}</div>; 
      if (!pollDetails) return <div className="p-6 text-center text-gray-500">Poll details not found.</div>; 

      const userIsCreator = isCreator === true || (address && pollDetails.creator && address.toLowerCase() === pollDetails.creator.toLowerCase());

  return (
          <div className="p-4 md:p-6 space-y-4">
              
              <div className="flex items-center justify-between bg-gradient-to-r from-[#FFF0F7] to-[#E8F5FF] p-3 rounded-lg border border-[#FFDAE9] shadow-sm">
              
              <div 
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => pollDetails && handleOpenProfileModal(pollDetails.creator)} 
                title={`View Profile: ${pollDetails?.creatorProfile?.name || pollDetails?.creator}`} 
              >
                     <div className="flex items-center space-x-3">
                         <img 
                              src={pollDetails.creatorProfile?.image || '/default-avatar.png'} 
                              alt={pollDetails.creatorProfile?.name || 'Poll Creator'} 
                              className="w-10 h-10 rounded-full border-2 border-white shadow"
                         />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 hover:text-[#ED1169] transition-colors">{pollDetails.creatorProfile?.name || 'Poll Creator'}</p> 
                            <p className="text-xs text-gray-500 hover:text-[#ED1169] transition-colors break-all">{pollDetails.creator}</p>
                   </div>
                 </div>
              </div>
                    {!userIsCreator && renderFollowButton()} 
              </div>
              
              
              {!userIsCreator && renderRequirementStatusInline()}

              
              <div className="mt-2">
                  <h3 className="text-lg font-semibold text-gray-900">{pollDetails.question}</h3>
                  {pollDetails.description && <p className="text-sm text-gray-600 mt-1">{pollDetails.description}</p>}
              </div>
              
             
             <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 border-t border-b border-gray-100 py-2">
                 
                 <span>Start: {new Date(pollDetails.startTime).toLocaleString('en-US')}</span> 
                 <span>{getRemainingTime(pollDetails.endTime)}</span>
                 <span className={`px-2 py-0.5 rounded-full text-white text-xs ${pollDetails.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                     {pollDetails.isActive ? 'Active' : 'Closed'} 
                 </span>
              </div>
              
              
              <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                      
            <button 
              onClick={() => setActiveTab(0)}
                          className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                              activeTab === 0 ? 'border-[#FF60A0] text-[#8F0C4C]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
            >
                          Options {userIsCreator ? '& Results' : '& Vote'} 
            </button>
                      
            <button 
                          onClick={() => { setActiveTab(1); if (!votersPerOption.length) fetchVoters(pollId); }}
                          className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                              activeTab === 1 ? 'border-[#FF60A0] text-[#8F0C4C]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                          Participants ({pollDetails.totalVotes}) 
            </button>
                      
                      {userIsCreator && (
              <button 
                onClick={() => setActiveTab(2)}
                              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                  activeTab === 2 ? 'border-[#FF60A0] text-[#8F0C4C]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
              >
                Management 
              </button>
            )}
                  </nav>
          </div>
          
              
              <div>
                  
          {activeTab === 0 && (
                      <div>
                          {renderOptions()} 
                          
                          
                          {!userIsCreator && (
                              <>
                                  {!pollDetails.hasVoted && pollDetails.isActive && canVote && (
                        <button
                                          onClick={() => handleVote(selectedOption!)}
                                          disabled={selectedOption === null || isVoting}
                                          className={`mt-4 w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                                              selectedOption === null || isVoting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#FF60A0] hover:bg-[#E64A8B]'
                                          }`}
                                      >
                                          {isVoting ? 'Voting...' : 'Vote'} 
                        </button>
                                  )}
                                  {pollDetails.hasVoted && pollDetails.rewardsEnabled && !pollDetails.hasClaimedReward && (
                                      <button
                                          onClick={handleClaimReward}
                                          disabled={isClaimingReward}
                                          className={`mt-4 w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                                              isClaimingReward ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#FF60A0] hover:bg-[#E64A8B]'
                                          }`}
                                      >
                                          {isClaimingReward ? 'Claiming...' : 'Claim Reward'} 
                                      </button>
                                  )}
                                  {(!canVote || voteErrorMessage) && !isVoting && pollDetails.isActive && (
                                      <div className="mt-3 p-2 text-center text-sm bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                                          {voteErrorMessage || "Voting conditions not met."} 
                      </div>
                    )}
                                  {pollDetails.hasVoted && (
                                      <div className="mt-3 p-2 text-center text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg">
                                          You voted in this poll. Your choice: {pollDetails.options.find(o => o.id === pollDetails.userVotedOption)?.text || 'Unknown'} 
                      </div>
                    )}
                                  {!pollDetails.isActive && !pollDetails.hasVoted && (
                                      <div className="mt-3 p-2 text-center text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                          You cannot vote as this poll is closed. 
                  </div>
                                  )}
                              </>
                          )} 
            </div>
          )}
          
                  
          {activeTab === 1 && (
                      <div className="mt-4 max-h-60 overflow-y-auto space-y-3 pr-2">
                         
              {isLoadingVoters ? (
                             <p className="text-center text-gray-500">Loading voters...</p> 
                         ) : votersPerOption.length > 0 && votersPerOption.some(arr => arr.length > 0) ? (
                             votersPerOption.map((voters, optionIndex) => (
                                 pollDetails.options[optionIndex] && voters.length > 0 && (
                                     <div key={optionIndex}>
                                         <h4 className="text-sm font-semibold text-gray-700 mb-1">Voters for "{pollDetails.options[optionIndex].text}":</h4> 
                                         <ul className="space-y-2">
                                             {voters.map((voter) => (
                                                 <li key={voter.address} className="flex items-center space-x-2 text-xs bg-white p-1.5 rounded shadow-sm">
                                      {voter.loading ? (
                                                         <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                                                     ) : (
                                                         <img src={voter.profile?.image || '/default-avatar.png'} alt={voter.profile?.name} className="w-6 h-6 rounded-full" />
                                                     )}
                                                     <span 
                                                       className="flex-1 truncate cursor-pointer hover:underline" 
                                                       onClick={() => handleOpenProfileModal(voter.address)}
                                                       title={`View Profile: ${voter.profile?.name || voter.address}`}
                                                    >
                                                       {voter.profile?.name || voter.address}
                                                     </span>
                                                 </li>
                                             ))}
                                         </ul>
                          </div>
                                 )
                    ))
                  ) : (
                             <p className="text-center text-gray-500">No voters yet.</p> 
              )}
            </div>
          )}
          
                  
                  {activeTab === 2 && userIsCreator && (
                      renderManagementSection() 
                  )}
                          </div>
                          
              
              {selectedProfileAddress && (
                <ProfileModal 
                  userAddress={selectedProfileAddress}
                  isOpen={!!selectedProfileAddress}
                  onClose={handleCloseProfileModal}
                />
             )}

          </div>
      );
  }

  return (
      <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Poll Details" 
      size="xl"
    >
          {renderContent()} 
     </Modal>
 );
};

export default PollDetailModal;