export enum RewardType { NATIVE, LSP7 }

// VotingRequirementType ve VotingRequirementHelper'ı utils'den import etmek daha doğru olur
import { VotingRequirementType } from '@/utils/voting-requirements';

// AssetMetadata ve ProfileData arayüzlerini tutarlı tut
export interface AssetMetadata {
    name: string;
    iconUrl: string | null | undefined; // Cache'den potansiyel olarak undefined gelebilir
}

export interface ProfileData {
    name: string;
    image: string; // Geriye dönük uyumluluk için korundu
    description?: string;
    tags?: string[];
    links?: { title: string; url: string }[];
    profileImage?: string[]; // İşlenmiş URL'ler dizisi
    backgroundImage?: string[]; // İşlenmiş URL'ler dizisi
    avatar?: {
        url?: string;
        fileType?: string;
        verification?: {
            method?: string;
            data?: string;
            source?: string;
        };
        address?: string;
        tokenId?: string;
    }[];
}

// Poll arayüzünü ihtiyaçlara ve kontrat yapısına göre yeniden tanımla
export interface Poll {
    id: number;
    question: string;
    description: string;
    options: string[]; // Liste görünümü kartı için opsiyonel olabilir
    startTime: number; // Unix timestamp (saniye)
    endTime: number; // Unix timestamp (saniye)
    isActive: boolean;
    totalVotes: number;
    rewardPerVote: string; // Wei cinsinden string
    creator: string;
    rewardsEnabled: boolean;
    rewardType: RewardType;
    rewardToken: string; // 0x... veya address(0)
    votingRequirement: VotingRequirementType;
    requiredTokenAddress: string; // 0x... veya address(0)
    requiredMinTokenAmount: string; // Wei cinsinden string
    targetVoterCount: number;
    // Kontrattan gelen ek durumlar (linter hatası düzeltmesi)
    permanentlyClosed?: boolean;
    isDataCleaned?: boolean;
    fundsWithdrawn?: boolean;
    ended?: boolean; // Bu zaten getPollDetails içinde hesaplanıyor ama tipte olması iyi olur
    // --- Aşağıdaki alanlar frontend state yönetiminden gelir, kontrattan değil ---
    creatorProfile?: ProfileData | null;
    requiredAssetMetadata?: AssetMetadata | null;
    // PollListModal state'inden gelen alanlar (tutarlılık için)
    hasVotedCheck?: boolean | null;
    isFollowingCreator?: boolean | null;
    hasEnoughTokens?: boolean | null;
    hasNFT?: boolean | null;
    canVoteOverall?: boolean | null;
    isCheckingVote?: boolean;
    isCheckingFollow?: boolean;
    isCheckingToken?: boolean;
    isCheckingNft?: boolean;
}

// getUserVotingHistory dönüşüne göre oy verilen anket bilgisi tipi
export interface VotedPollInfo {
    pollId: number;
    optionId: number;
    question: string;
    optionText: string;
    // Opsiyonel ekstra detaylar (eğer ayrıca çekilirse)
    // endTime?: number;
    // isActive?: boolean;
} 