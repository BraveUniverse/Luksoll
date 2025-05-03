"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Web3 from 'web3';
import Modal from './Modal';
import { useUP } from '@/context/UPContext';
import { CONTRACT_ADDRESS, POLL_CONTRACT_ABI } from '@/contracts/contract-config';
import { VotingRequirementType, VotingRequirementHelper } from '@/utils/voting-requirements';
import useLSP5ReceivedAssets from '@/hooks/useLSP5ReceivedAssets';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon, 
  InformationCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const LSP7_MIN_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "internalType": "address", "name": "operator", "type": "address" },
      { "internalType": "address", "name": "tokenOwner", "type": "address" }
    ],
    "name": "authorizedAmountFor",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "internalType": "address", "name": "operator", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "operatorNotificationData", "type": "bytes" }
    ],
    "name": "authorizeOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPollCreated: () => void;
  contract?: any;
  account?: string;
}

interface FormData {
  question: string;
  description: string;
  options: string[];
  durationInHours: number;
  targetVoterCount: number;
  enableRewards: boolean;
  rewardType: 'NATIVE' | 'LSP7';
  rewardAmount: string;
  tokenAddress: string;
  requirementType: VotingRequirementType;
  requiredTokenAddress: string;
  requiredTokenAmount: string;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({ 
  isOpen, 
  onClose, 
  onPollCreated,
  contract: externalContract,
  account: externalAccount
}) => {
  const { 
    address: contextAddress, 
    web3: contextWeb3, 
    contract: contextContract, 
    isConnected, 
    connectUP,
    upProvider
  } = useUP();
  
  const { assets, loading: assetsLoading } = useLSP5ReceivedAssets(contextAddress, upProvider);
  
  const tokens = useMemo(() => assets.filter(asset => !asset.isNFT), [assets]);
  const nfts = useMemo(() => assets.filter(asset => asset.isNFT), [assets]);
  
  const web3 = contextWeb3;
  const contract = externalContract || contextContract;
  const address = externalAccount || contextAddress;
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const [formData, setFormData] = useState<FormData>({
    question: '',
    description: '',
    options: ['', ''],
    durationInHours: 24,
    targetVoterCount: 0,
    enableRewards: false,
    rewardType: 'NATIVE',
    rewardAmount: '0',
    tokenAddress: '',
    requirementType: VotingRequirementType.NONE,
    requiredTokenAddress: '',
    requiredTokenAmount: '0'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [estimatedLyxCost, setEstimatedLyxCost] = useState<string>('0');
  const [estimatedTokenCost, setEstimatedTokenCost] = useState<string>('0');
  const [pollCreationFeeWei, setPollCreationFeeWei] = useState<string>('0');
  const [combinedRequirementFeeWei, setCombinedRequirementFeeWei] = useState<string>('0');
  const [userActivePolls, setUserActivePolls] = useState<number>(0);
  const [commissionRatePercent, setCommissionRatePercent] = useState<number>(0); 
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  const [requirementTokenDecimals, setRequirementTokenDecimals] = useState<number | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false); 
  const [authorizationError, setAuthorizationError] = useState<string>(''); 
  
  useEffect(() => {
    if (web3 && contract && address && isConnected) {
      const fetchContractInfo = async () => {
        try {
          const userPollCountRaw = await contract.methods.getCreatorActivePollCount(address).call();
          setUserActivePolls(Number(userPollCountRaw));
          
          const combinedFeeRaw = await contract.methods.combinedRequirementFee().call();
          setCombinedRequirementFeeWei(combinedFeeRaw.toString());
          
          const pollFeeRaw = await contract.methods.pollCreationFee().call();
          setPollCreationFeeWei(pollFeeRaw.toString());
          
          const rateRaw = await contract.methods.commissionRate().call();
          setCommissionRatePercent(Number(rateRaw)); 
          
        } catch (error) {
           setErrorMessage("Failed to fetch contract fees or commission rate.");
        }
      };
      
      fetchContractInfo();
    }
  }, [web3, contract, address, isConnected]);
  
  const calculateRequiredLyxValue = (): bigint => {
    let feesRequiredWei = 0n; 

    if (userActivePolls > 0 && pollCreationFeeWei !== '0') {
        feesRequiredWei += BigInt(pollCreationFeeWei);
    }
    if (VotingRequirementHelper.isCombined(formData.requirementType) && combinedRequirementFeeWei !== '0') {
        feesRequiredWei += BigInt(combinedRequirementFeeWei);
    }

    if (formData.enableRewards && formData.rewardType === 'NATIVE') {
        if (!web3) return feesRequiredWei; 
        const rewardPerVoteWei = BigInt(web3.utils.toWei(formData.rewardAmount || '0', 'ether'));
        const targetCount = BigInt(formData.targetVoterCount || 0);

        if (targetCount > 0n && rewardPerVoteWei > 0n) {
            const totalRewardWei = rewardPerVoteWei * targetCount;
            const commissionWei = (totalRewardWei * BigInt(commissionRatePercent)) / 100n; 
            return feesRequiredWei + totalRewardWei + commissionWei;
        } else {
             return feesRequiredWei;
        }
    } else {
        return feesRequiredWei;
    }
  };

  const calculateRequiredTokenAmount = (): bigint => {
      if (!formData.enableRewards || formData.rewardType !== 'LSP7' || tokenDecimals === null) {
          return 0n;
      }
      const rewardPerVote = parseFloat(formData.rewardAmount || '0');
      const rewardPerVoteTokenWei = BigInt(Math.round(rewardPerVote * (10 ** tokenDecimals)));
      const targetCount = BigInt(formData.targetVoterCount || 0);
      const netTotalRewardAmountWei = rewardPerVoteTokenWei * targetCount;
      const commissionTokenAmountWei = (netTotalRewardAmountWei * BigInt(commissionRatePercent)) / 100n; 
      return netTotalRewardAmountWei + commissionTokenAmountWei; 
  };

  useEffect(() => {
    if(web3) {
      const lyxValue = calculateRequiredLyxValue();
      setEstimatedLyxCost(web3.utils.fromWei(lyxValue, 'ether'));

      if(formData.enableRewards && formData.rewardType === 'LSP7' && tokenDecimals !== null){
          const tokenValue = calculateRequiredTokenAmount();
          const formattedToken = (Number(tokenValue) / (10 ** tokenDecimals)).toLocaleString(undefined, {maximumFractionDigits: tokenDecimals});
          setEstimatedTokenCost(formattedToken);
      } else {
          setEstimatedTokenCost('0');
      }
    }
  }, [formData, web3, userActivePolls, commissionRatePercent, tokenDecimals, pollCreationFeeWei, combinedRequirementFeeWei]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'rewardAmount' || name === 'requiredTokenAmount') {
      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) { 
        setFormData({ ...formData, [name]: value });
      }
    } else if (name === 'requirementType') {
      const requirementType = parseInt(value);
      setFormData({ 
        ...formData, 
        requirementType, 
        requiredTokenAddress: '',
        requiredTokenAmount: '0'
      });
      
      if (
        (VotingRequirementHelper.requiresLSP7(requirementType) && tokens.length > 0) || 
        (VotingRequirementHelper.requiresLSP8(requirementType) && nfts.length > 0)
      ) {
        setShowAssetSelector(true);
      } else {
        setShowAssetSelector(false);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleOptionsChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    setFormData({ ...formData, options: newOptions });
  };
  
  const addOption = () => {
    setOptions([...options, '']);
    setFormData({ ...formData, options: [...options, ''] });
  };
  
  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      setFormData({ ...formData, options: newOptions });
    }
  };
  
  const validateForm = (): boolean => {
    setErrorMessage('');
    
    if (!formData.question.trim()) {
      setErrorMessage('Question is required');
      return false;
    }
    
    if (!formData.description.trim()) {
      setErrorMessage('Description is required');
      return false;
    }
    
    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setErrorMessage('At least two options are required');
      return false;
    }
    
    if (formData.durationInHours <= 0) {
      setErrorMessage('Duration must be greater than 0');
      return false;
    }
    
    if (formData.enableRewards) {
      if (formData.targetVoterCount <= 0) {
          setErrorMessage('Target voter count must be greater than 0 for rewards');
          return false;
      }
      if (formData.rewardType === 'NATIVE') {
        if (parseFloat(formData.rewardAmount) <= 0) {
          setErrorMessage('Reward amount must be greater than 0');
          return false;
        }
      } else if (formData.rewardType === 'LSP7') {
        if (!formData.tokenAddress || !Web3.utils.isAddress(formData.tokenAddress)) {
          setErrorMessage('Valid token address is required for token rewards');
          return false;
        }
         if (parseFloat(formData.rewardAmount) <= 0) {
          setErrorMessage('Reward amount per vote must be greater than 0');
          return false;
        }
      }
    }
    
    if (VotingRequirementHelper.requiresLSP7(formData.requirementType)) {
      if (!formData.requiredTokenAddress || !Web3.utils.isAddress(formData.requiredTokenAddress)) {
        setErrorMessage('Valid token address is required for LSP7 requirement');
        return false;
      }
      if (parseFloat(formData.requiredTokenAmount) <= 0) {
        setErrorMessage('Required token amount must be greater than 0 for LSP7 requirement');
        return false;
      }
    }
    
    if (VotingRequirementHelper.requiresLSP8(formData.requirementType)) {
      if (!formData.requiredTokenAddress || !Web3.utils.isAddress(formData.requiredTokenAddress)) {
        setErrorMessage('Valid NFT address is required for LSP8 requirement');
        return false;
      }
    }
    
    return true;
  };
  
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleAssetSelect = (asset: any, type: 'reward' | 'requirement') => {
    if (type === 'reward') {
      setFormData({ ...formData, tokenAddress: asset.address });
      setShowAssetSelector(false);
    } else if (type === 'requirement') {
      setFormData({ ...formData, requiredTokenAddress: asset.address });
      setShowAssetSelector(false);
    }
  };
  
  const handleCreatePoll = async () => {
    if (!validateForm() || !web3 || !contract || !address) {
        if (!web3 || !contract || !address) {
            setErrorMessage("Wallet connection or contract information missing.");
        }
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setAuthorizationError(''); 
    setIsAuthorizing(false); 

    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    const durationToSend = formData.durationInHours; 

    let requiredAmountWei = '0';
    if (VotingRequirementHelper.requiresLSP7(formData.requirementType)) {
        if (requirementTokenDecimals !== null && web3) {
            try {
                const baseAmount = formData.requiredTokenAmount || '0';
                const multiplier = 10n ** BigInt(requirementTokenDecimals);
                const amountBigInt = BigInt(Math.round(parseFloat(baseAmount.replace(/,/g, ''))));
                requiredAmountWei = (amountBigInt * multiplier).toString();
            } catch (conversionError) {
                setErrorMessage("Invalid format for required token amount.");
                setIsSubmitting(false);
                return;
            }
        } else {
            setErrorMessage("Could not determine decimals for the required token. Cannot proceed.");
            setIsSubmitting(false);
            return;
        }
    }
      
    try {
      if (formData.enableRewards) {
        if (formData.rewardType === 'NATIVE') {
          const requiredLyxValueWei = calculateRequiredLyxValue(); 
          const rewardPerVoteWei = web3.utils.toWei(formData.rewardAmount || '0', 'ether');

          await contract.methods.createPoll(
            formData.question,
            formData.description,
            validOptions,
            durationToSend, 
            formData.targetVoterCount,
            true, 
            rewardPerVoteWei,
            formData.requirementType,
            formData.requiredTokenAddress || '0x0000000000000000000000000000000000000000',
            requiredAmountWei
          ).send({ from: address, value: requiredLyxValueWei.toString() });

        } else if (formData.rewardType === 'LSP7') {
          if (tokenDecimals === null) {
              setErrorMessage("Cannot process token reward: Token details are missing.");
              setIsSubmitting(false);
              return;
          }
          if (!formData.tokenAddress) {
              setErrorMessage("Reward token address not selected.");
              setIsSubmitting(false);
              return;
          }

          const rewardPerVote = parseFloat(formData.rewardAmount || '0');
          const rewardPerVoteTokenWei = BigInt(Math.round(rewardPerVote * (10 ** tokenDecimals)));
          const totalTokensToAuthorize = calculateRequiredTokenAmount();

          if(totalTokensToAuthorize <= 0n) {
              setErrorMessage("Calculated token amount for reward/commission is zero or invalid.");
              setIsSubmitting(false);
              return;
          }
          
          const tokenContract = new web3.eth.Contract(LSP7_MIN_ABI, formData.tokenAddress);

          const currentAuthorizedAmount = BigInt(await tokenContract.methods.authorizedAmountFor(CONTRACT_ADDRESS, address).call());

          if (currentAuthorizedAmount < totalTokensToAuthorize) {
            setIsAuthorizing(true);
            setAuthorizationError('');
            try {
              const authorizeTx = await tokenContract.methods.authorizeOperator(CONTRACT_ADDRESS, totalTokensToAuthorize.toString(), "0x").send({ from: address });
              setIsAuthorizing(false);
            } catch (authErr: any) {
              setAuthorizationError(`Failed to authorize token operator (Amount: ${totalTokensToAuthorize}): ${authErr.message}`);
              setIsAuthorizing(false);
              setIsSubmitting(false);
              return;
            }
          } 
          
          let feeToSendWei = 0n;
          if (userActivePolls > 0 && pollCreationFeeWei !== '0') {
              feeToSendWei += BigInt(pollCreationFeeWei);
          }
          if (VotingRequirementHelper.isCombined(formData.requirementType) && combinedRequirementFeeWei !== '0') {
              feeToSendWei += BigInt(combinedRequirementFeeWei);
          }

        await contract.methods.createPollWithToken(
          formData.question,
          formData.description,
            validOptions,
            durationToSend, 
            formData.targetVoterCount,
            rewardPerVoteTokenWei.toString(), 
            formData.tokenAddress,
          formData.requirementType,
          formData.requiredTokenAddress || '0x0000000000000000000000000000000000000000',
            requiredAmountWei
          ).send({ from: address, value: feeToSendWei.toString() });
        }

      } else {
        const requiredLyxValueWei = calculateRequiredLyxValue(); 

        await contract.methods.createPoll(
          formData.question,
          formData.description,
          validOptions,
          durationToSend, 
          0, 
          false, 
          '0', 
          formData.requirementType,
          formData.requiredTokenAddress || '0x0000000000000000000000000000000000000000',
          requiredAmountWei
        ).send({ from: address, value: requiredLyxValueWei.toString() });
      }

      setSuccessMessage('Poll created successfully!');
      onPollCreated(); 
      setCurrentStep(1); 
      onClose(); 
      
    } catch (error: any) {
      if (error.code === 4001) { 
           setErrorMessage('Transaction rejected by user.');
      } else if (error.message) {
           const revertMatch = error.message.match(/execution reverted: ([:w:s]+)/);
           const commonErrorMatch = error.message.match(/("message":|reason=)"(.*?)"/);
           if (revertMatch && revertMatch[1]) {
               setErrorMessage(`Contract Error: ${revertMatch[1].trim()}`);
           } else if (commonErrorMatch && commonErrorMatch[2]) {
              setErrorMessage(`Error: ${commonErrorMatch[2]}`);
      } else {
               setErrorMessage(`Failed to create poll: ${error.message}`);
           }
      } else {
          setErrorMessage('Failed to create poll. An unknown error occurred.');
      }
    } finally {
      setIsSubmitting(false);
      setIsAuthorizing(false); 
    }
  };
  
  const validateStep = (step: number): boolean => {
    setErrorMessage('');
    
    if (step === 1) {
      if (!formData.question.trim()) {
        setErrorMessage('Please enter a question');
        return false;
      }
      
      if (!formData.description.trim()) {
        setErrorMessage('Please enter a description');
        return false;
      }
      
      const validOptions = formData.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        setErrorMessage('Please provide at least two valid options');
        return false;
      }
      
      return true;
    } else if (step === 2) {
      if (formData.requirementType !== VotingRequirementType.NONE) {
        if (VotingRequirementHelper.requiresLSP7(formData.requirementType) || 
            VotingRequirementHelper.requiresLSP8(formData.requirementType)) {
          
          if (!formData.requiredTokenAddress || !Web3.utils.isAddress(formData.requiredTokenAddress)) {
            setErrorMessage('Please select or enter a valid token/NFT address');
            return false;
          }
          
          if (VotingRequirementHelper.requiresLSP7(formData.requirementType) && 
              (parseFloat(formData.requiredTokenAmount) <= 0)) {
            setErrorMessage('Token amount must be greater than 0');
            return false;
          }
        }
      }
      
      return true;
    }
    
    return true;
  };
  
  const tryNextStep = () => {
    if (validateStep(currentStep)) {
      goToNextStep();
    }
  };

  useEffect(() => {
    const fetchDecimals = async () => {
      if (formData.rewardType === 'LSP7' && formData.tokenAddress && web3 && Web3.utils.isAddress(formData.tokenAddress)) {
        try {
          const tokenContract = new web3.eth.Contract(LSP7_MIN_ABI, formData.tokenAddress);
          const decimals = await tokenContract.methods.decimals().call();
          setTokenDecimals(Number(decimals));
        } catch (error) {
          setTokenDecimals(null); 
          setErrorMessage("Could not read decimals for the selected reward token.");
        }
      } else {
        setTokenDecimals(null); 
      }

      if (VotingRequirementHelper.requiresLSP7(formData.requirementType) && formData.requiredTokenAddress && web3 && Web3.utils.isAddress(formData.requiredTokenAddress)) {
        try {
          const reqTokenContract = new web3.eth.Contract(LSP7_MIN_ABI, formData.requiredTokenAddress);
          const decimals = await reqTokenContract.methods.decimals().call();
          setRequirementTokenDecimals(Number(decimals));
        } catch (error) {
          setRequirementTokenDecimals(null);
          if (VotingRequirementHelper.requiresLSP7(formData.requirementType)) {
            setErrorMessage("Could not read decimals for the selected requirement token.");
          }
        }
      } else {
        setRequirementTokenDecimals(null);
      }
    };
    fetchDecimals();
  }, [formData.tokenAddress, formData.rewardType, formData.requiredTokenAddress, formData.requirementType, web3]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Poll" size="xl">
      <div className="relative">
        <div className="mb-8 px-4">
          <div className="flex items-center justify-between relative mb-2">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
             <div 
              className="absolute left-0 top-1/2 h-0.5 bg-gradient-to-r from-[#ED1169] to-[#9D0A4E] -translate-y-1/2 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
             
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10">
                <div 
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all duration-300 border-2
                    ${currentStep > step 
                      ? 'bg-[#ED1169] border-[#ED1169] text-white' 
                      : currentStep === step
                      ? 'bg-white border-[#ED1169] text-[#ED1169]'
                      : 'bg-white border-gray-300 text-gray-400'}`}
              >
                  {currentStep > step ? <CheckIcon className="h-5 w-5" /> : step}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-xs font-medium text-gray-500 mt-2">
            <span className={currentStep === 1 ? "text-[#ED1169] font-semibold" : ""}>Basic Info</span>
            <span className={currentStep === 2 ? "text-[#ED1169] font-semibold" : ""}>Requirements</span>
            <span className={currentStep === 3 ? "text-[#ED1169] font-semibold" : ""}>Rewards & Summary</span>
          </div>
        </div>
        
        <div className="overflow-hidden"> 
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="px-6 pb-6 pt-2" 
            >
              {currentStep === 1 && (
                <div className="space-y-5"> 
                  <div>
                    <label htmlFor="question" className="form-label">Poll Question</label>
              <input
                type="text"
                      id="question"
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                      placeholder="E.g., What's your favorite LUKSO project?"
                      className="form-input w-full" 
                      maxLength={200}
                      required
                    />
                    <p className="form-input-description">
                      {formData.question.length}/200 characters
                    </p>
            </div>
            
                  <div>
                    <label htmlFor="description" className="form-label">Description</label>
              <textarea
                      id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                      placeholder="Provide more details about your poll..."
                      className="form-input w-full min-h-[100px]" 
                      maxLength={1000}
                    />
                     <p className="form-input-description">
                      {formData.description.length}/1000 characters
                    </p>
          </div>
          
                  <div>
                    <label className="form-label mb-1">Options</label>
                    <div className="space-y-2"> 
            {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionsChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="form-input flex-grow" 
                            maxLength={100}
                            required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50" 
                              aria-label="Delete option"
                  >
                              <TrashIcon className="h-5 w-5" /> 
                  </button>
                )}
              </div>
            ))}
                    </div>
            
                    {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
                        className="mt-2 flex items-center gap-1 text-sm text-[#8F0C4C] hover:text-[#ED1169] transition-colors font-medium" 
            >
                        <PlusIcon className="h-4 w-4" />
                        Add Option
            </button>
                    )}
          </div>
          
                  <div>
                    <label htmlFor="durationInHours" className="form-label">Poll Duration (hours)</label>
              <input
                type="number"
                      id="durationInHours"
                name="durationInHours"
                value={formData.durationInHours}
                onChange={handleInputChange}
                min="1"
                      max="720" 
                      className="form-input w-full" 
                      required
              />
                     <p className="form-input-description">
                      Min: 1 hour, Max: 720 hours (approx. 30 days)
                    </p>
            </div>
                </div>
              )}
              
              {currentStep === 2 && (
                 <div className="space-y-5">
                   <h3 className="text-lg font-semibold text-[#500126] mb-1">Voting Requirement</h3>
                   <p className="text-sm text-gray-600 -mt-4 mb-4">
                    Determine who can vote in your poll. This step is optional.
                  </p>
                  
                  <div>
                    <label htmlFor="requirementType" className="form-label">Allow voting for:</label>
              <select
                      id="requirementType"
                name="requirementType"
                value={formData.requirementType}
                onChange={handleInputChange}
                      className="form-input w-full" 
                    >
                       {Object.entries(VotingRequirementHelper.getRequirementOptions()).map(([value, label]) => {
                         const type = parseInt(value);
                         const isFeeApplied = VotingRequirementHelper.isCombined(type) && combinedRequirementFeeWei !== '0';
                         const feeInLyx = web3?.utils.fromWei(combinedRequirementFeeWei, 'ether');
                         return (
                        <option key={value} value={value}>
                              {label} {isFeeApplied ? ` (+${feeInLyx} LYX Fee)` : ''}
                        </option>
                         );
                       })}
              </select>
                  </div>
                  
                  {(VotingRequirementHelper.requiresLSP7(formData.requirementType) || 
                    VotingRequirementHelper.requiresLSP8(formData.requirementType)) && (
                     <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                       <h4 className="form-label mb-2">Required Asset</h4> 
                      
                      {assetsLoading && (
                         <div className="py-6 text-center text-gray-500">
                          <div className="inline-block animate-spin w-6 h-6 border-2 border-[#ED1169] border-t-transparent rounded-full mb-2"></div>
                          <p>Loading your assets...</p>
                        </div>
                      )}
                      
                      {!assetsLoading && (
                         <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> 
                          {VotingRequirementHelper.requiresLSP7(formData.requirementType) && (
                            <>
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tokens</h5>
                              {tokens.length > 0 ? (
                                tokens.map((asset) => (
                                  <div 
                                    key={asset.address}
                                    onClick={() => handleAssetSelect(asset, 'requirement')}
                                    className={`asset-select-card ${formData.requiredTokenAddress === asset.address ? 'selected' : ''}`}
                                  >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-white">
                                      <img 
                                        src={asset.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`}
                                        alt={asset.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`; }}
                                      />
            </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-800 truncate group-hover:text-[#ED1169]">{asset.name}</p>
                                      <p className="text-xs text-gray-500">{asset.symbol}</p>
                                    </div>
                                    {asset.balance && web3 && (
                                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap ml-2">
                                        {parseFloat(web3.utils.fromWei(asset.balance, 'ether') || '0').toLocaleString()} Balance
                                      </span>
                                    )}
                                     {formData.requiredTokenAddress === asset.address && (
                                       <CheckCircleIcon className="h-5 w-5 text-[#ED1169] flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No LSP7 tokens found.</p>
                              )}
                            </>
                          )}
                          
                          {VotingRequirementHelper.requiresLSP8(formData.requirementType) && (
                             <>
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">NFTs</h5>
                              {nfts.length > 0 ? (
                                nfts.map((asset) => (
                                  <div 
                                    key={asset.address}
                                    onClick={() => handleAssetSelect(asset, 'requirement')}
                                    className={`asset-select-card ${formData.requiredTokenAddress === asset.address ? 'selected' : ''}`}
                                  >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white"> 
                                      <img 
                                        src={asset.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`}
                                        alt={asset.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`; }}
                                      />
                                      </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-800 truncate group-hover:text-[#ED1169]">{asset.name}</p>
                                      <p className="text-xs text-gray-500">{asset.symbol}</p>
                                    </div>
                                     {formData.requiredTokenAddress === asset.address && (
                                       <CheckCircleIcon className="h-5 w-5 text-[#ED1169] flex-shrink-0 ml-2" />
                                     )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No LSP8 NFTs found.</p>
                          )}
                        </>
                          )}
                        </div>
                      )}
                      
                       <div className="mt-4 pt-4 border-t border-gray-200/80">
                         <label htmlFor="requiredTokenAddress" className="form-label block text-sm mb-1">Or Enter Address Manually:</label>
                <input
                  type="text"
                  name="requiredTokenAddress"
                  value={formData.requiredTokenAddress}
                  onChange={handleInputChange}
                            placeholder="Token/NFT Address (0x...)"
                          className="form-input w-full"
                />
              </div>
                      
                      {VotingRequirementHelper.requiresLSP7(formData.requirementType) && formData.requiredTokenAddress && (
                        <div className="mt-3">
                          <label htmlFor="requiredTokenAmount" className="form-label">Minimum Required Token Amount</label>
                <input
                  type="text"
                            id="requiredTokenAmount"
                  name="requiredTokenAmount"
                  value={formData.requiredTokenAmount}
                  onChange={handleInputChange}
                            placeholder="E.g., 10"
                            className="form-input w-full"
                            pattern="[0-9]*\.?[0-9]*"
                />
                          <p className="form-input-description">
                            Minimum tokens users need to hold to vote.
                </p>
              </div>
            )}
          </div>
                  )}
                </div>
              )}
              
              {currentStep === 3 && (
                 <div className="space-y-5">
                   <h3 className="text-lg font-semibold text-[#500126] mb-1">Rewards & Summary</h3>
                   <p className="text-sm text-gray-600 -mt-4 mb-4">
                     Optionally add rewards for participants and review the final details.
                   </p>
                  
                   <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                     <div className="flex items-center">
                       <input
                        type="checkbox"
                        id="enableRewards"
                        name="enableRewards"
                        checked={formData.enableRewards}
                        onChange={(e) => setFormData({ ...formData, enableRewards: e.target.checked })}
                        className="h-4 w-4 text-[#ED1169] border-gray-300 rounded focus:ring-[#ED1169] focus:ring-offset-1"
                      />
                      <label htmlFor="enableRewards" className="ml-2 block text-sm text-gray-700 font-medium">
                        Add Rewards for Participants
                      </label>
                    </div>
                    
                    <AnimatePresence>
                  {formData.enableRewards && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4 pt-4 mt-4 border-t border-gray-200/80 overflow-hidden"
                        >
                           <div>
                      <label htmlFor="targetVoterCount" className="form-label">
                                Target Voter Count <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="targetVoterCount"
                        name="targetVoterCount"
                        value={formData.targetVoterCount}
                        onChange={handleInputChange}
                              min="1" 
                              className="form-input w-full"
                                placeholder="Max. number of reward recipients"
                              required={formData.enableRewards}
                            />
                            <p className="form-input-description">
                                Total reward amount will be calculated based on this number.
                       </p>
                    </div>
                          
                        <div>
                            <label htmlFor="rewardType" className="form-label">Reward Type</label>
                  <select
                            id="rewardType"
                    name="rewardType"
                    value={formData.rewardType}
                    onChange={handleInputChange}
                              className="form-input w-full"
                  >
                              <option value="NATIVE">LYX (Native Currency)</option>
                    <option value="LSP7">LSP7 Token</option>
                  </select>
                </div>
                
                {formData.rewardType === 'NATIVE' && (
                          <div>
                              <label htmlFor="rewardAmount" className="form-label">Reward Per Vote (LYX)</label>
                    <input
                      type="text"
                              id="rewardAmount"
                      name="rewardAmount"
                      value={formData.rewardAmount}
                      onChange={handleInputChange}
                                placeholder="E.g., 0.5"
                                className="form-input w-full"
                                required={formData.enableRewards && formData.rewardType === 'NATIVE'}
                                pattern="[0-9]*\.?[0-9]*"
                              />
                               <p className="form-input-description">
                                Amount of LYX awarded for each valid vote.
                              </p>
                  </div>
                )}
                
                {formData.rewardType === 'LSP7' && (
                             <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-100/30">
                               <h4 className="form-label mb-2">Reward Token Selection</h4>
                               <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                              {tokens.length > 0 ? (
                                tokens.map((asset) => (
                                  <div 
                                    key={asset.address}
                                        onClick={() => handleAssetSelect(asset, 'reward')}
                                        className={`asset-select-card ${formData.tokenAddress === asset.address ? 'selected' : ''}`}
                                      >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-white">
                                          <img 
                                            src={asset.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`}
                                        alt={asset.name} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(asset.symbol || "?")}&background=random&color=fff&bold=true`; }}
                                      />
                                      </div>
                                    <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-800 truncate group-hover:text-[#ED1169]">{asset.name}</p>
                                          <p className="text-xs text-gray-500">{asset.symbol}</p>
                                    </div>
                                        {asset.balance && web3 && (
                                          <span className="text-xs font-medium text-gray-600 whitespace-nowrap ml-2">
                                            {parseFloat(web3.utils.fromWei(asset.balance, 'ether') || '0').toLocaleString()} Balance
                                      </span>
                                        )}
                                        {formData.tokenAddress === asset.address && (
                                           <CheckCircleIcon className="h-5 w-5 text-[#ED1169] flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                ))
                              ) : (
                                      <p className="text-sm text-gray-500 text-center py-4">No LSP7 tokens found.</p>
                              )}
                            </div>
                               <div className="mt-3 pt-3 border-t border-gray-200/80">
                                  <label htmlFor="tokenAddress" className="form-label block text-sm mb-1">Or Enter Address Manually:</label>
                      <input
                        type="text"
                                id="tokenAddress"
                        name="tokenAddress"
                        value={formData.tokenAddress}
                        onChange={handleInputChange}
                                    placeholder="Select from list or paste address (0x...)"
                                    className="form-input w-full"
                      />
                    </div>

                            <div>
                                  <label htmlFor="rewardAmount" className="form-label">Token Reward Per Vote</label>
                              <input
                                type="text"
                                id="rewardAmount"
                                name="rewardAmount"
                                value={formData.rewardAmount}
                                onChange={handleInputChange}
                                    placeholder="E.g., 100"
                                    className="form-input w-full"
                                    required={formData.enableRewards && formData.rewardType === 'LSP7'}
                                    pattern="[0-9]*\.?[0-9]*"
                                  />
                                   <p className="form-input-description">
                                    Amount of tokens awarded for each valid vote.
                                  </p>
                            </div>
                          </div>
                        )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-gray-200/80">
                      <h4 className="text-base font-semibold text-[#500126] mb-3">Summary & Cost</h4>
                      <div className="space-y-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div className="flex justify-between">
                              <span className="text-gray-500">Question:</span>
                              <span className="font-medium text-right truncate ml-4">{formData.question || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Duration:</span>
                              <span className="font-medium">{formData.durationInHours || 0} hours</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Requirement:</span>
                              <span className="font-medium text-right">{VotingRequirementHelper.getRequirementText(formData.requirementType)}</span>
                          </div>
                          {VotingRequirementHelper.requiresLSP7(formData.requirementType) && (
                            <div className="flex justify-between pl-4">
                                <span className="text-gray-500">Required Token:</span>
                                <span className="font-medium text-right truncate ml-4">{formData.requiredTokenAddress ? `${formData.requiredTokenAddress.substring(0,6)}...` : "-"} ({formData.requiredTokenAmount} amount)</span>
                      </div>
            )}
                           {VotingRequirementHelper.requiresLSP8(formData.requirementType) && (
                            <div className="flex justify-between pl-4">
                                <span className="text-gray-500">Required NFT:</span>
                                <span className="font-medium text-right truncate ml-4">{formData.requiredTokenAddress ? `${formData.requiredTokenAddress.substring(0,6)}...` : "-"}</span>
          </div>
                          )}
                          
                          <div className="pt-2 mt-2 border-t border-gray-200">
                              <div className="flex justify-between">
                                  <span className="text-gray-500">Rewards Active:</span>
                                  <span className={`font-medium ${formData.enableRewards ? 'text-green-600' : 'text-red-600'}`}>{formData.enableRewards ? "Yes" : "No"}</span>
                              </div>
                              {formData.enableRewards && (
                                  <>
                                      <div className="flex justify-between">
                                          <span className="text-gray-500">Target Voters:</span>
                                          <span className="font-medium">{formData.targetVoterCount || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-gray-500">Reward Type:</span>
                                          <span className="font-medium">{formData.rewardType === 'NATIVE' ? 'LYX' : 'LSP7 Token'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-gray-500">Reward Per Vote:</span>
                                          <span className="font-medium">{formData.rewardAmount || '0'} {formData.rewardType === 'LSP7' ? (formData.tokenAddress ? `(${formData.tokenAddress.substring(0,5)}...)` : '(Token Not Selected)') : 'LYX'}</span>
                                      </div>
                                  </>
                              )}
                          </div>

                           <div className="pt-3 mt-3 border-t border-gray-300 font-medium">
                              {formData.enableRewards ? (
                                  <>
                                      <div className="flex justify-between">
                                          <span className="text-gray-600">Total Reward Pool:</span>
                                          <span className="text-[#500126]">
                                              {formData.rewardType === 'NATIVE' 
                                                  ? `${(parseFloat(formData.rewardAmount || '0') * (formData.targetVoterCount || 0)).toFixed(4)} LYX` 
                                                  : `${(parseFloat(formData.rewardAmount || '0') * (formData.targetVoterCount || 0)).toLocaleString()} ${formData.tokenAddress ? `(${formData.tokenAddress.substring(0,5)}...)` : 'Token'}`
                                              }
                                          </span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-gray-600">Platform Commission ({commissionRatePercent}%):</span>
                                          <span className="text-[#500126]">
                                             {formData.rewardType === 'NATIVE' 
                                                  ? `${((parseFloat(formData.rewardAmount || '0') * (formData.targetVoterCount || 0)) * (commissionRatePercent / 100)).toFixed(4)} LYX` 
                                                  : `${((parseFloat(formData.rewardAmount || '0') * (formData.targetVoterCount || 0)) * (commissionRatePercent / 100)).toLocaleString()} ${formData.tokenAddress ? `(${formData.tokenAddress.substring(0,5)}...)` : 'Token'}`
                                              }
                                          </span>
                                      </div>
                                      {(userActivePolls > 0 || VotingRequirementHelper.isCombined(formData.requirementType)) && (
                                        <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-gray-300">
                                          <span className="text-gray-600">Additional Fees (LYX):</span>
                                           <span className="text-[#500126]">
                                            {web3?.utils.fromWei((userActivePolls > 0 ? BigInt(pollCreationFeeWei) : 0n) + 
                                             (VotingRequirementHelper.isCombined(formData.requirementType) ? BigInt(combinedRequirementFeeWei) : 0n), 'ether') || '0'} LYX
                                           </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between text-base font-semibold mt-2 pt-2 border-t border-gray-400">
                                          <span>{formData.rewardType === 'NATIVE' ? 'Total LYX to Send:' : 'Total Tokens to Authorize:'}</span>
                                          <span>
                                            {formData.rewardType === 'NATIVE' ? `${estimatedLyxCost} LYX` : `${estimatedTokenCost} ${formData.tokenAddress ? `(${formData.tokenAddress.substring(0,5)}...)` : 'Token'}` }
                                          </span>
                                      </div>
                                       {formData.rewardType === 'LSP7' && (userActivePolls > 0 || VotingRequirementHelper.isCombined(formData.requirementType)) && (
                                         <div className="flex justify-between text-xs font-medium text-gray-600 mt-1">
                                            <span>+ Additional Fees (LYX):</span>
                                            <span>
                                              {web3?.utils.fromWei((userActivePolls > 0 ? BigInt(pollCreationFeeWei) : 0n) + 
                                                (VotingRequirementHelper.isCombined(formData.requirementType) ? BigInt(combinedRequirementFeeWei) : 0n), 'ether') || '0'} LYX
                                             </span>
                                          </div>
                                      )}
                                  </>
                              ) : (
                                   <div className="flex justify-between text-base font-semibold">
                                      <span>Total LYX Fee to Send:</span>
                                      <span>{estimatedLyxCost} LYX</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
            </div>
            
        <div className="mt-4 space-y-2">
        {errorMessage && (
               <div className="form-message error"> 
                 <XCircleIcon className="h-5 w-5 mr-2"/> 
              {errorMessage}
              </div>
            )}
        {successMessage && (
               <div className="form-message success">
                 <CheckCircleIcon className="h-5 w-5 mr-2"/>
              {successMessage}
              </div>
            )}
             {authorizationError && (
                <div className="form-message error">
                   <XCircleIcon className="h-5 w-5 mr-2"/> 
                   {authorizationError}
                 </div>
              )}
        {isAuthorizing && (
               <div className="form-message warning">
                 <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>
                     Waiting for wallet confirmation to authorize token spending...
               </div>
        )}
         </div>

        <div className="mt-8 flex items-center justify-between">
          {currentStep > 1 ? (
          <button
            type="button"
              onClick={goToPrevStep}
              disabled={isSubmitting || isAuthorizing}
              className="btn-secondary inline-flex items-center" 
          >
              <ArrowLeftIcon className="h-4 w-4 mr-1.5"/>
              Back
          </button>
          ) : (
            <div /> 
          )}

          {currentStep < totalSteps ? (
          <button
            type="button"
              onClick={tryNextStep}
              className="btn-primary inline-flex items-center" 
          >
              Continue
              <ArrowRightIcon className="h-4 w-4 ml-1.5"/>
          </button>
          ) : (
          <button
            type="button"
            onClick={handleCreatePoll}
              disabled={isSubmitting || isAuthorizing || (formData.enableRewards && formData.rewardType === 'LSP7' && tokenDecimals === null) || (VotingRequirementHelper.requiresLSP7(formData.requirementType) && requirementTokenDecimals === null)} 
              className="btn-primary inline-flex items-center" 
            >
              {isSubmitting ? (
                <>
                   <div className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                   {isAuthorizing ? 'Authorizing...' : 'Creating Poll...'}
                 </>
               ) : (
                'Create Poll'
              )}
          </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CreatePollModal; 