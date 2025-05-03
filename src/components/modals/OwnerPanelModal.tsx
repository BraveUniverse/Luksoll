"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import Modal from './Modal';
import { useUP } from '@/context/UPContext';
import {
    getOwner,
    getPollCreationFee,
    getCombinedRequirementFee,
    getCommissionRate,
    getTotalLYXCommission,
    getCommissionEarnedTokenAddresses,
    getTokenCommissionEarned,
    setPollCreationFee,
    setCombinedRequirementFee,
    setCommissionRate,
    withdrawCommission,
    withdrawTokenCommission,
    fetchTokenMetadataFromLSP,
    POLL_CONTRACT_ABI
} from '@/contracts/contract-config';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ArrowPathIcon, BanknotesIcon } from '@heroicons/react/24/outline';

// Placeholder function type for fetching LSP4 icon - replace with actual implementation if available
// async function fetchLSP4Icon(tokenAddress: string): Promise<string | null> { 
//     console.warn("fetchLSP4Icon is a placeholder and needs implementation.");
//     // Example: Fetch LSP4 metadata and extract icon URL
//     // try {
//     //   const data = await //... fetch logic ...;
//     //   return data?.LSP4Metadata?.icon?.[0]?.url || null; 
//     // } catch { return null; }
//     return null; 
// }

interface OwnerPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TokenCommissionInfo {
    address: string;
    name?: string;      
    symbol?: string;    
    decimals?: bigint;  
    iconUrl?: string;   
    earnedAmount: string; 
}

const OwnerPanelModal: React.FC<OwnerPanelModalProps> = ({ isOpen, onClose }) => {
    const { address, web3, contract, isConnected } = useUP();
    const [isOwner, setIsOwner] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Current Settings States
    const [currentPollFee, setCurrentPollFee] = useState<string>('0');
    const [currentCombinedFee, setCurrentCombinedFee] = useState<string>('0');
    const [currentCommissionRate, setCurrentCommissionRate] = useState<number>(0);
    const [totalLyxEarned, setTotalLyxEarned] = useState<string>('0');
    const [tokenCommissions, setTokenCommissions] = useState<TokenCommissionInfo[]>([]);

    // Input States
    const [newPollFee, setNewPollFee] = useState<string>('');
    const [newCombinedFee, setNewCombinedFee] = useState<string>('');
    const [newCommissionRate, setNewCommissionRate] = useState<string>('');
    const [withdrawLyxAmount, setWithdrawLyxAmount] = useState<string>('');
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>('');
    const [withdrawTokenAmount, setWithdrawTokenAmount] = useState<string>(''); 

    // Loading states for actions
    const [isSettingPollFee, setIsSettingPollFee] = useState(false);
    const [isSettingCombinedFee, setIsSettingCombinedFee] = useState(false);
    const [isSettingRate, setIsSettingRate] = useState(false);
    const [isWithdrawingLyx, setIsWithdrawingLyx] = useState(false);
    const [isWithdrawingToken, setIsWithdrawingToken] = useState(false);

    // --- Formatting Helpers ---
    const formatWeiToLyx = (wei: string | bigint): string => {
        if (!web3) return '0';
        try {
            return parseFloat(web3.utils.fromWei(wei, 'ether')).toLocaleString(undefined, { maximumFractionDigits: 6 });
        } catch { return '0'; }
    };

    const formatTokenAmount = (amountWei: string | bigint, decimals: bigint | number | undefined): string => {
        if (!web3 || decimals === undefined || decimals === null) return 'N/A';
        try {
            const decimalsBigInt = BigInt(decimals);
            const factor = 10n ** decimalsBigInt;
            const amountBig = BigInt(amountWei);
            
            // Format with appropriate decimal places
            const integerPart = amountBig / factor;
            const fractionalPart = amountBig % factor;

            if (fractionalPart === 0n) {
                return integerPart.toString();
            }

            const fractionalString = fractionalPart.toString().padStart(Number(decimals), '0').replace(/0+$/, ''); // Remove trailing zeros
             return `${integerPart}.${fractionalString || '0'}`;
        } catch (error) {
            console.error("Error formatting token amount:", error);
            return 'Error';
        }
    };
    // --- End Formatting Helpers ---

    const fetchData = useCallback(async () => {
        if (!web3 || !contract || !address || !isConnected) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const ownerAddress = await getOwner(contract);
            if (ownerAddress && ownerAddress.toLowerCase() === address.toLowerCase()) {
                setIsOwner(true);

                // Fetch base data
                const [pollFeeWei, combinedFeeWei, rate, lyxEarnedWei, tokenAddresses] = await Promise.all([
                    getPollCreationFee(contract, address),
                    getCombinedRequirementFee(contract, address),
                    getCommissionRate(contract, address),
                    getTotalLYXCommission(contract, address),
                    getCommissionEarnedTokenAddresses(contract, address)
                ]);

                setCurrentPollFee(pollFeeWei || '0');
                setCurrentCombinedFee(combinedFeeWei || '0');
                setCurrentCommissionRate(rate ?? 0);
                setTotalLyxEarned(lyxEarnedWei || '0');

                // Fetch details for each token with commission
                if (tokenAddresses && tokenAddresses.length > 0) {
                    const tokenInfoPromises = tokenAddresses.map(async (tokenAddr): Promise<TokenCommissionInfo | null> => {
                        const earned = await getTokenCommissionEarned(contract, tokenAddr, address);
                        if (!earned || BigInt(earned) === 0n) return null; // Skip if no commission
                        
                        try {
                            const metadata = await fetchTokenMetadataFromLSP(web3.currentProvider, tokenAddr);

                            return {
                                address: tokenAddr,
                                name: metadata?.name || 'Unknown Token',
                                symbol: metadata?.symbol || 'TOKEN',
                                decimals: metadata?.decimals,
                                iconUrl: metadata?.iconUrl || undefined,
                                earnedAmount: earned 
                            };
                        } catch (error) {
                            console.error(`Error processing details for token ${tokenAddr}:`, error);
                            // Return minimal info on error
                            return {
                                address: tokenAddr,
                                symbol: 'ERROR',
                                earnedAmount: earned
                            };
                        }
                    });

                    const tokenData = (await Promise.all(tokenInfoPromises)).filter(Boolean) as TokenCommissionInfo[];
                    setTokenCommissions(tokenData);
                }
                 else {
                    setTokenCommissions([]);
                }

            } else {
                setIsOwner(false);
                setErrorMessage("You are not the owner of this contract.");
            }
        } catch (error: any) {
            setErrorMessage(`Failed to load owner panel data: ${error.message}`);
            setIsOwner(false); // Assume not owner on error
        } finally {
            setIsLoading(false);
        }
    }, [web3, contract, address, isConnected]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Handlers for setting values
    const handleSetFee = async (type: 'poll' | 'combined') => {
        if (!web3 || !contract || !address) return;
        const value = type === 'poll' ? newPollFee : newCombinedFee;
        const setter = type === 'poll' ? setPollCreationFee : setCombinedRequirementFee;
        const setLoading = type === 'poll' ? setIsSettingPollFee : setIsSettingCombinedFee;

        if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
            setErrorMessage(`Invalid ${type} fee amount.`);
            return;
        }

        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const valueWei = web3.utils.toWei(value, 'ether');
            await setter(contract, valueWei, address);
            setSuccessMessage(`${type === 'poll' ? 'Poll creation' : 'Combined requirement'} fee updated successfully!`);
            // Reset input and refetch data
            if (type === 'poll') setNewPollFee(''); else setNewCombinedFee('');
            fetchData(); 
        } catch (error: any) {
            setErrorMessage(`Failed to set ${type} fee: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSetRate = async () => {
        if (!web3 || !contract || !address) return;
        const rate = parseInt(newCommissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            setErrorMessage("Commission rate must be between 0 and 100.");
            return;
        }

        setIsSettingRate(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            await setCommissionRate(contract, rate, address);
            setSuccessMessage("Commission rate updated successfully!");
            setNewCommissionRate('');
            fetchData(); 
        } catch (error: any) {
            setErrorMessage(`Failed to set commission rate: ${error.message}`);
        } finally {
            setIsSettingRate(false);
        }
    };

    // Handlers for withdrawing commissions
    const handleWithdrawLyx = async () => {
        if (!web3 || !contract || !address) return;
        if (!withdrawLyxAmount || isNaN(parseFloat(withdrawLyxAmount)) || parseFloat(withdrawLyxAmount) <= 0) {
            setErrorMessage("Invalid LYX amount to withdraw.");
            return;
        }

        setIsWithdrawingLyx(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const amountWei = web3.utils.toWei(withdrawLyxAmount, 'ether');
            if (BigInt(amountWei) > BigInt(totalLyxEarned)) {
                throw new Error("Withdrawal amount exceeds earned LYX commission.");
            }
            await withdrawCommission(contract, amountWei, address);
            setSuccessMessage("LYX commission withdrawn successfully!");
            setWithdrawLyxAmount('');
            fetchData(); 
        } catch (error: any) {
            setErrorMessage(`Failed to withdraw LYX commission: ${error.message}`);
        } finally {
            setIsWithdrawingLyx(false);
        }
    };

    const handleWithdrawToken = async () => {
        if (!web3 || !contract || !address || !selectedTokenAddress) return;
        const selectedTokenInfo = tokenCommissions.find(t => t.address === selectedTokenAddress);

        if (!selectedTokenInfo || !withdrawTokenAmount ) {
            setErrorMessage("Invalid token selection or amount.");
            return;
        }
        
        const decimals = selectedTokenInfo.decimals;
        if (decimals === undefined || decimals === null) {
             setErrorMessage(`Cannot determine decimals for token ${selectedTokenInfo.symbol || selectedTokenAddress}. Withdrawal failed.`);
             return;
        }

        let amountWei: string;
        try {
            // Attempt to parse user input, could be float
            const amountString = withdrawTokenAmount.replace(/,/g, '.'); // Normalize decimal separator
            const amountFloat = parseFloat(amountString);
            if (isNaN(amountFloat) || amountFloat <= 0) {
                throw new Error("Invalid withdrawal amount entered.");
            }

            // Convert float amount to Wei string based on token decimals
            const decimalsBigInt = BigInt(decimals);
            const factor = 10n ** decimalsBigInt;
            // Use multiplication and division to handle potential floating point inaccuracies carefully
            // Convert float to a fixed-point representation string first
            const parts = amountString.split('.');
            const integerPart = BigInt(parts[0]);
            const fractionalPart = parts[1] ? parts[1].padEnd(Number(decimals), '0').substring(0, Number(decimals)) : '0';
            
            amountWei = ((integerPart * factor) + BigInt(fractionalPart)).toString();

        } catch (parseError: any) {
            setErrorMessage(`Invalid amount format: ${parseError.message}`);
            return;
        }

        if (BigInt(amountWei) <= 0n) {
             setErrorMessage("Withdrawal amount must be positive.");
            return;
        }

        if (BigInt(amountWei) > BigInt(selectedTokenInfo.earnedAmount)) {
            setErrorMessage("Withdrawal amount exceeds earned token commission.");
            return;
       }

        setIsWithdrawingToken(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            await withdrawTokenCommission(contract, selectedTokenAddress, amountWei, address);
            setSuccessMessage(`${selectedTokenInfo.symbol || 'Token'} commission withdrawn successfully!`);
            setWithdrawTokenAmount('');
            setSelectedTokenAddress(''); // Reset selection
            fetchData(); 
        } catch (error: any) {
            setErrorMessage(`Failed to withdraw token commission: ${error.message}`);
        } finally {
            setIsWithdrawingToken(false);
        }
    };

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Owner Panel">
                <div className="flex justify-center items-center py-10">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-[#ED1169]" />
                    <span className="ml-3 text-gray-600">Loading Owner Data...</span>
                </div>
            </Modal>
        );
    }

    if (!isOwner) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Owner Panel">
                <div className="form-message error flex items-center">
                    <XCircleIcon className="h-5 w-5 mr-2"/> 
                    Access denied. Only the contract owner can access this panel.
                </div>
            </Modal>
        );
    }

    // Helper to render input group
    const renderInputGroup = (
        label: string,
        currentValueLabel: string, 
        inputType: string,
        valueState: string,
        setValueState: (value: string) => void,
        placeholder: string,
        buttonText: string,
        buttonAction: () => void,
        loadingState: boolean,
        unit: string = 'LYX' 
    ) => (
        <div className="mb-4">
            <label className="form-label">{label} ({currentValueLabel})</label>
            <div className="flex gap-2 items-center"> 
                <input
                    type={inputType}
                    value={valueState}
                    onChange={(e) => setValueState(e.target.value)} 
                    placeholder={placeholder}
                    className="form-input flex-grow"
                    min={inputType === 'number' ? "0" : undefined}
                    step={inputType === 'number' ? "any" : undefined} 
                    disabled={loadingState}
                />
                 <span className="text-sm text-gray-500 ml-1">{unit}</span> 
                <button
                    onClick={buttonAction}
                    disabled={loadingState || !valueState}
                    className="btn-secondary whitespace-nowrap"
                >
                    {loadingState ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : buttonText}
                </button>
            </div>
        </div>
    );

    // Find selected token details for rendering withdrawal section
    const selectedTokenDetails = tokenCommissions.find(t => t.address === selectedTokenAddress);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Owner Panel" size="lg">
            <div className="space-y-6">
                {/* Fee Management */}
                <section>
                    <h3 className="text-lg font-semibold text-[#500126] mb-3 border-b pb-2">Fee Management</h3>
                    {renderInputGroup(
                        "Poll Creation Fee (for 2nd+ poll)",
                        `Current: ${formatWeiToLyx(currentPollFee)} LYX`,
                        "number",
                        newPollFee,
                        setNewPollFee,
                        "New fee in LYX",
                        "Set Fee",
                        () => handleSetFee('poll'),
                        isSettingPollFee
                    )}
                    {renderInputGroup(
                        "Combined Requirement Fee",
                        `Current: ${formatWeiToLyx(currentCombinedFee)} LYX`,
                        "number",
                        newCombinedFee,
                        setNewCombinedFee,
                        "New fee in LYX",
                        "Set Fee",
                        () => handleSetFee('combined'),
                        isSettingCombinedFee
                    )}
                </section>

                {/* Commission Rate */}
                <section>
                    <h3 className="text-lg font-semibold text-[#500126] mb-3 border-b pb-2">Commission Rate</h3>
                    {renderInputGroup(
                        "Platform Commission Rate",
                        `Current: ${currentCommissionRate}%`,
                        "number",
                        newCommissionRate,
                        setNewCommissionRate,
                        "New rate (0-100)",
                        "Set Rate",
                        handleSetRate,
                        isSettingRate,
                        '%' 
                    )}
                </section>

                {/* LYX Commission */}
                <section>
                    <h3 className="text-lg font-semibold text-[#500126] mb-3 border-b pb-2">LYX Commission</h3>
                    {renderInputGroup(
                        "Total Earned LYX Commission",
                        `Earned: ${formatWeiToLyx(totalLyxEarned)} LYX`,
                        "number",
                        withdrawLyxAmount,
                        setWithdrawLyxAmount,
                        "Amount to withdraw",
                        "Withdraw LYX",
                        handleWithdrawLyx,
                        isWithdrawingLyx
                    )}
                </section>

                {/* Token Commission - Improved UI */}
                <section>
                    <h3 className="text-lg font-semibold text-[#500126] mb-3 border-b pb-2">Token Commissions</h3>
                    {tokenCommissions.length === 0 ? (
                        <p className="text-sm text-gray-500">No token commissions earned yet.</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Click on a token to manage withdrawal:</p>
                             <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                {tokenCommissions.map((token) => (
                                    <div 
                                        key={token.address}
                                        onClick={() => {
                                            setSelectedTokenAddress(token.address);
                                            setWithdrawTokenAmount(''); // Reset amount on new selection
                                        }}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-[#f0e4e9] ${selectedTokenAddress === token.address ? 'bg-[#e8d9e0] border border-[#ED1169]' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {token.iconUrl ? (
                                                <img src={token.iconUrl} alt={token.symbol} className="h-6 w-6 rounded-full object-cover" />
                                            ) : (
                                                <BanknotesIcon className="h-6 w-6 text-gray-400" /> // Fallback icon
                                            )}
                                            <div>
                                                <span className="font-medium text-sm">{token.name} ({token.symbol})</span>
                                                <span className="block text-xs text-gray-500 truncate">{token.address}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-sm">
                                                {formatTokenAmount(token.earnedAmount, token.decimals)}
                                            </span>
                                            <span className="block text-xs text-gray-500">Earned</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* Withdrawal section for selected token */} 
                    {selectedTokenAddress && selectedTokenDetails && (
                        <div className="mt-4 p-3 border rounded-md bg-gray-50">
                            <h4 className="text-md font-semibold text-[#500126] mb-2">Withdraw {selectedTokenDetails.symbol}</h4>
                            {renderInputGroup(
                                `Withdraw ${selectedTokenDetails.symbol || 'Token'} Commission`,
                                `Earned: ${formatTokenAmount(selectedTokenDetails.earnedAmount, selectedTokenDetails.decimals)}`,
                                "number", // Allow float input
                                withdrawTokenAmount,
                                setWithdrawTokenAmount,
                                "Amount to withdraw",
                                "Withdraw Token",
                                handleWithdrawToken,
                                isWithdrawingToken,
                                selectedTokenDetails.symbol || 'Token' // Unit shown next to input
                            )}
                        </div>
                    )}
                </section>

                {/* Messages */}
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
                </div>
            </div>
        </Modal>
    );
};

export default OwnerPanelModal; 