/**
 * Voting requirement types (Synced with Contract)
 */
export enum VotingRequirementType {
    NONE = 0,
    FOLLOWERS_ONLY = 1,
    LSP7_HOLDER = 2,
    LSP8_HOLDER = 3,
    FOLLOWERS_AND_LSP7_HOLDER = 4,
    FOLLOWERS_AND_LSP8_HOLDER = 5,
}

/**
 * Helper functions for voting requirements (Synced with Contract)
 */
export namespace VotingRequirementHelper {
    /**
     * Checks if the requirement type is a combined requirement
     */
    export function isCombined(requirementType: number): boolean {
        return requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER || 
               requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
    }

    /**
     * Checks if the requirement type requires being a follower
     */
    export function requiresFollower(requirementType: number): boolean {
        return requirementType === VotingRequirementType.FOLLOWERS_ONLY || 
               requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER || 
               requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
    }

    /**
     * Checks if the requirement type requires holding an LSP7 token
     */
    export function requiresLSP7(requirementType: number): boolean {
        return requirementType === VotingRequirementType.LSP7_HOLDER || 
               requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER;
    }

    /**
     * Checks if the requirement type requires holding an LSP8 NFT
     */
    export function requiresLSP8(requirementType: number): boolean {
        return requirementType === VotingRequirementType.LSP8_HOLDER || 
               requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
    }

    /**
     * Returns a description for the requirement type
     */
    export function getRequirementText(requirementType: number): string {
        const options = getRequirementOptions();
        return options[requirementType] || "Unknown Requirement";
    }
    
    /**
     * Returns the requirement options (labels for UI)
     * @returns Requirement types and their descriptions
     */
    export function getRequirementOptions(): { [key: number]: string } {
        return {
            [VotingRequirementType.NONE]: "Anyone (No restriction)",
            [VotingRequirementType.FOLLOWERS_ONLY]: "Followers Only",
            [VotingRequirementType.LSP7_HOLDER]: "Specific Token Holders",
            [VotingRequirementType.LSP8_HOLDER]: "Specific NFT Holders",
            [VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER]: "Followers AND Specific Token Holders",
            [VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER]: "Followers AND Specific NFT Holders",
        };
    }
} 