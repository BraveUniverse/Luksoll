// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title PollContract

 /$$       /$$   /$$ /$$   /$$  /$$$$$$   /$$$$$$  /$$$$$$$   /$$$$$$  /$$       /$$      
| $$      | $$  | $$| $$  /$$/ /$$__  $$ /$$__  $$| $$__  $$ /$$__  $$| $$      | $$      
| $$      | $$  | $$| $$ /$$/ | $$  \__/| $$  \ $$| $$  \ $$| $$  \ $$| $$      | $$      
| $$      | $$  | $$| $$$$$/  |  $$$$$$ | $$  | $$| $$$$$$$/| $$  | $$| $$      | $$      
| $$      | $$  | $$| $$  $$   \____  $$| $$  | $$| $$____/ | $$  | $$| $$      | $$      
| $$      | $$  | $$| $$\  $$  /$$  \ $$| $$  | $$| $$      | $$  | $$| $$      | $$      
| $$$$$$$$|  $$$$$$/| $$ \  $$|  $$$$$$/|  $$$$$$/| $$      |  $$$$$$/| $$$$$$$$| $$$$$$$$
|________/ \______/ |__/  \__/ \______/  \______/ |__/       \______/ |________/|________/
                                                                                          
                                                                                          
                                                                                          

 *
 * @dev A contract for creating and managing polls with optional rewards (LYX or LSP7)
 *      and various voting requirements based on LUKSO standards (LSP26, LSP7, LSP8).
 *      Includes features like pausing, resuming, permanent closing, data cleanup,
 *      permanent deletion, operator roles, and commission management.
 */

// --- INTERFACES ---

/**
 * @title Minimal ILSP7DigitalAsset Interface
 * @dev Defines functions needed from an LSP7 token contract.
 */
interface ILSP7DigitalAsset {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function authorizeOperator(address operator, uint256 amount, bytes memory data) external;
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function authorizedAmountFor(address operator, address tokenOwner) external view returns (uint256);
}

/**
 * @title Minimal ILSP26FollowerSystem Interface
 * @dev Defines the function needed to check follower status.
 */
interface ILSP26FollowerSystem {
    function isFollowing(address follower, address addr) external view returns (bool);
}

/**
 * @title Minimal ILSP8IdentifiableDigitalAsset Interface
 * @dev Defines the function needed to check NFT ownership.
 */
interface ILSP8IdentifiableDigitalAsset {
    function balanceOf(address owner) external view returns (uint256);
}

// --- MAIN CONTRACT ---


contract PollContract {
    // --- STATE VARIABLES ---

    // Reentrancy Guard
    uint private constant _NOT_ENTERED = 1;
    uint private constant _ENTERED = 2;
    uint private _status;
    
    // Addresses
    address constant LSP26_REGISTRY_ADDRESS = 0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA; // LUKSO LSP26 Registry
    address public owner;

    // Roles
    // mapping(address => bool) public isOperator; // REMOVED for MVP size reduction

    // Fees & Rates
    uint256 public pollCreationFee = 0.1 ether; // Fee for 2nd+ non-rewarded poll
    uint256 public combinedRequirementFee = 0.1 ether; // Additional fee for combined requirements
    uint public commissionRate = 10; // Commission percentage (e.g., 10 for 10%)

    // Enums
    enum RewardType { NATIVE, LSP7 }
    enum VotingRequirement { NONE, FOLLOWERS_ONLY, LSP7_HOLDER, LSP8_HOLDER, FOLLOWERS_AND_LSP7_HOLDER, FOLLOWERS_AND_LSP8_HOLDER }

    // Poll Struct
    struct Poll {
        string question;
        string description;
        string[] options;
        mapping(uint => uint) votes; // optionId => vote count
        mapping(address => bool) hasVoted;
        mapping(address => bool) hasClaimedReward;
        mapping(address => uint) userVotes; // voter => optionId
        address[] voterAddresses; // Stores voters - cleaned up by cleanupPollData
        uint startTime;
        uint endTime;
        bool isActive; // For pausing/resuming
        uint totalVotes;
        uint rewardPerVote; // In Wei for LYX, smallest unit for LSP7
        uint targetVoterCount;
        uint claimedVoterCount;
        address creator;
        bool rewardsEnabled;
        RewardType rewardType;
        address rewardToken; // LSP7 token address if rewardType is LSP7
        VotingRequirement votingRequirement;
        address requiredTokenAddress; // Address of required LSP7/LSP8
        uint256 requiredTokenAmount; // Min amount for LSP7 requirement
        bool fundsWithdrawn; // Have remaining funds been withdrawn by creator or owner?
        uint256 totalRewardTokenLocked; // Net total LSP7 reward amount locked in contract
        uint256 totalRewardNativeLocked; // Net LYX locked for rewards
        bool isDataCleaned; // Has cleanupPollData been called? (Options/voters deleted)
        bool permanentlyClosed; // Has closePollPermanently been called?
        bool isPermanentlyDeleted; // Has deletePollPermanently been called? (All data gone)
    }

    // Core Mappings
    mapping(uint => Poll) public polls;
    mapping(uint => uint256) public pollTokensClaimed; // pollId => total LSP7 claimed
    mapping(address => uint) public tokenCommissionEarned; // tokenAddress => earned LSP7 commission
    mapping(address => uint[]) private userVotedPolls; // user => array of pollIds voted on
    mapping(address => uint[]) private userCreatedPolls; // NEW: creator => array of pollIds created
    mapping(address => uint) public creatorActivePollCount; // creator => count of active polls (for fees)

    // Commission Tracking (LSP7)
    address[] private commissionEarnedTokenAddresses; // List of tokens with earned commission
    mapping(address => bool) private hasEarnedCommissionForToken; // Tracks if a token is in the list

    // User Points System
    mapping(address => uint) public userPoints;
    address[] private rankedUsers; // List of users who have earned points (not sorted)
    mapping(address => bool) private isUserRanked; // Tracks if a user is in rankedUsers
    
    // Global Counters & Totals
    uint public pollCount;
    uint public totalCommissionEarned; // Total LYX commission earned

    // --- EVENTS ---

    event PollCreated(uint indexed pollId, address indexed creator, string question, uint endTime);
    event Voted(uint indexed pollId, address indexed voter, uint indexed optionId);
    event PollPaused(uint indexed pollId, address indexed pausedBy);
    event PollResumed(uint indexed pollId, address indexed resumedBy);
    event PollClosedPermanently(uint indexed pollId, address indexed closedBy);
    event RewardClaimed(uint indexed pollId, address indexed voter, uint amount, address token);
    event CreatorWithdrewRemainingFunds(uint indexed pollId, address indexed creator, uint amount, address token);
    event CommissionWithdrawn(address indexed owner, uint amount, address indexed token); // token is address(0) for LYX
    event PollDataCleaned(uint indexed pollId, address indexed cleanedBy);
    event PollPermanentlyDeleted(uint indexed pollId, address indexed deletedBy);
    // event OperatorAdded(address indexed operator, address indexed addedBy); // REMOVED for MVP size reduction
    // event OperatorRemoved(address indexed operator, address indexed removedBy); // REMOVED for MVP size reduction
    event CommissionRateChanged(uint newRate);
    event PollCreationFeeChanged(uint256 newFee);
    event CombinedRequirementFeeChanged(uint256 newFee);
    event PollClosed(uint indexed pollId, address indexed closedBy);

    // --- CONSTRUCTOR ---
    
    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }
    
    // --- MODIFIERS ---

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     */
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Throws if the poll ID does not exist or the poll has been permanently deleted.
     */
    modifier pollExists(uint _pollId) {
        require(_pollId < pollCount, "Poll: does not exist");
        require(!polls[_pollId].isPermanentlyDeleted, "Poll: permanently deleted");
        _;
    }

    // --- OPERATOR MANAGEMENT --- // REMOVED for MVP size reduction

    // /**
    //  * @notice Adds an address to the list of operators.
    //  * @dev Can only be called by the owner.
    //  * @param _operator The address to add as an operator.
    //  */
    // function addOperator(address _operator) public onlyOwner {
    //     require(_operator != address(0), "Operator: zero address");
    //     require(!isOperator[_operator], "Operator: already operator");
    //     isOperator[_operator] = true;
    //     emit OperatorAdded(_operator, msg.sender);
    // }

    // /**
    //  * @notice Removes an address from the list of operators.
    //  * @dev Can only be called by the owner.
    //  * @param _operator The address to remove from operators.
    //  */
    // function removeOperator(address _operator) public onlyOwner {
    //     require(_operator != address(0), "Operator: zero address");
    //     require(isOperator[_operator], "Operator: not an operator");
    //     isOperator[_operator] = false;
    //     emit OperatorRemoved(_operator, msg.sender);
    // }

    // --- HELPER FUNCTIONS ---

    /**
     * @dev Internal function to check if a voting requirement is a combined one.
     */
    function _isRequirementCombined(VotingRequirement _req) internal pure returns (bool) {
        return _req == VotingRequirement.FOLLOWERS_AND_LSP7_HOLDER || _req == VotingRequirement.FOLLOWERS_AND_LSP8_HOLDER;
    }
    
    /**
     * @dev Internal function to award points to a user and add them to the ranked list if needed.
     */
    function _awardPoints(address _user, uint _points) internal {
        if (_points == 0) return;
        userPoints[_user] += _points;
        if (!isUserRanked[_user]) {
            rankedUsers.push(_user);
            isUserRanked[_user] = true;
        }
    }

    // --- POLL CREATION ---

    /**
     * @notice Creates a new poll with LYX rewards or no rewards.
     * @param _question The poll question.
     * @param _description The poll description.
     * @param _options An array of poll options (min 2).
     * @param _durationInHours Duration of the poll in hours.
     * @param _targetVoterCount Target number of voters (required for rewards).
     * @param _enableRewards Whether rewards are enabled (requires LYX payment if true).
     * @param _rewardPerVote The amount of LYX reward per vote (in Wei).
     * @param _votingRequirement The requirement for voters (NONE, FOLLOWERS_ONLY, etc.).
     * @param _requiredTokenAddress Address of the token required for LSP7/LSP8 requirements.
     * @param _requiredTokenAmount Minimum amount required for LSP7 requirement.
     * @dev Requires LYX payment covering fees and, if applicable, total rewards + commission.
     */
    function createPoll(
        string memory _question,
        string memory _description,
        string[] memory _options,
        uint128 _durationInHours,
        uint128 _targetVoterCount,
        bool _enableRewards,
        uint128 _rewardPerVote,
        VotingRequirement _votingRequirement,
        address _requiredTokenAddress,
        uint256 _requiredTokenAmount
    ) public payable nonReentrant {
        require(_options.length > 1, "Poll: min 2 options");
        require(_durationInHours > 0, "Poll: duration > 0");

        // --- Calculate Fees ALWAYS ---
        uint feeRequired = 0;
        if (creatorActivePollCount[msg.sender] > 0) {
            feeRequired += pollCreationFee;
        }
        if (_isRequirementCombined(_votingRequirement)) {
            feeRequired += combinedRequirementFee;
        }

        uint commissionAmount = 0;
        uint expectedTotalReward = 0; // Initialize

        if (_enableRewards) {
            // Calculate Rewards and Commission
            require(_targetVoterCount > 0, "Poll: rewards require target");
            require(_rewardPerVote > 0, "Poll: reward per vote > 0");

            expectedTotalReward = uint(_rewardPerVote) * uint(_targetVoterCount);
            commissionAmount = (expectedTotalReward * commissionRate) / 100;

            // Calculate Total Expected LYX (Rewards + Commission + Fees)
            uint expectedTotalSent = expectedTotalReward + commissionAmount + feeRequired;

            // Check msg.value against the total
            require(msg.value == expectedTotalSent, "Poll: incorrect total LYX sent (reward+commission+fee)");

            // Accumulate earnings (Commission + Fees)
            totalCommissionEarned += (commissionAmount + feeRequired);

        } else { // No LYX rewards
            require(_rewardPerVote == 0, "Poll: no reward, zero per vote");

            // Check msg.value against ONLY fees (since no reward/commission)
            require(msg.value == feeRequired, "Poll: incorrect fee sent");

            // Accumulate earnings (Fees only)
            if (feeRequired > 0) {
                totalCommissionEarned += feeRequired; // Add fee as LYX commission
            }
        }

        // Validate requirement addresses/amounts
        if (_votingRequirement == VotingRequirement.LSP7_HOLDER || _votingRequirement == VotingRequirement.FOLLOWERS_AND_LSP7_HOLDER) {
            require(_requiredTokenAddress != address(0), "Req: required LSP7 address");
            require(_requiredTokenAmount > 0, "Req: required LSP7 amount > 0");
        } else if (_votingRequirement == VotingRequirement.LSP8_HOLDER || _votingRequirement == VotingRequirement.FOLLOWERS_AND_LSP8_HOLDER) {
            require(_requiredTokenAddress != address(0), "Req: required LSP8 address");
        }

        // Create poll
        uint pollId = pollCount;
        Poll storage newPoll = polls[pollId];
        newPoll.question = _question;
        newPoll.description = _description;
        newPoll.options = _options;
        newPoll.isActive = true;
        newPoll.startTime = uint128(block.timestamp);
        // Ensure duration doesn't cause overflow if _durationInHours is huge
        uint256 endTimeTimestamp = block.timestamp + (uint256(_durationInHours) * 1 hours);
        require(endTimeTimestamp <= type(uint128).max, "Poll: duration too long");
        newPoll.endTime = uint128(endTimeTimestamp);
        newPoll.creator = msg.sender;
        newPoll.rewardsEnabled = _enableRewards;
        newPoll.targetVoterCount = _targetVoterCount;
        newPoll.rewardType = RewardType.NATIVE;
        newPoll.rewardPerVote = _rewardPerVote;
        // Store the *net* reward locked if rewards are enabled
        if(_enableRewards) {
             newPoll.totalRewardNativeLocked = expectedTotalReward;
        }
        newPoll.votingRequirement = _votingRequirement;
        newPoll.requiredTokenAddress = _requiredTokenAddress;
        newPoll.requiredTokenAmount = _requiredTokenAmount;
        // Other bools default to false

        _awardPoints(msg.sender, 10); // Award points to creator
        creatorActivePollCount[msg.sender]++;
        pollCount++;
        userCreatedPolls[msg.sender].push(pollId); // NEW: Track created poll ID

        emit PollCreated(pollId, msg.sender, _question, newPoll.endTime);
    }

    /**
     * @notice Creates a new poll with LSP7 token rewards.
     * @param _rewardPerVoteToken Amount of LSP7 token reward per vote (smallest unit).
     * @param _rewardTokenAddress Address of the LSP7 reward token.
     * @dev Requires LYX payment only for fees (pollCreationFee, combinedRequirementFee) if applicable.
     *      Token rewards and commission are handled via token transfer authorization.
     */
    function createPollWithToken(
        string memory _question,
        string memory _description,
        string[] memory _options,
        uint128 _durationInHours,
        uint128 _targetVoterCount,
        uint256 _rewardPerVoteToken,
        address _rewardTokenAddress,
        VotingRequirement _votingRequirement,
        address _requiredTokenAddress,
        uint256 _requiredTokenAmount
    ) public payable nonReentrant {
        require(_options.length > 1, "Poll: min 2 options");
        require(_durationInHours > 0, "Poll: duration > 0");
        require(_rewardTokenAddress != address(0), "Token: reward token address zero");
        require(_targetVoterCount > 0, "Poll: rewards require target");
        require(_rewardPerVoteToken > 0, "Token: reward per vote > 0");

        // Calculate and check LYX fee payment (ONLY fees)
        uint feeRequired = 0;
        if (creatorActivePollCount[msg.sender] > 0) { feeRequired += pollCreationFee; }
        if (_isRequirementCombined(_votingRequirement)) { feeRequired += combinedRequirementFee; }

        // Check msg.value against fees ONLY
        require(msg.value == feeRequired, "Poll: incorrect fee sent");
        if (feeRequired > 0) { totalCommissionEarned += msg.value; } // Add LYX fee to commission

        // Calculate token amounts
        uint256 netTotalRewardAmount = _rewardPerVoteToken * uint256(_targetVoterCount);
        uint256 commissionTokenAmount = (netTotalRewardAmount * commissionRate) / 100;
        uint256 totalTokensToTransfer = netTotalRewardAmount + commissionTokenAmount;

        // Check token balance and authorization, then transfer
        ILSP7DigitalAsset token = ILSP7DigitalAsset(_rewardTokenAddress);
        require(token.balanceOf(msg.sender) >= totalTokensToTransfer, "Token: insufficient balance");
        require(token.authorizedAmountFor(address(this), msg.sender) >= totalTokensToTransfer, "Token: not authorized");
        token.transfer(msg.sender, address(this), totalTokensToTransfer, true, "");

        // Store earned token commission and track token address if new
        if (commissionTokenAmount > 0) {
            tokenCommissionEarned[_rewardTokenAddress] += commissionTokenAmount;
            if (!hasEarnedCommissionForToken[_rewardTokenAddress]) {
                hasEarnedCommissionForToken[_rewardTokenAddress] = true;
                commissionEarnedTokenAddresses.push(_rewardTokenAddress);
            }
        }

         // Validate requirement addresses/amounts
        if (_votingRequirement == VotingRequirement.LSP7_HOLDER || _votingRequirement == VotingRequirement.FOLLOWERS_AND_LSP7_HOLDER) {
            require(_requiredTokenAddress != address(0), "Req: required LSP7 address");
            require(_requiredTokenAmount > 0, "Req: required LSP7 amount > 0");
        } else if (_votingRequirement == VotingRequirement.LSP8_HOLDER || _votingRequirement == VotingRequirement.FOLLOWERS_AND_LSP8_HOLDER) {
            require(_requiredTokenAddress != address(0), "Req: required LSP8 address");
        }

        // Create poll
        uint pollId = pollCount;
        Poll storage newPoll = polls[pollId];
        newPoll.question = _question;
        newPoll.description = _description;
        newPoll.options = _options;
        // Ensure duration doesn't cause overflow
        uint256 endTimeTimestamp = block.timestamp + (uint256(_durationInHours) * 1 hours);
        require(endTimeTimestamp <= type(uint128).max, "Poll: duration too long");
        newPoll.endTime = uint128(endTimeTimestamp);
        newPoll.isActive = true;
        newPoll.creator = msg.sender;
        newPoll.targetVoterCount = _targetVoterCount;
        newPoll.rewardsEnabled = true; // Token polls are always rewards enabled
        newPoll.rewardType = RewardType.LSP7;
        newPoll.rewardToken = _rewardTokenAddress;
        newPoll.rewardPerVote = _rewardPerVoteToken; // Store token amount per vote
        newPoll.votingRequirement = _votingRequirement;
        newPoll.requiredTokenAddress = _requiredTokenAddress;
        newPoll.requiredTokenAmount = _requiredTokenAmount;
        newPoll.totalRewardTokenLocked = netTotalRewardAmount; // Store net token reward locked

        _awardPoints(msg.sender, 10);
        creatorActivePollCount[msg.sender]++;
        pollCount++;
        userCreatedPolls[msg.sender].push(pollId); // NEW: Track created poll ID

        emit PollCreated(pollId, msg.sender, _question, newPoll.endTime);
    }

    // --- VOTING ---

    /**
     * @notice Casts a vote on a specific poll option.
     * @param _pollId The ID of the poll to vote on.
     * @param _optionId The index of the option to vote for.
     * @dev Checks poll status (active, not closed, time, target), voter status (not creator, not already voted),
     *      and voting requirements. Awards points to voter and creator. Deactivates poll if target is reached.
     */
    function vote(uint _pollId, uint _optionId) public pollExists(_pollId) nonReentrant {
        Poll storage poll = polls[_pollId];
        
        // Basic checks
        require(poll.isActive, "Poll: inactive");
        require(!poll.permanentlyClosed, "Poll: permanently closed");
        require(block.timestamp <= poll.endTime, "Poll: ended (time)");
        if (poll.rewardsEnabled && poll.targetVoterCount > 0) {
            require(poll.totalVotes < poll.targetVoterCount, "Poll: ended (target)");
        }
        require(!poll.hasVoted[msg.sender], "Vote: already voted");
        require(_optionId < poll.options.length, "Vote: invalid option");
        require(msg.sender != poll.creator, "Vote: creator cannot vote");

        // Voting requirement check
        VotingRequirement requirement = poll.votingRequirement;
        bool canVote = false;
        if (requirement == VotingRequirement.NONE) {
            canVote = true;
        } else if (requirement == VotingRequirement.FOLLOWERS_ONLY) {
            canVote = ILSP26FollowerSystem(LSP26_REGISTRY_ADDRESS).isFollowing(msg.sender, poll.creator);
        } else if (requirement == VotingRequirement.LSP7_HOLDER) {
            canVote = ILSP7DigitalAsset(poll.requiredTokenAddress).balanceOf(msg.sender) >= poll.requiredTokenAmount;
        } else if (requirement == VotingRequirement.LSP8_HOLDER) {
            canVote = ILSP8IdentifiableDigitalAsset(poll.requiredTokenAddress).balanceOf(msg.sender) > 0;
        } else if (requirement == VotingRequirement.FOLLOWERS_AND_LSP7_HOLDER) {
            canVote = ILSP26FollowerSystem(LSP26_REGISTRY_ADDRESS).isFollowing(msg.sender, poll.creator) &&
                      ILSP7DigitalAsset(poll.requiredTokenAddress).balanceOf(msg.sender) >= poll.requiredTokenAmount;
        } else if (requirement == VotingRequirement.FOLLOWERS_AND_LSP8_HOLDER) {
             canVote = ILSP26FollowerSystem(LSP26_REGISTRY_ADDRESS).isFollowing(msg.sender, poll.creator) &&
                       ILSP8IdentifiableDigitalAsset(poll.requiredTokenAddress).balanceOf(msg.sender) > 0;
        }
        require(canVote, "Vote: requirement not met");

        // Record vote
        poll.votes[_optionId]++;
        poll.hasVoted[msg.sender] = true;
        poll.userVotes[msg.sender] = _optionId;
        poll.totalVotes++;
        poll.voterAddresses.push(msg.sender); // Will be cleared by cleanup
        userVotedPolls[msg.sender].push(_pollId);
        
        // Award points
        _awardPoints(msg.sender, 1); // Voter
        _awardPoints(poll.creator, 1); // Creator

        // Deactivate poll if target reached (but not permanently closed)
        if (poll.rewardsEnabled && poll.targetVoterCount > 0 && poll.totalVotes >= poll.targetVoterCount) {
            if(poll.isActive) { // Only change state if it was active
            poll.isActive = false;
            if (creatorActivePollCount[poll.creator] > 0) { 
                     creatorActivePollCount[poll.creator]--; // Reduce active count
            }
            }
        }
        
        emit Voted(_pollId, msg.sender, _optionId);
    }

    // --- POLL MANAGEMENT ---

    /**
     * @notice Extends the duration of an active poll.
     * @dev Can only be called by the owner or the poll creator.
     * @param _pollId The ID of the poll to extend.
     * @param _additionalHours The number of hours to add to the end time.
     */
    function extendPollDuration(uint _pollId, uint32 _additionalHours) public pollExists(_pollId) {
        Poll storage poll = polls[_pollId];
        require(msg.sender == owner || msg.sender == poll.creator, "Auth: owner or creator only");
        require(poll.isActive, "Poll: inactive");
        require(!poll.permanentlyClosed, "Poll: permanently closed");
        require(block.timestamp <= poll.endTime, "Poll: already ended");
        require(_additionalHours > 0, "Time: additional hours > 0");

        poll.endTime += uint128(uint256(_additionalHours) * 1 hours);
        // Consider adding a PollExtended event
    }

    /**
     * @notice Pauses an active poll temporarily.
     * @dev Can only be called by the poll creator. Poll must be active, not ended, not permanently closed, and target not reached.
     * @param _pollId The ID of the poll to pause.
     */
    function pausePoll(uint _pollId) public pollExists(_pollId) {
        Poll storage poll = polls[_pollId];
        require(msg.sender == poll.creator, "Auth: creator only");
        require(poll.isActive, "Poll: already inactive");
        require(!poll.permanentlyClosed, "Poll: permanently closed");
        require(block.timestamp <= poll.endTime, "Poll: already ended");
        require(!(poll.rewardsEnabled && poll.targetVoterCount > 0 && poll.totalVotes >= poll.targetVoterCount), "Poll: target reached, cannot pause");

        poll.isActive = false;
        // Do not decrease active poll count here, it can be resumed
        emit PollPaused(_pollId, msg.sender);
    }

    /**
     * @notice Resumes a paused poll.
     * @dev Can only be called by the poll creator. Poll must be inactive, not ended, not permanently closed, and target not reached.
     * @param _pollId The ID of the poll to resume.
     */
    function resumePoll(uint _pollId) public pollExists(_pollId) {
        Poll storage poll = polls[_pollId];
        require(msg.sender == poll.creator, "Auth: creator only");
        require(!poll.isActive, "Poll: already active");
        require(!poll.permanentlyClosed, "Poll: permanently closed");
        require(block.timestamp <= poll.endTime, "Poll: already ended");
        require(!(poll.rewardsEnabled && poll.targetVoterCount > 0 && poll.totalVotes >= poll.targetVoterCount), "Poll: target reached, cannot resume");

        poll.isActive = true;
        emit PollResumed(_pollId, msg.sender);
    }

    /**
     * @notice Permanently closes a poll, preventing further voting or resuming.
     * @dev Can only be called by the owner (Operator functionality removed for MVP).
     * @param _pollId The ID of the poll to close permanently.
     */
    function closePollPermanently(uint _pollId) public pollExists(_pollId) onlyOwner { // MODIFIED: onlyOwnerOrOperator -> onlyOwner
        Poll storage poll = polls[_pollId];
        require(!poll.permanentlyClosed, "Poll: already permanently closed");

        poll.permanentlyClosed = true;
        if (poll.isActive) {
            poll.isActive = false;
             // Decrease active poll count if it was active and is now permanently closed
             if (creatorActivePollCount[poll.creator] > 0) {
                creatorActivePollCount[poll.creator]--;
             }
        }
        emit PollClosedPermanently(_pollId, msg.sender);
    }

    /**
     * @notice Allows the poll creator to manually close an active poll before its end time.
     * @param _pollId The ID of the poll to close.
     */
    function closePoll(uint _pollId) public pollExists(_pollId) nonReentrant {
        Poll storage poll = polls[_pollId];

        require(msg.sender == poll.creator, "PollClose: not creator");
        require(poll.isActive, "PollClose: already inactive");
        require(!poll.permanentlyClosed, "PollClose: permanently closed"); // Cannot close if already withdrawn etc.

        poll.isActive = false;
        poll.endTime = uint128(block.timestamp); // Set end time to now

        // Decrement active poll count for creator
        // Important: Only decrement if it was truly active before this call
        // The isActive check above ensures this, but double-check logic if isActive could be false for other reasons
        if (creatorActivePollCount[poll.creator] > 0) { // Prevent underflow
             creatorActivePollCount[poll.creator]--;
        }

        emit PollClosed(_pollId, msg.sender);
    }

    // --- REWARD & FUND MANAGEMENT ---

    /**
     * @notice Allows a voter to claim their reward for a poll.
     * @param _pollId The ID of the poll.
     * @dev Checks if rewards are enabled, voter has voted, and hasn't claimed yet.
     *      Transfers the LYX or LSP7 reward amount.
     */
    function claimReward(uint _pollId) public nonReentrant pollExists(_pollId) {
        Poll storage poll = polls[_pollId];
        require(poll.rewardsEnabled, "Reward: not enabled");
        require(poll.hasVoted[msg.sender], "Reward: not voted");
        require(!poll.hasClaimedReward[msg.sender], "Reward: already claimed");
        // Note: Poll doesn't strictly need to be inactive/ended to claim rewards

        poll.hasClaimedReward[msg.sender] = true; // Mark claimed first
        poll.claimedVoterCount++;

        if (poll.rewardType == RewardType.NATIVE) {
            uint rewardAmount = poll.rewardPerVote;
            require(address(this).balance >= rewardAmount, "Reward: insufficient LYX balance");
            (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
            require(success, "LYX Transfer Failed");
            emit RewardClaimed(_pollId, msg.sender, rewardAmount, address(0));
        } else { // LSP7
            uint256 rewardAmount = poll.rewardPerVote;
            address tokenAddress = poll.rewardToken;
            ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);

            require(token.balanceOf(address(this)) >= rewardAmount, "Reward: insufficient token balance");

            // Check against locked amount
            uint256 previouslyClaimed = pollTokensClaimed[_pollId];
            uint256 newTotalClaimed = previouslyClaimed + rewardAmount;
            require(newTotalClaimed <= poll.totalRewardTokenLocked, "Reward: claim exceeds locked amount");
            pollTokensClaimed[_pollId] = newTotalClaimed; // Update claimed amount

            token.transfer(address(this), msg.sender, rewardAmount, false, "");
            emit RewardClaimed(_pollId, msg.sender, rewardAmount, tokenAddress);
        }
    }
    
    /**
     * @notice Allows the poll creator to withdraw remaining, unclaimed reward funds after the poll has ended.
     * @param _pollId The ID of the poll.
     * @dev Poll must be ended (by time or target), and funds not already withdrawn.
     */
    function withdrawRemainingFunds(uint _pollId) public nonReentrant pollExists(_pollId) {
        Poll storage poll = polls[_pollId];
        require(msg.sender == poll.creator, "Auth: creator only");
        // Poll must be effectively ended
        require(!poll.isActive || block.timestamp > poll.endTime || (poll.targetVoterCount > 0 && poll.totalVotes >= poll.targetVoterCount), "Withdraw: poll still running");
        require(!poll.fundsWithdrawn, "Withdraw: funds already withdrawn");

        poll.fundsWithdrawn = true; // Mark withdrawn first

        if (poll.rewardsEnabled) {
             if (poll.rewardType == RewardType.NATIVE) {
                uint totalRewardPool = uint(poll.rewardPerVote) * uint(poll.targetVoterCount);
                uint claimedRewards = uint(poll.rewardPerVote) * uint(poll.claimedVoterCount);
                uint remainingReward = totalRewardPool > claimedRewards ? totalRewardPool - claimedRewards : 0;

                if (remainingReward > 0) {
                    require(address(this).balance >= remainingReward, "Withdraw: insufficient LYX balance");
                     payable(poll.creator).call{value: remainingReward}("");
                     emit CreatorWithdrewRemainingFunds(_pollId, poll.creator, remainingReward, address(0));
                }
            } else { // LSP7
                address tokenAddress = poll.rewardToken;
                ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
                uint256 totalLocked = poll.totalRewardTokenLocked;
                uint256 totalClaimed = pollTokensClaimed[_pollId];
                uint256 remainingTokens = totalLocked > totalClaimed ? totalLocked - totalClaimed : 0;

                if (remainingTokens > 0) {
                    require(token.balanceOf(address(this)) >= remainingTokens, "Withdraw: insufficient token balance");
                    token.transfer(address(this), poll.creator, remainingTokens, false, "");
                    emit CreatorWithdrewRemainingFunds(_pollId, poll.creator, remainingTokens, tokenAddress);
                }
            }
        }
        // Active poll count is decreased when poll ends/target reached/permanently closed. No change here.
    }

    /**
     * @notice Withdraws a specified amount of accumulated LYX commission.
     * @dev Can only be called by the owner.
     * @param _amountToWithdraw The amount of LYX (in Wei) to withdraw.
     */
    function withdrawCommission(uint _amountToWithdraw) public nonReentrant onlyOwner {
        require(_amountToWithdraw > 0, "Amount > 0");
        uint currentEarned = totalCommissionEarned;
        require(_amountToWithdraw <= currentEarned, "Withdraw > Earned");
        require(_amountToWithdraw <= address(this).balance, "Withdraw > Balance");

        totalCommissionEarned = currentEarned - _amountToWithdraw; // Decrease earned amount

        (bool success, ) = payable(owner).call{value: _amountToWithdraw}(""); // Transfer LYX
        require(success, "LYX Transfer Failed");

        emit CommissionWithdrawn(owner, _amountToWithdraw, address(0)); // token = address(0) for LYX
    }

    /**
     * @notice Withdraws a specified amount of accumulated LSP7 token commission.
     * @dev Can only be called by the owner. Token address remains in the trackable list even if balance becomes zero.
     * @param _tokenAddress The address of the LSP7 token commission to withdraw.
     * @param _amountToWithdraw The amount of token (smallest unit) to withdraw.
     */
    function withdrawTokenCommission(address _tokenAddress, uint256 _amountToWithdraw) public nonReentrant onlyOwner {
        require(_tokenAddress != address(0), "Token: Zero Address");
        require(_amountToWithdraw > 0, "Amount > 0");

        uint256 currentEarned = tokenCommissionEarned[_tokenAddress];
        require(_amountToWithdraw <= currentEarned, "Withdraw > Earned");

        ILSP7DigitalAsset token = ILSP7DigitalAsset(_tokenAddress);
        require(_amountToWithdraw <= token.balanceOf(address(this)), "Withdraw > Balance");

        tokenCommissionEarned[_tokenAddress] = currentEarned - _amountToWithdraw; // Decrease earned amount first

        // Attempt token transfer
        try token.transfer(address(this), owner, _amountToWithdraw, false, "") {
             // Success
             emit CommissionWithdrawn(owner, _amountToWithdraw, _tokenAddress);

        } catch {
            // Revert state change and the transaction if transfer fails
            tokenCommissionEarned[_tokenAddress] = currentEarned;
            revert("Token Transfer Failed");
        }
    }


    // --- DATA CLEANUP & DELETION ---

    /**
     * @notice Cleans up poll data (options, voter list) to save space.
     * @dev Can only be called by the owner (Operator functionality removed for MVP). Requires poll to be ended
     *      and funds withdrawn (if applicable). Cannot be called if permanently closed or already cleaned.
     * @param _pollId The ID of the poll to clean up.
     */
    function cleanupPollData(uint _pollId) public pollExists(_pollId) onlyOwner { // MODIFIED: onlyOwnerOrOperator -> onlyOwner
        Poll storage poll = polls[_pollId];
        require(!poll.permanentlyClosed, "Cleanup: permanently closed");
        require(!poll.isDataCleaned, "Cleanup: data already cleaned");
        require(poll.fundsWithdrawn || !poll.rewardsEnabled, "Cleanup: funds not withdrawn"); // Safety check

        delete poll.options;
        delete poll.voterAddresses;
        // Note: votes, hasVoted, userVotes mappings are NOT cleared due to gas costs.
        // Getters should handle the isDataCleaned flag.

        poll.isDataCleaned = true;
        emit PollDataCleaned(_pollId, msg.sender);
    }

    /**
     * @notice Cleans up data for multiple polls in a batch.
     * @dev Can only be called by the owner (Operator functionality removed for MVP). Skips polls that don't meet cleanup criteria.
     * @param _pollIds An array of poll IDs to attempt cleanup for.
     */
    function batchCleanupPollData(uint[] memory _pollIds) public onlyOwner { // MODIFIED: onlyOwnerOrOperator -> onlyOwner
        for (uint i = 0; i < _pollIds.length; i++) {
            uint pollId = _pollIds[i];
             // Check conditions before attempting cleanup (reduces unnecessary calls/checks inside cleanup)
             if (pollId < pollCount &&
                 !polls[pollId].isPermanentlyDeleted &&
                 !polls[pollId].permanentlyClosed &&
                 !polls[pollId].isDataCleaned &&
                 (polls[pollId].fundsWithdrawn || !polls[pollId].rewardsEnabled)
                )
             {
                 // No need for try-catch as internal call will revert if conditions fail again
                 cleanupPollData(pollId);
            }
        }
    }

    /**
     * @notice Permanently deletes a poll and its core data. Transfers remaining funds to the owner if not withdrawn by creator.
     * @dev Can only be called by the owner (Operator functionality removed for MVP). Cannot be called if already deleted.
     * @param _pollId The ID of the poll to delete permanently.
     */
    function deletePollPermanently(uint _pollId) public pollExists(_pollId) onlyOwner nonReentrant { // MODIFIED: onlyOwnerOrOperator -> onlyOwner
        Poll storage poll = polls[_pollId];
        require(!poll.isPermanentlyDeleted, "Delete: already permanently deleted");

        // --- Transfer remaining funds to OWNER if not withdrawn by creator ---
        if (poll.rewardsEnabled && !poll.fundsWithdrawn) {
            if (poll.rewardType == RewardType.NATIVE) {
                uint totalRewardPool = uint(poll.rewardPerVote) * uint(poll.targetVoterCount);
                uint claimedRewards = uint(poll.rewardPerVote) * uint(poll.claimedVoterCount);
                uint remainingReward = totalRewardPool > claimedRewards ? totalRewardPool - claimedRewards : 0;

                if (remainingReward > 0) {
                    require(address(this).balance >= remainingReward, "Delete: insufficient LYX for owner");
                    (bool success, ) = payable(owner).call{value: remainingReward}(""); // Transfer to owner
                    require(success, "Delete: LYX transfer to owner failed");
                }
            } else { // LSP7
                address tokenAddress = poll.rewardToken;
                ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
                uint256 totalLocked = poll.totalRewardTokenLocked;
                uint256 totalClaimed = pollTokensClaimed[_pollId];
                uint256 remainingTokens = totalLocked > totalClaimed ? totalLocked - totalClaimed : 0;

                if (remainingTokens > 0) {
                    require(token.balanceOf(address(this)) >= remainingTokens, "Delete: insufficient token for owner");
                    try token.transfer(address(this), owner, remainingTokens, false, "") { // Transfer to owner
                        // Success
                    } catch {
                        revert("Delete: token transfer to owner failed"); // Revert if owner transfer fails
                    }
                }
            }
            poll.fundsWithdrawn = true; // Mark funds as handled
        }
        // --- Fund transfer logic end ---

        // Delete core data
        delete poll.question;
        delete poll.description;
        delete poll.options;
        delete poll.voterAddresses;
        // Note: Mappings (votes, hasVoted, userVotes) are not cleared.

        // Reset other fields
        poll.startTime = 0;
        poll.endTime = 0;
        poll.isActive = false;
        poll.totalVotes = 0;
        poll.rewardPerVote = 0;
        poll.targetVoterCount = 0;
        poll.claimedVoterCount = 0;
        poll.rewardsEnabled = false;
        poll.rewardToken = address(0);
        poll.requiredTokenAddress = address(0);
        poll.requiredTokenAmount = 0;
        poll.totalRewardTokenLocked = 0;
        poll.totalRewardNativeLocked = 0;
        poll.isDataCleaned = true;       // Mark as cleaned
        poll.permanentlyClosed = true;  // Mark as closed
        poll.isPermanentlyDeleted = true; // Mark as deleted

        emit PollPermanentlyDeleted(_pollId, msg.sender);
    }


    // --- GETTER FUNCTIONS ---

    /**
     * @notice Checks if a specific voter has voted on a poll.
     * @dev Returns false if poll data is cleaned or poll is deleted.
     */
    function hasVoted(uint _pollId, address _voter) public view pollExists(_pollId) returns (bool) {
        if (polls[_pollId].isDataCleaned) return false;
        return polls[_pollId].hasVoted[_voter];
    }
    
    /**
     * @notice Checks if a specific voter has claimed their reward for a poll.
     */
    function hasClaimedReward(uint _pollId, address _voter) public view pollExists(_pollId) returns (bool) {
        return polls[_pollId].hasClaimedReward[_voter];
    }
    
    /**
     * @notice Returns the options for a poll.
     * @dev Returns an empty array if poll data is cleaned or poll is deleted.
     */
    function getPollOptions(uint _pollId) public view pollExists(_pollId) returns (string[] memory) {
        if (polls[_pollId].isDataCleaned) { return new string[](0); }
        return polls[_pollId].options;
    }
    
    /**
     * @notice Returns the vote count for a specific option in a poll.
     * @dev Returns 0 if poll data is cleaned, poll is deleted, or option is invalid.
     */
    function getPollVotes(uint _pollId, uint _optionId) public view pollExists(_pollId) returns (uint) {
         if (polls[_pollId].isDataCleaned || _optionId >= polls[_pollId].options.length) { return 0; }
        return polls[_pollId].votes[_optionId];
    }
    
    /**
     * @notice Returns the main details of a poll.
     * @dev Returns default/empty values if the poll is permanently deleted.
     */
    function getPollDetails(uint _pollId) public view pollExists(_pollId) returns (
        string memory question, string memory description, uint startTime, uint endTime,
        bool isActive, bool permanentlyClosed, bool isDataCleaned, uint totalVotes, uint targetVoterCount,
        uint rewardPerVote, address creator, bool rewardsEnabled, RewardType rewardType, address rewardToken,
        VotingRequirement votingRequirement, address requiredTokenAddress, uint256 requiredTokenAmount, bool fundsWithdrawn
    ) {
        Poll storage poll = polls[_pollId];
        // Return defaults if permanently deleted (already checked by pollExists modifier, but good practice)
        // if (poll.isPermanentlyDeleted) { return (...defaults...); }
        return (
            poll.question, poll.description, poll.startTime, poll.endTime,
            poll.isActive, poll.permanentlyClosed, poll.isDataCleaned, poll.totalVotes, poll.targetVoterCount,
            poll.rewardPerVote, poll.creator, poll.rewardsEnabled, poll.rewardType, poll.rewardToken,
            poll.votingRequirement, poll.requiredTokenAddress, poll.requiredTokenAmount, poll.fundsWithdrawn
        );
    }

    /**
     * @notice Returns a summary of the poll's current status flags.
     */
    function getPollStatus(uint _pollId) public view pollExists(_pollId) returns (
        bool isActiveNow, bool isPermanentlyClosed, bool hasEndedByTime, bool hasReachedTarget, uint endTime
    ) {
        Poll storage poll = polls[_pollId];
        bool ended = block.timestamp > poll.endTime;
        bool targetReached = poll.rewardsEnabled && poll.targetVoterCount > 0 && poll.totalVotes >= poll.targetVoterCount;
        isActiveNow = poll.isActive && !poll.permanentlyClosed && !ended && !targetReached;
        isPermanentlyClosed = poll.permanentlyClosed;
        hasEndedByTime = ended;
        hasReachedTarget = targetReached;
        endTime = poll.endTime;
        return (isActiveNow, isPermanentlyClosed, hasEndedByTime, hasReachedTarget, endTime);
    }

    /**
     * @notice Returns the question of a poll.
     */
    function getPollQuestion(uint _pollId) public view pollExists(_pollId) returns (string memory) {
        return polls[_pollId].question;
    }
    
    /**
     * @notice Attempts to retrieve basic details (name, symbol, decimals) of an LSP7 token.
     * @dev Uses default values if token contract doesn't implement standard functions or reverts.
     */
    function getTokenDetails(address _tokenAddress) public view returns (
        string memory name, string memory symbol, uint8 decimals
    ) {
        require(_tokenAddress != address(0), "Token: Zero Address");
        ILSP7DigitalAsset token = ILSP7DigitalAsset(_tokenAddress);
        name = "LSP7 Token"; symbol = "LSP7"; decimals = 18; // Defaults
        try token.name() returns (string memory _name) { name = _name; } catch {}
        try token.symbol() returns (string memory _symbol) { symbol = _symbol; } catch {}
        try token.decimals() returns (uint8 _decimals) { decimals = _decimals; } catch {}
        return (name, symbol, decimals);
    }

    /**
     * @notice Returns the contract's current LYX balance.
     */
    function getContractBalance() public view returns (uint) { return address(this).balance; }

    /**
     * @notice Returns the contract's current balance of a specific LSP7 token.
     */
    function getContractTokenBalance(address _tokenAddress) public view returns (uint) {
        require(_tokenAddress != address(0), "Token: Zero Address");
        ILSP7DigitalAsset token = ILSP7DigitalAsset(_tokenAddress);
        return token.balanceOf(address(this));
    }
    
    /**
     * @notice Checks if a poll's data has been cleaned up.
     */
    function isPollDataCleaned(uint _pollId) public view pollExists(_pollId) returns (bool) {
        return polls[_pollId].isDataCleaned;
    }

    /**
     * @notice Checks if a poll has been permanently deleted.
     * @dev Does not use pollExists modifier to allow checking deleted polls.
     */
    function isPollPermanentlyDeleted(uint _pollId) public view returns (bool) {
         if (_pollId >= pollCount) return false; // Non-existent poll cannot be deleted
         return polls[_pollId].isPermanentlyDeleted;
    }

    /**
     * @notice Returns the list of addresses that voted on a poll.
     * @dev Returns an empty array if poll data is cleaned.
     */
    function getVoters(uint _pollId) public view pollExists(_pollId) returns (address[] memory) {
        if (polls[_pollId].isDataCleaned) { return new address[](0); }
        return polls[_pollId].voterAddresses;
    }

    /**
     * @notice Returns the list of addresses that voted for a specific option.
     * @dev Returns an empty array if poll data is cleaned or option is invalid.
     *      May be gas intensive for large voter counts.
     */
    function getVotersByOption(uint _pollId, uint _optionId) public view pollExists(_pollId) returns (address[] memory) {
         if (polls[_pollId].isDataCleaned || _optionId >= polls[_pollId].options.length) { return new address[](0); }
        // ... (implementation remains the same - filters voterAddresses based on userVotes mapping) ...
        address[] memory allVoters = polls[_pollId].voterAddresses;
        uint count = 0;
        for (uint i = 0; i < allVoters.length; i++) {
            if (polls[_pollId].userVotes[allVoters[i]] == _optionId) {
                count++;
            }
        }
        address[] memory result = new address[](count);
        uint index = 0;
        for (uint i = 0; i < allVoters.length; i++) {
             if (polls[_pollId].userVotes[allVoters[i]] == _optionId) {
                result[index++] = allVoters[i];
            }
        }
        return result;
    }

    /**
     * @notice Returns the option ID a specific voter chose for a poll.
     * @dev Returns 0 if the user hasn't voted or data is cleaned (assuming option 0 is invalid).
     */
    function votedOption(uint _pollId, address _voter) public view pollExists(_pollId) returns (uint) {
        if (polls[_pollId].isDataCleaned || !polls[_pollId].hasVoted[_voter]) { return 0; } // Return 0 if no vote/cleaned
        return polls[_pollId].userVotes[_voter];
    }

    // --- CONFIGURATION SETTERS (Owner Only) ---

    /** @notice Sets the commission rate (0-100). */
    function setCommissionRate(uint _newRate) public onlyOwner { require(_newRate <= 100, "Rate: max 100"); commissionRate = _newRate; emit CommissionRateChanged(_newRate); }
    /** @notice Sets the fee for creating subsequent non-rewarded polls. */
    function setPollCreationFee(uint256 _newFee) public onlyOwner { pollCreationFee = _newFee; emit PollCreationFeeChanged(_newFee); }
    /** @notice Sets the additional fee for non-rewarded polls with combined requirements. */
    function setCombinedRequirementFee(uint256 _newFee) public onlyOwner { combinedRequirementFee = _newFee; emit CombinedRequirementFeeChanged(_newFee); }

    // --- USER INFO GETTERS ---

    /** @notice Returns the list of poll IDs a user has voted on. */
    function getUserVotedPollIds(address _user) public view returns (uint[] memory) { return userVotedPolls[_user]; }
    /** @notice Returns the points accumulated by a user. */
    function getUserPoints(address _user) public view returns (uint) { return userPoints[_user]; }
    /** @notice Returns the list of all users who have earned points (not sorted by points). */
    function getAllRankedUsers() public view returns (address[] memory) { return rankedUsers; }

    /** @notice Returns the number of currently active polls created by a specific user. */
    function getCreatorActivePollCount(address _creator) public view returns (uint) {
        require(_creator != address(0), "Creator: Zero Address");
        return creatorActivePollCount[_creator];
    }

    /**
     * @notice Returns the voting history for a user, including poll questions and chosen option text.
     * @dev Returns generic text if poll/option data was cleaned or deleted.
     */
    function getUserVotingHistory(address _user) public view returns (
        uint[] memory pollIds, uint[] memory optionIds, string[] memory questions, string[] memory options
    ) {
        uint[] memory userPolls = userVotedPolls[_user];
        uint voteCount = userPolls.length;
        
        if (voteCount == 0) { return (new uint[](0), new uint[](0), new string[](0), new string[](0)); }

        pollIds = new uint[](voteCount); optionIds = new uint[](voteCount);
        questions = new string[](voteCount); options = new string[](voteCount);
        
        for (uint i = 0; i < voteCount; i++) {
            uint pollId = userPolls[i];
                pollIds[i] = pollId;
            
            if (pollId < pollCount && !polls[pollId].isPermanentlyDeleted) {
            Poll storage poll = polls[pollId];
            questions[i] = poll.question;
                if (poll.hasVoted[_user] && !poll.isDataCleaned) {
                    uint userOptionId = poll.userVotes[_user];
                    optionIds[i] = userOptionId;
                    if (userOptionId < poll.options.length) {
                        options[i] = poll.options[userOptionId];
                    } else { options[i] = "Unknown Option"; }
                } else { optionIds[i] = 0; options[i] = "Data Cleaned / No Vote"; }
            } else { optionIds[i] = 0; questions[i] = "Poll Deleted"; options[i] = "Poll Deleted"; }
        }
        return (pollIds, optionIds, questions, options);
    }

    // --- OWNER COMMISSION GETTERS ---

     /** @notice Returns the list of LSP7 token addresses for which commission has been earned. */
    function getCommissionEarnedTokenAddresses() public view onlyOwner returns (address[] memory) {
        return commissionEarnedTokenAddresses;
    }

    /** @notice Returns the amount of commission earned for a specific LSP7 token. */
    function getTokenCommissionEarned(address _tokenAddress) public view onlyOwner returns (uint256) {
        require(_tokenAddress != address(0), "Token: Zero Address");
        return tokenCommissionEarned[_tokenAddress];
    }

    /** @notice Returns the total LYX commission earned. */
    // Note: totalCommissionEarned is public, this function is slightly redundant but provides explicit access control.
    function getTotalLYXCommission() external view onlyOwner returns (uint256) {
        return totalCommissionEarned;
    }

    // --- RECEIVE ETHER ---

    /** @dev Allows contract to receive LYX (e.g., for poll creation fees/rewards). */
    receive() external payable {}

    // --- Add the new getter function before other USER INFO GETTERS or at the end ---

    /** @notice Returns the list of poll IDs created by a specific user. */
    function getUserCreatedPollIds(address _creator) public view returns (uint[] memory) {
        return userCreatedPolls[_creator];
    }
} 