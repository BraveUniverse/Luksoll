"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClientUPProvider, type UPClientProvider } from '@lukso/up-provider';
import Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';
import type { EthExecutionAPI, SupportedProviders } from 'web3';
import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import { CONTRACT_ADDRESS, POLL_CONTRACT_ABI, getWeb3Instance, getContract } from '@/contracts/contract-config';

declare global {
  interface Window {
    ethereum?: any;
    lukso?: any; 
  }
}

interface ProfileData {
  name?: string;
  description?: string;
  tags?: string[];
  links?: { title: string; url: string }[];
  profileImage?: string;
  backgroundImage?: string;
}

interface UPContextType {
  upProvider: UPClientProvider | null;
  web3: Web3 | null;
  isConnected: boolean;
  connecting: boolean;
  address: string | null;
  contextAccounts: Array<`0x${string}`>;
  profileData: ProfileData | null;
  contract: any;
  error: string | null;
  connectUP: () => Promise<void>;
  loadProfileData: (address: string) => Promise<ProfileData | null>;
  isInitialized: boolean;
  provider: SupportedProviders | undefined;
  disconnectUP: () => void;
}

const UPContext = createContext<UPContextType | undefined>(undefined);

export const useUP = () => {
  const context = useContext(UPContext);
  if (!context) {
    throw new Error('useUP must be used within a UPContextProvider');
  }
  return context;
};

const createProvider = () => {
  if (typeof window !== 'undefined') {
    
    if (window.lukso) {
      console.log('LUKSO Browser Extension found');
    } else {
      console.warn('LUKSO Browser Extension not found. Using universal-profile.cloud.');
    }
    
    try {
      const provider = createClientUPProvider();
      console.log('Provider created successfully:', provider);
      return provider;
    } catch (error) {
      console.error('Error creating provider:', error);
      return null;
    }
  }
  return null;
};

export const UPContextProvider = ({ children }: { children: ReactNode }) => {
  const [upProvider, setUpProvider] = useState<UPClientProvider | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [provider, setProvider] = useState<SupportedProviders | undefined>(undefined);

  
  const updateConnected = useCallback(
    (accounts: Array<`0x${string}`>, _contextAccounts: Array<`0x${string}`> = []) => {
      const connected = accounts.length > 0;
      console.log('Updating connection status:', connected, 'Accounts:', accounts, 'Context Accounts:', _contextAccounts);
      
      setIsConnected(connected);
      
      if (connected && accounts[0]) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
      }
    },
    []
  );

  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('UPContextProvider: Initializing provider...');
    
    const initUPProvider = async () => {
      try {
        
        const provider = createProvider();
        if (!provider) {
          console.error('Failed to create provider');
          return;
        }
        
        console.log('Initializing LUKSO Provider...');
        setUpProvider(provider);
        setProvider(provider as unknown as SupportedProviders);

        
        try {
          
          const web3Instance = new Web3(provider as unknown as SupportedProviders<EthExecutionAPI>);
          setWeb3(web3Instance);
          console.log('Web3 created successfully:', web3Instance);
        } catch (error) {
          console.error('Error creating Web3 instance:', error);
        }
        
        
        try {
          console.log('Checking connected accounts...');
          const accounts = await provider.request({ method: 'eth_accounts' }) as Array<`0x${string}`>;
          console.log('Current connected accounts:', accounts);
          
          
          const _contextAccounts = provider.contextAccounts || [];
          setContextAccounts(_contextAccounts);
          console.log('Context accounts:', _contextAccounts);
          
          updateConnected(accounts, _contextAccounts);
          
          
          // !!! loadProfileData çağrısı buradan kaldırıldı !!!
          // if (accounts.length > 0) {
          //   // Profile data will be loaded via accountsChanged listener or page useEffect
          // }
        } catch (error) {
          console.error('Error checking accounts:', error);
        }
          
        // Provider başlatıldıktan SONRA isInitialized'ı set et
        setIsInitialized(true);
        console.log('UP Provider initialized successfully, isInitialized:', true);
      } catch (err: any) {
        console.error('Error initializing UPProvider:', err);
        setError(err.message || 'Failed to initialize UPProvider');
      }
    };

    initUPProvider();
  }, [updateConnected]); // Bu useEffect sadece bir kere çalışmalı (mount'da)

  
  useEffect(() => {
    if (!web3 || !isConnected) return;
    
    try {
      console.log('Initializing contract...');
      
      const pollContract = getContract(web3);
      
      if (!pollContract) {
        console.error('Failed to create contract instance');
        setError('Failed to create contract instance. Please refresh and try again.');
        return;
      }
      
      setContract(pollContract);
      console.log('Contract initialized successfully:', pollContract);
      
      
      const testContractConnection = async () => {
        try {
          
          const pollCount = await pollContract.methods.pollCount().call();
          console.log('Poll count:', pollCount);
          console.log('Contract connection successful!');
        } catch (err: any) {
          console.error('Contract connection test failed:', err);
          setError(`Contract connection test failed: ${err.message || 'Unknown error'}`);
        }
      };
      
      testContractConnection();
    } catch (err: any) {
      console.error('Error initializing contract:', err);
      setError(err.message || 'Failed to initialize contract');
    }
  }, [web3, isConnected]);

  
  useEffect(() => {
    if (!upProvider) return;

    const accountsChanged = (_accounts: Array<`0x${string}`>) => {
      console.log('Accounts changed:', _accounts);
      updateConnected(_accounts, contextAccounts);

      // Profil verisini SADECE provider initialize OLDUKTAN SONRA yükle
      if (isInitialized && _accounts.length > 0) {
        console.log('[accountsChanged] Provider initialized, loading profile data...');
        loadProfileData(_accounts[0]).then(setProfileData);
      } else if (!isInitialized) {
        console.log('[accountsChanged] Provider NOT initialized yet, skipping profile load.');
      }
      else {
        // Hesap yoksa profili temizle
        setProfileData(null);
      }
    };

    const contextAccountsChanged = (_accounts: Array<`0x${string}`>) => {
      console.log('Context accounts changed:', _accounts);
      setContextAccounts(_accounts);
      updateConnected(upProvider.accounts as Array<`0x${string}`>, _accounts);
    };

    const chainChanged = () => {
      console.log('Chain changed, not reloading page');
      
      
      
      
      if (web3) {
        try {
          const pollContract = getContract(web3);
          if (pollContract) {
            setContract(pollContract);
            console.log('Contract updated after chain change');
          }
        } catch (err) {
          console.error('Failed to update contract after chain change:', err);
        }
      }
    };

    
    upProvider.on('accountsChanged', accountsChanged);
    upProvider.on('contextAccountsChanged', contextAccountsChanged);
    upProvider.on('chainChanged', chainChanged);

    // Temizlik fonksiyonu
    return () => {
      upProvider.removeListener('accountsChanged', accountsChanged);
      upProvider.removeListener('contextAccountsChanged', contextAccountsChanged);
      upProvider.removeListener('chainChanged', chainChanged);
    };
  }, [upProvider, contextAccounts, updateConnected, web3, isInitialized]);

  // Profil verilerini yükle - LSP3Profile standartını kullanarak
  const loadProfileData = async (userAddress: string): Promise<ProfileData | null> => {
    // Fonksiyonun başında provider ve initialized kontrolü
    if (!upProvider || !isInitialized) {
      console.warn('[loadProfileData] Aborted: Provider not available or not initialized.');
      return null;
    }
    if (!userAddress) {
      console.warn('[loadProfileData] Aborted: No user address provided.');
      return null;
    }
    
    console.log('Profil verisi yükleniyor:', userAddress);
    setError(null); // Clear previous errors
    
    try {
      // ERC725 provider olarak doğrudan upProvider'ı kullan
      // const provider = web3.currentProvider; // Bu satır kaldırıldı
      const config = { ipfsGateway: 'https://api.universalprofile.cloud/ipfs' };
      
      // ERC725 instance oluştur
      const erc725 = new ERC725(
        LSP3ProfileSchema,
        userAddress,
        upProvider as any, // Doğrudan upProvider kullanıldı
        config
      );
      
      // LSP3Profile verilerini çek
      const profileData = await erc725.fetchData('LSP3Profile');
      console.log('Profil verisi:', profileData);
      
      if (!profileData.value) {
        return {
          name: 'LUKSO User',
          profileImage: '/default-avatar.png'
        };
      }
      
      const profile = profileData.value as any;
      
      const processedProfile: ProfileData = {
        name: profile.name || 'LUKSO User',
        description: profile.description || '',
        tags: profile.tags || [],
        links: profile.links || [],
        profileImage: profile.profileImage?.[0]?.url || '/default-avatar.png',
        backgroundImage: profile.backgroundImage?.[0]?.url || ''
      };
      
      return processedProfile;
    } catch (err: any) {
      console.error('Error loading profile data:', err);
      
      // Return default profile info on error
      return {
        name: 'LUKSO User', 
        profileImage: '/default-avatar.png'
      };
    }
  };

  // Connect to UP
  const connectUP = async () => {
    if (!upProvider || !isInitialized) {
      console.error('UPProvider not initialized');
      setError('UPProvider not initialized. Please refresh and try again.');
      return;
    }
    
    if (isConnected) {
      console.log('Already connected');
      return;
    }
    
    try {
      setConnecting(true);
      console.log('Connecting to UP...');
      
      // Request wallet connection using eth_requestAccounts
      const accounts = await upProvider.request({
        method: 'eth_requestAccounts'
      }) as Array<`0x${string}`>;
      
      console.log('Connection successful, accounts:', accounts);
      
      // Get context accounts (page owner UP)
      const _contextAccounts = upProvider.contextAccounts || [];
      console.log('Context accounts:', _contextAccounts);
      
      // Update connection status
      updateConnected(accounts, _contextAccounts);
      
      // Load user profile data
      if (accounts.length > 0) {
        const profile = await loadProfileData(accounts[0]);
        setProfileData(profile);
      }
      
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };
  
  // Disconnect
  const disconnectUP = () => {
    setIsConnected(false);
    setAddress(null);
    setProfileData(null);
  };

  return (
    <UPContext.Provider
      value={{
        upProvider,
        web3,
        isConnected,
        connecting,
        address,
        contextAccounts,
        profileData,
        contract,
        error,
        connectUP,
        loadProfileData,
        isInitialized,
        provider,
        disconnectUP
      }}
    >
      {children}
    </UPContext.Provider>
  );
}; 