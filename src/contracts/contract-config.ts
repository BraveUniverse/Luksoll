import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { ERC725 } from '@erc725/erc725.js';
import LSP4Schema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';

// Enter the contract address here (LUKSO mainnet address)
export const CONTRACT_ADDRESS = '0x0726716C8A5C125F826aA038CBCFdF1000c9db87';

// Backup contract address (in case of error)
export const BACKUP_CONTRACT_ADDRESS = '0x0726716C8A5C125F826aA038CBCFdF1000c9db87';

// Create Web3 instance
export const getWeb3Instance = (provider: any) => {
	if (!provider) {
		console.error('Provider not found');
		return null;
	}
	
	try {
		const web3Instance = new Web3(provider);
		return web3Instance;
	} catch (error) {
		console.error('Error creating Web3 instance:', error);
		return null;
	}
};

// More robust approach to create contract instance
export const getContract = (web3Instance: Web3 | null, address = CONTRACT_ADDRESS) => {
	if (!web3Instance) {
		console.error('Web3 instance not found');
		return null;
	}
	
	try {
		return new web3Instance.eth.Contract(POLL_CONTRACT_ABI, address);
	} catch (error) {
		console.error('Error creating contract instance:', error);
		
		// Try again with the backup address
		if (address === CONTRACT_ADDRESS) {
			console.log('Trying backup contract address...');
			try {
				return new web3Instance.eth.Contract(POLL_CONTRACT_ABI, BACKUP_CONTRACT_ADDRESS);
			} catch (backupError) {
				console.error('Error creating backup contract instance:', backupError);
				return null;
			}
		}
		
		return null;
	}
};

// Contract ABI
export const POLL_CONTRACT_ABI =[
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newFee",
				"type": "uint256"
			}
		],
		"name": "CombinedRequirementFeeChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newRate",
				"type": "uint256"
			}
		],
		"name": "CommissionRateChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "CommissionWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "CreatorWithdrewRemainingFunds",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "closedBy",
				"type": "address"
			}
		],
		"name": "PollClosed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "closedBy",
				"type": "address"
			}
		],
		"name": "PollClosedPermanently",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "question",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			}
		],
		"name": "PollCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newFee",
				"type": "uint256"
			}
		],
		"name": "PollCreationFeeChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "cleanedBy",
				"type": "address"
			}
		],
		"name": "PollDataCleaned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "pausedBy",
				"type": "address"
			}
		],
		"name": "PollPaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "deletedBy",
				"type": "address"
			}
		],
		"name": "PollPermanentlyDeleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "resumedBy",
				"type": "address"
			}
		],
		"name": "PollResumed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "voter",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "RewardClaimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "voter",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "optionId",
				"type": "uint256"
			}
		],
		"name": "Voted",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_pollIds",
				"type": "uint256[]"
			}
		],
		"name": "batchCleanupPollData",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "claimReward",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "cleanupPollData",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "closePoll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "closePollPermanently",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "combinedRequirementFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "commissionRate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_question",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_description",
				"type": "string"
			},
			{
				"internalType": "string[]",
				"name": "_options",
				"type": "string[]"
			},
			{
				"internalType": "uint128",
				"name": "_durationInHours",
				"type": "uint128"
			},
			{
				"internalType": "uint128",
				"name": "_targetVoterCount",
				"type": "uint128"
			},
			{
				"internalType": "bool",
				"name": "_enableRewards",
				"type": "bool"
			},
			{
				"internalType": "uint128",
				"name": "_rewardPerVote",
				"type": "uint128"
			},
			{
				"internalType": "enum PollContract.VotingRequirement",
				"name": "_votingRequirement",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "_requiredTokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_requiredTokenAmount",
				"type": "uint256"
			}
		],
		"name": "createPoll",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_question",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_description",
				"type": "string"
			},
			{
				"internalType": "string[]",
				"name": "_options",
				"type": "string[]"
			},
			{
				"internalType": "uint128",
				"name": "_durationInHours",
				"type": "uint128"
			},
			{
				"internalType": "uint128",
				"name": "_targetVoterCount",
				"type": "uint128"
			},
			{
				"internalType": "uint256",
				"name": "_rewardPerVoteToken",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_rewardTokenAddress",
				"type": "address"
			},
			{
				"internalType": "enum PollContract.VotingRequirement",
				"name": "_votingRequirement",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "_requiredTokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_requiredTokenAmount",
				"type": "uint256"
			}
		],
		"name": "createPollWithToken",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "creatorActivePollCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "deletePollPermanently",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "uint32",
				"name": "_additionalHours",
				"type": "uint32"
			}
		],
		"name": "extendPollDuration",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllRankedUsers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCommissionEarnedTokenAddresses",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_tokenAddress",
				"type": "address"
			}
		],
		"name": "getContractTokenBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_creator",
				"type": "address"
			}
		],
		"name": "getCreatorActivePollCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getPollDetails",
		"outputs": [
			{
				"internalType": "string",
				"name": "question",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "permanentlyClosed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isDataCleaned",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalVotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "targetVoterCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "rewardPerVote",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "rewardsEnabled",
				"type": "bool"
			},
			{
				"internalType": "enum PollContract.RewardType",
				"name": "rewardType",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "rewardToken",
				"type": "address"
			},
			{
				"internalType": "enum PollContract.VotingRequirement",
				"name": "votingRequirement",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "requiredTokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "requiredTokenAmount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "fundsWithdrawn",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getPollOptions",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getPollQuestion",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getPollStatus",
		"outputs": [
			{
				"internalType": "bool",
				"name": "isActiveNow",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isPermanentlyClosed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "hasEndedByTime",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "hasReachedTarget",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_optionId",
				"type": "uint256"
			}
		],
		"name": "getPollVotes",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_tokenAddress",
				"type": "address"
			}
		],
		"name": "getTokenCommissionEarned",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_tokenAddress",
				"type": "address"
			}
		],
		"name": "getTokenDetails",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "symbol",
				"type": "string"
			},
			{
				"internalType": "uint8",
				"name": "decimals",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTotalLYXCommission",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_creator",
				"type": "address"
			}
		],
		"name": "getUserCreatedPollIds",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "getUserPoints",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "getUserVotedPollIds",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "getUserVotingHistory",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "pollIds",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "optionIds",
				"type": "uint256[]"
			},
			{
				"internalType": "string[]",
				"name": "questions",
				"type": "string[]"
			},
			{
				"internalType": "string[]",
				"name": "options",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getVoters",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_optionId",
				"type": "uint256"
			}
		],
		"name": "getVotersByOption",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_voter",
				"type": "address"
			}
		],
		"name": "hasClaimedReward",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_voter",
				"type": "address"
			}
		],
		"name": "hasVoted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "isPollDataCleaned",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "isPollPermanentlyDeleted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "pausePoll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pollCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pollCreationFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "pollTokensClaimed",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "polls",
		"outputs": [
			{
				"internalType": "string",
				"name": "question",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalVotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "rewardPerVote",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "targetVoterCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "claimedVoterCount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "rewardsEnabled",
				"type": "bool"
			},
			{
				"internalType": "enum PollContract.RewardType",
				"name": "rewardType",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "rewardToken",
				"type": "address"
			},
			{
				"internalType": "enum PollContract.VotingRequirement",
				"name": "votingRequirement",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "requiredTokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "requiredTokenAmount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "fundsWithdrawn",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalRewardTokenLocked",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalRewardNativeLocked",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isDataCleaned",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "permanentlyClosed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isPermanentlyDeleted",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "resumePoll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newFee",
				"type": "uint256"
			}
		],
		"name": "setCombinedRequirementFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newRate",
				"type": "uint256"
			}
		],
		"name": "setCommissionRate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newFee",
				"type": "uint256"
			}
		],
		"name": "setPollCreationFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "tokenCommissionEarned",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalCommissionEarned",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userPoints",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_optionId",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_voter",
				"type": "address"
			}
		],
		"name": "votedOption",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_amountToWithdraw",
				"type": "uint256"
			}
		],
		"name": "withdrawCommission",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "withdrawRemainingFunds",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_tokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amountToWithdraw",
				"type": "uint256"
			}
		],
		"name": "withdrawTokenCommission",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

// Check if running in browser environment
const isBrowser = () => typeof window !== 'undefined';

// VotingRequirementType enum - **MUST MATCH PollContract.sol**
export enum VotingRequirementType {
	NONE = 0,
	FOLLOWERS_ONLY = 1,             // Renamed from LSP26_FOLLOWER
	LSP7_HOLDER = 2,                // Renamed from LSP7_TOKEN
	LSP8_HOLDER = 3,                // Corrected value from 4 to 3, Renamed from LSP8_NFT
	FOLLOWERS_AND_LSP7_HOLDER = 4, // Corrected value from 3 to 4, Renamed from LSP26_FOLLOWER_AND_LSP7_TOKEN
	FOLLOWERS_AND_LSP8_HOLDER = 5, // Corrected value (was already 5), Renamed from LSP26_FOLLOWER_AND_LSP8_NFT
	// Removed LSP7_TOKEN_AND_LSP8_NFT = 6 and ALL = 7 as they are not in the current contract
}

// Type-safe helper functions for VotingRequirementType
// **UPDATED TO USE CORRECT ENUM VALUES AND NAMES**
export namespace VotingRequirementHelper {
	// Is this a combined requirement?
	export function isCombined(requirementType: number): boolean {
		return requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER ||
			   requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
		// NONE and FOLLOWERS_ONLY are not combined requirements
	}

	// Does it require followers?
	export function requiresFollower(requirementType: number): boolean {
		return requirementType === VotingRequirementType.FOLLOWERS_ONLY ||
			   requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER ||
			   requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
		// NONE does not require followers
	}

	// Does it require LSP7 token?
	export function requiresLSP7(requirementType: number): boolean {
		return requirementType === VotingRequirementType.LSP7_HOLDER ||
			   requirementType === VotingRequirementType.FOLLOWERS_AND_LSP7_HOLDER;
		// NONE and FOLLOWERS_ONLY do not require tokens
	}

	// Does it require LSP8 NFT?
	export function requiresLSP8(requirementType: number): boolean {
		return requirementType === VotingRequirementType.LSP8_HOLDER ||
			   requirementType === VotingRequirementType.FOLLOWERS_AND_LSP8_HOLDER;
		// NONE and FOLLOWERS_ONLY do not require NFTs
	}
}

/**
 * Creates a PollContract instance
 * @param provider Web3 provider instance
 * @returns Contract instance or null
 */
export const createPollContract = async (provider: any) => {
	if (!isBrowser()) return null;
	
	try {
		const web3 = new Web3(provider);
		return new web3.eth.Contract(POLL_CONTRACT_ABI, CONTRACT_ADDRESS);
	} catch (error) {
		console.error('Error creating contract instance:', error);
		return null;
	}
};

/**
 * Creates a read-only PollContract instance
 * @param provider Web3 provider instance
 * @returns Contract instance or null
 */
export const createReadOnlyPollContract = (provider: any) => {
	if (!isBrowser()) return null;
	
	try {
		const web3 = new Web3(provider);
		return new web3.eth.Contract(POLL_CONTRACT_ABI, CONTRACT_ADDRESS);
	} catch (error) {
		console.error('Error creating read-only contract instance:', error);
		return null;
	}
};

/**
 * Creates a poll (LYX reward)
 * @param contract Contract instance
 * @param question Poll question
 * @param description Poll description
 * @param options Poll options
 * @param durationInHours Poll duration (hours)
 * @param targetVoterCount Target number of votes
 * @param enableRewards Whether rewards are enabled
 * @param requirementType Voting requirement type (bitmask)
 * @param requiredTokenOrNftAddress Required token/NFT address
 * @param requiredMinTokenAmount Minimum required token amount
 * @param rewardAmount Reward amount (LYX - in wei)
 * @param account User address
 */
export const createPoll = async (
	contract: any,
	question: string,
	description: string,
	options: string[],
	durationInHours: number,
	targetVoterCount: number,
	enableRewards: boolean,
	requirementType: number,
	requiredTokenOrNftAddress: string,
	requiredMinTokenAmount: string,
	rewardAmount: string,
	account: string
) => {
	try {
		return await contract.methods.createPoll(
			question,
			description,
			options,
			durationInHours,
			targetVoterCount,
			enableRewards,
			requirementType,
			requiredTokenOrNftAddress || '0x0000000000000000000000000000000000000000',
			requiredMinTokenAmount || '0'
		).send({
			from: account,
			value: rewardAmount
		});
	} catch (error) {
		console.error('Error creating poll:', error);
		throw error;
	}
};

/**
 * Creates a token-reward poll
 * @param contract Contract instance
 * @param question Poll question
 * @param description Poll description
 * @param options Poll options
 * @param durationInHours Poll duration (hours)
 * @param targetVoterCount Target number of votes
 * @param enableRewards Whether rewards are enabled
 * @param tokenAddress Token address
 * @param tokenAmount Token amount
 * @param requirementType Voting requirement type (bitmask)
 * @param requiredTokenOrNftAddress Required token/NFT address
 * @param requiredMinTokenAmount Minimum required token amount
 * @param fee Fee to be paid (in wei)
 * @param account User address
 */
export const createPollWithToken = async (
	contract: any,
	question: string,
	description: string,
	options: string[],
	durationInHours: number,
	targetVoterCount: number,
	enableRewards: boolean,
	tokenAddress: string,
	tokenAmount: string,
	requirementType: number,
	requiredTokenOrNftAddress: string,
	requiredMinTokenAmount: string,
	fee: string,
	account: string
) => {
	try {
		return await contract.methods.createPollWithToken(
			question,
			description,
			options,
			durationInHours,
			targetVoterCount,
			enableRewards,
			tokenAddress,
			tokenAmount,
			requirementType,
			requiredTokenOrNftAddress || '0x0000000000000000000000000000000000000000',
			requiredMinTokenAmount || '0'
		).send({
			from: account,
			value: fee
		});
	} catch (error) {
		console.error('Error creating token-reward poll:', error);
		throw error;
	}
};

/**
 * Votes on a poll
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param optionId Option ID
 * @param account User address
 */
export const vote = async (
	contract: any,
	pollId: number,
	optionId: number,
	account: string
) => {
	console.log(`[Vote] Calling vote method with pollId=${pollId}, optionId=${optionId}, account=${account}`);
	
	try {
		// Estimate gas for the transaction - Temporary removed
		// const gasEstimate = await contract.methods.vote(pollId, optionId).estimateGas({ from: account }); 
		// console.log(`[Vote] Gas estimate: ${gasEstimate}`);
		
		// Send transaction with increased gas allowance
		const tx = await contract.methods.vote(pollId, optionId).send({
			from: account,
			// gas: Math.floor(gasEstimate * 1.2) // %20 extra gas
		});
		
		console.log(`[Vote] Transaction hash: ${tx.transactionHash}`);
		return tx;
	} catch (error: any) {
		console.error("[Vote] Error voting on poll:", error);
		
		// More detailed error messages
		if (error.code === 4001) {
			throw new Error("Transaction rejected by user.");
		} else if (error.message && error.message.includes("User denied")) {
			throw new Error("Transaction rejected by user.");
		} else if (error.message && error.message.includes("revert")) {
			// Contract revert reason
			let revertReason = "Contract transaction failed";
			
			if (error.message.includes("already voted")) {
				revertReason = "You have already voted in this poll";
			} else if (error.message.includes("poll is not active")) {
				revertReason = "This poll is no longer active";
			} else if (error.message.includes("requirements not met")) {
				revertReason = "You do not meet the voting requirements";
			}
			
			throw new Error(revertReason);
		}
		
		throw error;
	}
};

/**
 * Claims a reward from a poll
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param account User address
 */
export const claimReward = async (
	contract: any,
	pollId: number,
	account: string
) => {
	try {
		return await contract.methods.claimReward(pollId).send({
			from: account
		});
	} catch (error) {
		console.error('Error claiming reward:', error);
		throw error;
	}
};

/**
 * Gets poll details
 * Anket detaylarını getirme fonksiyonu
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 */
export const getPollDetails = async (contract: any, pollId: number, web3: Web3 | null) => {
	try {
		console.log(`[DEBUG] Calling contract.methods.getPollDetails(${pollId}).call()...`); // Log before call
		
        // --- START: Wrap contract call in try-catch --- 
        let detailsResult: any;
        try {
             detailsResult = await contract.methods.getPollDetails(pollId).call();
        } catch (contractCallError: any) {
             console.error(`[ERROR] Direct contract call failed for getPollDetails(${pollId}):`, contractCallError.message || contractCallError);
             // If call fails (revert, poll deleted etc.), throw a specific error or return null/empty structure
             if (contractCallError.message?.includes("Poll: does not exist")) {
			    throw new Error(`Poll ${pollId} not found.`);
		    } else if (contractCallError.message?.includes("Poll: permanently deleted")) {
			    throw new Error(`Poll ${pollId} has been permanently deleted.`);
		    } else {
                 // Throw a generic error indicating failure to fetch details for this specific poll
                throw new Error(`Failed to retrieve raw details for poll ${pollId} from contract.`);
            }
        }
        // --- END: Wrap contract call in try-catch ---

		// Log the raw result BEFORE any processing
		console.log(`[DEBUG] Raw detailsResult from contract for poll ${pollId}:`, detailsResult);
		// Try logging with BigInts converted to strings for readability
		try {
			const replacer = (key: string, value: any) => typeof value === 'bigint' ? value.toString() : value;
			console.log(`[DEBUG] Raw detailsResult (BigInts as Strings) for poll ${pollId}:\n`, JSON.stringify(detailsResult, replacer, 2));
		} catch (logErr) {
			console.error("[ERROR] Failed to stringify raw detailsResult:", logErr);
		}

		// Fetch options separately
		const options = await contract.methods.getPollOptions(pollId).call();
        console.log(`[DEBUG] fetchPollDetails: Anket seçenekleri:`, options);

		// Fetch votes individually with error handling
        const optionVotes: number[] = [];
        for (let index = 0; index < options.length; index++) {
            try {
                console.log(`[DEBUG] fetchPollDetails: Getting votes for option index ${index}...`);
                const votesRaw = await contract.methods.getPollVotes(pollId, index).call();
                optionVotes.push(Number(votesRaw || 0));
                console.log(`[DEBUG] fetchPollDetails: Votes for option index ${index}: ${Number(votesRaw || 0)}`);
            } catch (voteError) {
                // Log specific error for vote fetching failure
                console.warn(`[UYARI] Oy sayıları alınamadı (poll ${pollId}, option ${index}):`, voteError); 
                optionVotes.push(0); // Push 0 if fetching votes fails for this option
            }
        }

		const totalVotes = Number(detailsResult[7] || 0); // Use totalVotes from main details

		// Process endTime safely using index 3
		const calculatedEndTime = Number(detailsResult[3] || 0) * 1000;
		// Process isActive using index 4
		const isActive = Boolean(detailsResult[4]);
		const pollEnded = !isActive || (calculatedEndTime > 0 && Date.now() >= calculatedEndTime);

		// Construct the base poll object using INDEXED access from the CORRECTED (deployed) structure
		const formattedPollBase = { 
			question: detailsResult[0],                               // Index 0
			description: detailsResult[1] || '',                    // Index 1
			startTime: Number(detailsResult[2] || 0) * 1000,       // Index 2
			endTime: calculatedEndTime,                           // Index 3 (processed)
			isActive: isActive,                                   // Index 4 (processed)
			permanentlyClosed: Boolean(detailsResult[5]),         // Index 5
			isDataCleaned: Boolean(detailsResult[6]),             // Index 6
			totalVotes: totalVotes,                               // Index 7 (processed)
			targetVoterCount: Number(detailsResult[8] || 0),       // Index 8
			rewardPerVote: web3 ? web3.utils.fromWei(detailsResult[9]?.toString() || '0', 'ether') : '0', // Index 9
			creator: detailsResult[10],                            // Index 10
			rewardsEnabled: Boolean(detailsResult[11]),           // Index 11
			rewardType: Number(detailsResult[12] || 0),           // Index 12
			rewardToken: detailsResult[13] || '0x00...',        // Index 13
			votingRequirement: Number(detailsResult[14] || 0),    // Index 14
			requiredTokenAddress: detailsResult[15] || '0x00...', // Index 15
			requiredMinTokenAmount: detailsResult[16]?.toString() || '0', // Index 16
			fundsWithdrawn: Boolean(detailsResult[17]),            // Index 17
			ended: pollEnded,
			options: options.map((text: string, idx: number) => ({
				id: idx,
				text: text,
				voteCount: optionVotes[idx] || 0, // Use fetched votes
				percentage: totalVotes > 0 ? ((optionVotes[idx] || 0) / totalVotes) * 100 : 0,
			})),
			optionVotes: optionVotes, // Return the fetched votes array
		};

		console.log('[DEBUG] fetchPollDetails: Successfully processed details using CORRECTED indexed access, returning formatted poll base.');
		
		return formattedPollBase;

	} catch (error) {
		console.error(`[ERROR] Error processing details for poll ${pollId}:`, error);
		// Re-throw the processed error or a generic one
        throw new Error(`Failed to process poll details for ${pollId}: ${error instanceof Error ? error.message : error}`);
	}
};

// --- IMPORTANT ---
// The calling component (PollDetailModal.tsx) needs to be updated:
// 1. Pass the `web3` instance to `getPollDetails`.
// 2. Adapt to the structure returned by `getPollDetails` (which no longer includes user-specific fields like hasVoted).
// 3. Fetch user-specific data (hasVoted, hasClaimedReward, canClaimReward, userVotedOption) within the component's useEffect hooks using the connected `address`.

/**
 * Kullanıcının oy kullanıp kullanmadığını kontrol etme fonksiyonu
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 * @param voterAddress Oy veren adresi
 */
export const hasVoted = async (contract: any, pollId: number, voterAddress: string) => {
	try {
		return await contract.methods.hasVoted(pollId, voterAddress).call();
	} catch (error) {
		console.error('Oy kontrolü hatası:', error);
		throw error;
	}
};

/**
 * Anketi kapatma fonksiyonu
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 * @param account Kullanıcı adresi
 */
export const closePoll = async (contract: any, pollId: number, account: string) => {
	try {
		return await contract.methods.closePoll(pollId).send({
			from: account
		});
	} catch (error) {
		console.error('Anketi kapatma hatası:', error);
		throw error;
	}
};

/**
 * Kalan ödül fonlarını çekme fonksiyonu
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 * @param account Kullanıcı adresi
 */
export const withdrawRemainingFunds = async (contract: any, pollId: number, account: string) => {
	try {
		console.log(`[WithdrawFunds] Calling withdrawRemainingFunds method with pollId=${pollId}, account=${account}`);
		// Gas estimation can be problematic depending on RPC node and network status.
		// const gasEstimate = await contract.methods.withdrawRemainingFunds(pollId).estimateGas({ from: account }); 
		// console.log(`[WithdrawFunds] Gas estimate: ${gasEstimate}`);
		const tx = await contract.methods.withdrawRemainingFunds(pollId).send({
			from: account,
			// Automatic estimation might be better than a fixed gas multiplier
			// gas: Math.floor(gasEstimate * 1.2) 
		});
		console.log(`[WithdrawFunds] Transaction hash: ${tx.transactionHash}`);
		return tx;
	} catch (error: any) { 
		console.error('[WithdrawFunds] Error withdrawing remaining funds:', error);
		if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
			throw new Error("Transaction rejected by user.");
		}
		// Catch contract revert messages
		if (error.message && error.message.includes("revert")) {
			if (error.message.includes("poll still running")) {
				throw new Error("Poll must be ended (time/target) or paused to withdraw funds.");
			}
			if (error.message.includes("funds already withdrawn")) {
				throw new Error("Funds for this poll have already been withdrawn.");
			}
			if (error.message.includes("insufficient balance")) { // This usually happens during transfer
				throw new Error("Contract balance is insufficient to withdraw funds.");
			}
             if (error.message.includes("Auth: creator only")) {
				throw new Error("Only the poll creator can withdraw funds.");
			}
		}
		throw new Error(`Unknown error withdrawing funds: ${error.message}`);
	}
};

// NEW: Extend Poll Duration Function
/**
 * Extend the duration of an active poll (creator or owner only)
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param additionalHours Number of hours to add
 * @param account User address (creator or owner)
 */
export const extendPollDuration = async (contract: any, pollId: number, additionalHours: number, account: string) => {
	if (additionalHours <= 0) {
		throw new Error("Duration to add must be greater than zero.");
	}
	try {
		console.log(`[ExtendPoll] Calling extendPollDuration method with pollId=${pollId}, additionalHours=${additionalHours}, account=${account}`);
		const tx = await contract.methods.extendPollDuration(pollId, additionalHours).send({
			from: account,
		});
		console.log(`[ExtendPoll] Transaction hash: ${tx.transactionHash}`);
		return tx;
	} catch (error: any) {
		console.error('[ExtendPoll] Error extending poll duration:', error);
		if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
			throw new Error("Transaction rejected by user.");
		}
        if (error.message && error.message.includes("revert")) {
             if (error.message.includes("Auth: owner or creator only")) {
				throw new Error("Only the poll creator or owner can extend the duration.");
			}
             if (error.message.includes("Poll: inactive")) {
				throw new Error("Only active polls can be extended.");
			}
            if (error.message.includes("Poll: permanently closed")) {
				throw new Error("Permanently closed polls cannot be extended.");
			}
             if (error.message.includes("Poll: already ended")) {
				throw new Error("Polls that have already ended cannot be extended.");
			}
             if (error.message.includes("Time: additional hours > 0")) {
                 // Already checked above, but include for completeness
				throw new Error("Duration to add must be greater than zero.");
			}
        }
		throw new Error(`Error extending poll duration: ${error.message}`);
	}
};

// NEW: Pause Poll Function
/**
 * Pause an active poll (creator only)
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param account User address (creator)
 */
export const pausePoll = async (contract: any, pollId: number, account: string) => {
	try {
		console.log(`[PausePoll] Calling pausePoll method with pollId=${pollId}, account=${account}`);
		const tx = await contract.methods.pausePoll(pollId).send({
			from: account,
		});
		console.log(`[PausePoll] Transaction hash: ${tx.transactionHash}`);
		return tx;
	} catch (error: any) {
		console.error('[PausePoll] Error pausing poll:', error);
		if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
			throw new Error("Transaction rejected by user.");
		}
        if (error.message && error.message.includes("revert")) {
             if (error.message.includes("Auth: creator only")) {
				throw new Error("Only the poll creator can pause the poll.");
			}
             if (error.message.includes("Poll: already inactive")) {
				throw new Error("Poll is already paused or ended.");
			}
             if (error.message.includes("Poll: permanently closed")) {
				throw new Error("Permanently closed polls cannot be paused.");
			}
             if (error.message.includes("Poll: already ended")) {
				throw new Error("Polls that have already ended cannot be paused.");
			}
            if (error.message.includes("Poll: target reached, cannot pause")) {
                throw new Error("Polls that have reached their target voter count cannot be paused.");
            }
        }
		throw new Error(`Error pausing poll: ${error.message}`);
	}
};

// NEW: Resume Poll Function
/**
 * Resume a paused poll (creator only)
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param account User address (creator)
 */
export const resumePoll = async (contract: any, pollId: number, account: string) => {
	try {
		console.log(`[ResumePoll] Calling resumePoll method with pollId=${pollId}, account=${account}`);
		const tx = await contract.methods.resumePoll(pollId).send({
			from: account,
		});
		console.log(`[ResumePoll] Transaction hash: ${tx.transactionHash}`);
		return tx;
	} catch (error: any) {
		console.error('[ResumePoll] Error resuming poll:', error);
		if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
			throw new Error("Transaction rejected by user.");
		}
        if (error.message && error.message.includes("revert")) {
             if (error.message.includes("Auth: creator only")) {
				throw new Error("Only the poll creator can resume the poll.");
			}
             if (error.message.includes("Poll: already active")) {
				throw new Error("Poll is already active.");
			}
             if (error.message.includes("Poll: permanently closed")) {
				throw new Error("Permanently closed polls cannot be resumed.");
			}
             if (error.message.includes("Poll: already ended")) {
				throw new Error("Polls that have already ended cannot be resumed.");
			}
            if (error.message.includes("Poll: target reached, cannot resume")) {
                throw new Error("Polls that have reached their target voter count cannot be resumed.");
            }
        }
		throw new Error(`Error resuming poll: ${error.message}`);
	}
};

// NEW: Get Contract Owner
/**
 * Fetches the owner address of the contract.
 * @param contract Contract instance
 */
export const getOwner = async (contract: any): Promise<string | null> => {
	try {
		const ownerAddress = await contract.methods.owner().call();
		return ownerAddress;
	} catch (error: any) {
		console.error("[ERROR] Failed to get contract owner:", error);
		return null;
	}
};

// NEW: Check if an address is an operator
/**
 * Checks if the given address is an operator for the contract.
 * @param contract Contract instance
 * @param checkAddress Address to check
 */
export const checkIsOperator = async (contract: any, checkAddress: string): Promise<boolean | null> => {
    if (!checkAddress) return null;
	try {
		const isOp = await contract.methods.isOperator(checkAddress).call();
		return Boolean(isOp);
	} catch (error: any) {
		console.error(`[ERROR] Failed to check if ${checkAddress} is operator:`, error);
		return null;
	}
};

// NEW: Close Poll Permanently
/**
 * Permanently closes a poll (owner or operator only).
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param account User address (owner or operator)
 */
export const closePollPermanently = async (contract: any, pollId: number, account: string) => {
    try {
        console.log(`[ClosePollPerm] Calling closePollPermanently method with pollId=${pollId}, account=${account}`);
        const tx = await contract.methods.closePollPermanently(pollId).send({
            from: account,
        });
        console.log(`[ClosePollPerm] Transaction hash: ${tx.transactionHash}`);
        return tx;
    } catch (error: any) {
        console.error('[ClosePollPerm] Error closing poll permanently:', error);
        if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
            throw new Error("Transaction rejected by user.");
        }
        if (error.message && error.message.includes("revert")) {
             if (error.message.includes("Auth: caller is not the owner or operator")) {
                throw new Error("Only the owner or an operator can close the poll permanently.");
            }
             if (error.message.includes("Poll: already permanently closed")) {
                throw new Error("Poll is already permanently closed.");
            }
        }
        throw new Error(`Error closing poll permanently: ${error.message}`);
    }
};

// NEW: Delete Poll Permanently
/**
 * Permanently deletes a poll (owner or operator only).
 * @param contract Contract instance
 * @param pollId Poll ID
 * @param account User address (owner or operator)
 */
export const deletePollPermanently = async (contract: any, pollId: number, account: string) => {
    try {
        console.log(`[DeletePollPerm] Calling deletePollPermanently method with pollId=${pollId}, account=${account}`);
        const tx = await contract.methods.deletePollPermanently(pollId).send({
            from: account,
        });
        console.log(`[DeletePollPerm] Transaction hash: ${tx.transactionHash}`);
        return tx;
    } catch (error: any) {
        console.error('[DeletePollPerm] Error deleting poll permanently:', error);
        if (error.code === 4001 || (error.message && (error.message.includes("User rejected") || error.message.includes("User denied")))) {
            throw new Error("Transaction rejected by user.");
        }
        if (error.message && error.message.includes("revert")) {
             if (error.message.includes("Auth: caller is not the owner or operator")) {
                throw new Error("Only the owner or an operator can delete the poll permanently.");
            }
             if (error.message.includes("Delete: already permanently deleted")) {
                throw new Error("Poll is already permanently deleted.");
            }
            // Add more specific error checks if needed (e.g., fund transfer failures)
        }
        throw new Error(`Error deleting poll permanently: ${error.message}`);
    }
};

// --- Owner Read Functions ---

export const getPollCreationFee = async (contract: any, account: string): Promise<string | null> => {
    try {
        const fee = await contract.methods.pollCreationFee().call({ from: account });
        return fee?.toString();
    } catch (e) { console.error("Error getting poll creation fee:", e); return null; }
};

export const getCombinedRequirementFee = async (contract: any, account: string): Promise<string | null> => {
    try {
        const fee = await contract.methods.combinedRequirementFee().call({ from: account });
        return fee?.toString();
    } catch (e) { console.error("Error getting combined req fee:", e); return null; }
};

export const getCommissionRate = async (contract: any, account: string): Promise<number | null> => {
    try {
        const rate = await contract.methods.commissionRate().call({ from: account });
        return Number(rate);
    } catch (e) { console.error("Error getting commission rate:", e); return null; }
};

export const getTotalLYXCommission = async (contract: any, account: string): Promise<string | null> => {
    try {
        // Assuming getTotalLYXCommission exists (based on prev. discussion) or use totalCommissionEarned directly
        // If totalCommissionEarned is public in ABI, this wrapper might not be needed, 
        // but let's keep it for consistency or if the getter function exists.
        // If the getter function is named differently or doesn't exist, adjust/remove this.
        const earned = await contract.methods.getTotalLYXCommission().call({ from: account }); 
        return earned?.toString();
    } catch (e) { console.error("Error getting total LYX commission:", e); return null; }
};

export const getCommissionEarnedTokenAddresses = async (contract: any, account: string): Promise<string[] | null> => {
    try {
        const addresses = await contract.methods.getCommissionEarnedTokenAddresses().call({ from: account });
        return addresses;
    } catch (e) { console.error("Error getting commission token addresses:", e); return null; }
};

export const getTokenCommissionEarned = async (contract: any, tokenAddress: string, account: string): Promise<string | null> => {
    if (!tokenAddress) return null;
    try {
        const earned = await contract.methods.getTokenCommissionEarned(tokenAddress).call({ from: account });
        return earned?.toString();
    } catch (e) { console.error(`Error getting commission for ${tokenAddress}:`, e); return null; }
};

// --- Owner Write Functions ---

export const addOperator = async (contract: any, operatorAddress: string, account: string) => {
    try {
        const tx = await contract.methods.addOperator(operatorAddress).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error adding operator:", error);
        // Add more specific error handling based on reverts
        if (error.message?.includes("already operator")) throw new Error("Address is already an operator.");
        if (error.message?.includes("zero address")) throw new Error("Cannot add zero address as operator.");
        throw error;
    }
};

export const removeOperator = async (contract: any, operatorAddress: string, account: string) => {
    try {
        const tx = await contract.methods.removeOperator(operatorAddress).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error removing operator:", error);
        if (error.message?.includes("not an operator")) throw new Error("Address is not an operator.");
        if (error.message?.includes("zero address")) throw new Error("Cannot remove zero address.");
        throw error;
    }
};

export const setPollCreationFee = async (contract: any, newFeeWei: string, account: string) => {
    try {
        const tx = await contract.methods.setPollCreationFee(newFeeWei).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error setting poll creation fee:", error);
        throw error;
    }
};

export const setCombinedRequirementFee = async (contract: any, newFeeWei: string, account: string) => {
    try {
        const tx = await contract.methods.setCombinedRequirementFee(newFeeWei).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error setting combined requirement fee:", error);
        throw error;
    }
};

export const setCommissionRate = async (contract: any, newRate: number, account: string) => {
     if (newRate < 0 || newRate > 100) throw new Error("Commission rate must be between 0 and 100.");
    try {
        const tx = await contract.methods.setCommissionRate(newRate).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error setting commission rate:", error);
        if (error.message?.includes("Rate: max 100")) throw new Error("Rate cannot exceed 100.");
        throw error;
    }
};

export const withdrawCommission = async (contract: any, amountWei: string, account: string) => {
    try {
        const tx = await contract.methods.withdrawCommission(amountWei).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error("Error withdrawing LYX commission:", error);
        // Add specific revert checks if needed (e.g., insufficient balance, amount > earned)
        throw error;
    }
};

export const withdrawTokenCommission = async (contract: any, tokenAddress: string, amountWei: string, account: string) => {
    try {
        const tx = await contract.methods.withdrawTokenCommission(tokenAddress, amountWei).send({ from: account });
        return tx;
    } catch (error: any) {
        console.error(`Error withdrawing token commission for ${tokenAddress}:`, error);
        // Add specific revert checks if needed
        throw error;
	}
}; 

// --- USER INFO GETTERS ---

/** @notice Returns the list of poll IDs a user has voted on. */
export const getUserVotedPollIds = async (contract: any, _user: string) => { 
    return contract.methods.getUserVotedPollIds(_user).call(); 
};
/** @notice Returns the points accumulated by a user. */
export const getUserPoints = async (contract: any, _user: string) => { 
    const points = await contract.methods.getUserPoints(_user).call(); 
    return Number(points);
};
/** @notice Returns the list of all users who have earned points (not sorted by points). */
export const getAllRankedUsers = async (contract: any): Promise<string[]> => { 
    return contract.methods.getAllRankedUsers().call(); 
};

// --- NEW: Get User Created Poll IDs --- 
/** @notice Returns the list of poll IDs created by a specific user. */
export const getUserCreatedPollIds = async (contract: any, _creator: string): Promise<number[]> => { 
    if (!contract || !_creator) {
        console.error("getUserCreatedPollIds: Contract or creator address missing.");
        return [];
    }
    try {
        const pollIdsBigInt: bigint[] = await contract.methods.getUserCreatedPollIds(_creator).call(); 
        // Convert bigint[] to number[] for easier use in frontend
        return pollIdsBigInt.map(id => Number(id));
    } catch (error: any) {
        console.error(`Error fetching created poll IDs for ${_creator}:`, error);
        // Return empty array on error to avoid breaking the UI
        return [];
    }
};

// --- Global Stats Getters --- Add new functions here

/** @notice Returns the total number of polls created. */
export const getTotalPollCount = async (contract: any): Promise<number> => {
    try {
        const count = await contract.methods.pollCount().call();
        return Number(count);
    } catch (error: any) { 
        console.error("Error getting total poll count:", error);
        return 0; // Return 0 on error
    }
};

/** @notice Returns the total number of unique users who have interacted (voted/created). */
export const getTotalInteractingUsersCount = async (contract: any): Promise<number> => {
    try {
        const users: string[] = await contract.methods.getAllRankedUsers().call();
        return users ? users.length : 0;
    } catch (error: any) { 
        console.error("Error getting total interacting users count:", error);
        return 0; // Return 0 on error
    }
};

/**
 * @notice Returns the list of addresses that voted on a poll.
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 */
export const getVoters = async (contract: any, pollId: number): Promise<string[]> => {
    try {
        const voters = await contract.methods.getVoters(pollId).call();
        return voters || []; // Return empty array if null/undefined
    } catch (error: any) {
        console.error(`Error getting voters for poll ${pollId}:`, error);
        // Check if error is due to data being cleaned
        if (error.message?.includes("data cleaned")) {
            console.log(`Voters for poll ${pollId} not available (data cleaned).`);
            return [];
        }
        // Check if error is due to poll being deleted
        if (error.message?.includes("permanently deleted")) {
            console.log(`Voters for poll ${pollId} not available (deleted).`);
            return [];
        }
        // Re-throw other errors or return empty array
        // throw error; // Or return empty array to avoid breaking UI
        return []; 
	}
}; 

const IPFS_GATEWAYS = [
  'https://api.universalprofile.cloud/ipfs/',
  'https://2eff.lukso.dev/ipfs/',
  'https://ipfs.lukso.network/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

// --- Utility function to format IPFS URLs (copied from useLSP5ReceivedAssets) ---
function formatIPFSUrl(url: any): string {
    try {
      let targetUrl = url;
      
      if (!targetUrl) return '';
      if (Array.isArray(targetUrl)) {
        if (targetUrl.length > 0) targetUrl = targetUrl[0]; else return '';
      }
      if (typeof targetUrl !== 'string' && targetUrl && targetUrl.url) targetUrl = targetUrl.url;
      if (typeof targetUrl !== 'string') return '';
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('data:')) return targetUrl;
      if (targetUrl.startsWith('ipfs://')) {
        const ipfsHash = targetUrl.replace('ipfs://', '');
        return `${IPFS_GATEWAYS[0]}${ipfsHash}`;
      }
      return targetUrl;
    } catch (error) {
      console.warn('URL formatlanırken hata:', url, error);
      return '';
    }
}

// --- NEW LSP METADATA FETCHER FUNCTION ---
interface TokenMetadataLSP {
  name: string;
  symbol: string;
  decimals?: bigint;
  iconUrl?: string;
}

/**
 * Fetches LSP4 metadata for a given token address using ERC725.js.
 * @param provider Web3 provider instance.
 * @param tokenAddress The address of the LSP7/LSP8 token.
 * @returns A promise resolving to an object with name, symbol, decimals, and iconUrl, or null if error.
 */
export const fetchTokenMetadataFromLSP = async (
    provider: any, // Can be EIP1193 provider
    tokenAddress: string
): Promise<TokenMetadataLSP | null> => {
    if (!provider || !tokenAddress) {
        console.error("fetchTokenMetadataFromLSP: Provider or tokenAddress missing.");
        return null;
    }

    try {
        const erc725 = new ERC725(
            LSP4Schema as any,
            tokenAddress,
            provider,
            { ipfsGateway: IPFS_GATEWAYS[0] }
        );

        console.log(`[fetchTokenMetadataFromLSP] Fetching metadata for: ${tokenAddress}`);

        const [nameResult, symbolResult, metadataResult, tokenTypeResult] = await Promise.allSettled([
            erc725.getData('LSP4TokenName'),
            erc725.getData('LSP4TokenSymbol'),
            erc725.getData('LSP4Metadata'),
            erc725.getData('LSP4TokenType') // Needed for decimals for LSP7
        ]);

        const name = nameResult.status === 'fulfilled' ? nameResult.value?.value?.toString() : 'Unknown Token';
        const symbol = symbolResult.status === 'fulfilled' ? symbolResult.value?.value?.toString() : '???';

        // Determine decimals - LSP7 usually has decimals, LSP8 doesn't store it this way.
        let decimals: bigint | undefined = undefined;
        // Assuming LSP7 tokens store decimals implicitly (usually 18) or maybe via another standard?
        // LSP8 (NFTs) don't typically have decimals.
        // If LSP4TokenType is 0 (Token), assume 18 decimals as a fallback.
        // A more robust solution might involve checking for an explicit 'decimals()' function on the contract.
        if (tokenTypeResult.status === 'fulfilled' && Number(tokenTypeResult.value?.value) === 0) {
           decimals = 18n; // Default assumption for LSP7 fungible tokens
           // TODO: Consider adding a try/catch call to contract.methods.decimals().call() here for accuracy
        }

        let iconUrl: string | undefined = undefined;
        if (metadataResult.status === 'fulfilled' && metadataResult.value?.value) {
            try {
                const metadata = metadataResult.value.value as any; // Type assertion needed
                 console.log(`[fetchTokenMetadataFromLSP] Raw LSP4Metadata for ${tokenAddress}:`, JSON.stringify(metadata, null, 2)); // Log raw metadata

                 // --- START: Verifiable URI Check & Fetch --- 
                 let finalMetadataSource = metadata; // Start with the directly fetched metadata

                 if (metadata?.url && typeof metadata.url === 'string' && metadata.url.startsWith('ipfs://')) {
                     try {
                        const formattedUrl = formatIPFSUrl(metadata.url);
                        console.log(`[fetchTokenMetadataFromLSP] Fetching secondary JSON from verified URL: ${formattedUrl}`);
                        const response = await fetch(formattedUrl);
                        if (response.ok) {
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                 finalMetadataSource = await response.json(); // Use the fetched JSON as the source
                                 console.log(`[fetchTokenMetadataFromLSP] Fetched secondary JSON content:`, JSON.stringify(finalMetadataSource, null, 2));
                            } else {
                                console.warn(`[fetchTokenMetadataFromLSP] Content type from ${formattedUrl} is not JSON: ${contentType}`);
                            }
                        } else {
                             console.warn(`[fetchTokenMetadataFromLSP] Failed to fetch ${formattedUrl}, status: ${response.status}`);
                        }
                     } catch (fetchError) {
                         console.error(`[fetchTokenMetadataFromLSP] Error fetching or parsing secondary JSON from ${metadata.url}:`, fetchError);
                     }
                 }
                 // --- END: Verifiable URI Check & Fetch ---

                // Now use finalMetadataSource to find icon/image
                if (finalMetadataSource && typeof finalMetadataSource === 'object') {
                    let potentialIcon = '';
                    let potentialImage = '';

                    // Look in standard places within the final source
                    if (finalMetadataSource.icon) potentialIcon = formatIPFSUrl(finalMetadataSource.icon);
                    if (finalMetadataSource.images?.[0]) potentialImage = formatIPFSUrl(finalMetadataSource.images[0].url || finalMetadataSource.images[0]);
                    // Check specifically within LSP4Metadata sub-object if it exists
                    if (finalMetadataSource.LSP4Metadata) {
                        if (finalMetadataSource.LSP4Metadata.icon && !potentialIcon) potentialIcon = formatIPFSUrl(finalMetadataSource.LSP4Metadata.icon);
                        if (finalMetadataSource.LSP4Metadata.images?.[0] && !potentialImage) potentialImage = formatIPFSUrl(finalMetadataSource.LSP4Metadata.images[0].url || finalMetadataSource.LSP4Metadata.images[0]);
                    }
                    // Also check LSP3Profile Metadata sub-object (sometimes used)
                    if (finalMetadataSource.LSP3Profile) {
                         if (finalMetadataSource.LSP3Profile.profileImage?.[0] && !potentialImage) potentialImage = formatIPFSUrl(finalMetadataSource.LSP3Profile.profileImage[0].url || finalMetadataSource.LSP3Profile.profileImage[0]);
                         if (finalMetadataSource.LSP3Profile.backgroundImage?.[0] && !potentialImage) potentialImage = formatIPFSUrl(finalMetadataSource.LSP3Profile.backgroundImage[0].url || finalMetadataSource.LSP3Profile.backgroundImage[0]); // Less likely but check
                    }

                    // Choose icon or image based on type (LSP7=icon priority, LSP8=image priority)
                    const isLikelyNFT = tokenTypeResult.status === 'fulfilled' && Number(tokenTypeResult.value?.value) === 2;
                    iconUrl = isLikelyNFT ? (potentialImage || potentialIcon) : (potentialIcon || potentialImage);
                }
            } catch (iconError) {
                console.warn(`[fetchTokenMetadataFromLSP] Error processing LSP4Metadata for ${tokenAddress}:`, iconError);
            }
        }

        console.log(`[fetchTokenMetadataFromLSP] Result for ${tokenAddress}: Name=${name}, Symbol=${symbol}, Decimals=${decimals}, Icon=${iconUrl}`);

        return {
            name: name || 'Unknown Token', // Ensure non-empty name
            symbol: symbol || '???',     // Ensure non-empty symbol
            decimals,
            iconUrl,
        };

    } catch (error) {
        console.error(`[fetchTokenMetadataFromLSP] Error fetching metadata for ${tokenAddress}:`, error);
        return null;
	}
}; 

/**
 * Kullanıcının belirli bir anket için ödül talep edip etmediğini kontrol eder.
 * @param contract Kontrat nesnesi
 * @param pollId Anket ID
 * @param voterAddress Kontrol edilecek adres
 */
export const hasClaimedReward = async (contract: any, pollId: number, voterAddress: string): Promise<boolean> => {
    if (!voterAddress) {
        console.warn("[hasClaimedReward] Voter address is required.");
        return false; // Cannot have claimed without an address
    }
    try {
        const claimed = await contract.methods.hasClaimedReward(pollId, voterAddress).call();
        return Boolean(claimed);
    } catch (error) {
        console.error(`[ERROR] Error checking claimed reward status for poll ${pollId}, voter ${voterAddress}:`, error);
        // Return false by default on error, assuming claim is not possible or status unknown
        // Depending on UI needs, might want to throw or return null to indicate error
        return false; 
    }
};