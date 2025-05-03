// Interface for a single poll option
export interface PollOption {
    id: number;
    text: string;
    voteCount: number;
    percentage: number;
}

// Interface for a single poll
export interface Poll {
    id: number;
    question: string;
    description?: string; // Optional description
    options: PollOption[];
    startTime: number; // Unix timestamp (ms)
    endTime: number; // Unix timestamp (ms)
    isActive: boolean;
    totalVotes: number;
    rewardPerVote: string; // Wei cinsinden string
    creator: string; // Creator address
    creatorProfile?: ProfileData | null; // Optional creator profile data
    rewardsEnabled: boolean;
    rewardType: number; // Enum: 0 for Native (LYX), 1 for LSP7
    rewardToken?: string; // LSP7 token address if rewardType is 1
    votingRequirement: number; // Enum for voting requirement
    requiredTokenAddress?: string; // Address of required LSP7/LSP8
    requiredMinTokenAmount?: string; // Min amount for LSP7 requirement
    targetVoterCount: number;
    // --- ADD MISSING FIELDS HERE ---
    permanentlyClosed?: boolean; // Added
    isDataCleaned?: boolean;     // Added
    fundsWithdrawn?: boolean;    // Added
    ended?: boolean;             // Added (calculated field)
}

// Interface for user profile data (simplified)
export interface ProfileData {
    name?: string;
    description?: string;
    image?: string; // Or profileImage depending on your LSP3 hook usage
    tags?: string[];
    links?: { title: string; url: string }[];
    profileImage?: { url: string; /* other LSP3 image fields */ }[];
    backgroundImage?: { url: string; /* other LSP3 image fields */ }[];
    avatar?: { url: string; /* other LSP3 image fields */ }[];
    // Add other fields used from LSP3ProfileManager if necessary
}

// Interface for voted poll info (used in profile view)
// ... VotedPollInfo interface definition ... 