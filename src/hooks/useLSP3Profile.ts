'use client';

import { useState, useEffect } from 'react';
import { UPClientProvider } from '@lukso/up-provider';
import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// IPFS Gateway URLs - Adding gateways recommended by LUKSO
const IPFS_GATEWAYS = [
  'https://api.universalprofile.cloud/ipfs/',
  'https://2eff.lukso.dev/ipfs/',
  'https://ipfs.lukso.network/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];
      const keysToFetch = [ 'LSP3Profile' ]; 
      console.log("[DEBUG LSP3Profile] Fetching keys:", JSON.stringify(keysToFetch));

// LSP3 Profil veri tipi tanımı (Genişletilmiş)
interface ProfileData {
  name?: string;
  description?: string;
  tags?: string[];
  links?: { title: string; url: string }[];
  profileImage?: string[];
  backgroundImage?: string[];
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

// LSP3 Profile class
export class LSP3ProfileManager {
  private erc725Config: any;
  private provider: UPClientProvider | null;

  constructor(provider: UPClientProvider | null) {
    this.provider = provider;
    
    // ERC725 config for all IPFS gateways
    this.erc725Config = {
      ipfsGateway: IPFS_GATEWAYS[0],
      ipfsGateways: IPFS_GATEWAYS
    };
  }

  // Get profile data
  async getProfileData(address: string): Promise<ProfileData | null> {
    try {
      if (!address || !address.startsWith('0x')) {
        console.warn('Invalid address provided to getProfileData:', address);
        return null;
      }

      let provider: UPClientProvider | null = this.provider;
      let config = { ...this.erc725Config }; // Başlangıç config'i kopyala
      const isRunningInVercel = typeof window !== 'undefined' && window.location?.hostname.includes('vercel.app');

      // Eğer provider yoksa veya Vercel ortamındaysak RPC URL'yi config'e ekle
      if (!provider || isRunningInVercel) {
        console.log('Using direct RPC URL via config for ERC725 in Vercel environment');
        config.rpcUrl = 'https://42.rpc.thirdweb.com';
        provider = null; // Provider'ı null yap, config'deki rpcUrl kullanılsın
      }

      // Create ERC725 instance
      const erc725 = new ERC725(
        LSP3ProfileSchema as any,
        address as `0x${string}`,
        provider, // Varsa UP Provider'ı kullan, yoksa null
        config    // IPFS gateway ve gerekirse RPC URL'yi içeren config
      );

      const keysToFetch = [ 'LSP3Profile' ]; 
      console.log("[DEBUG LSP3Profile] Fetching keys:", JSON.stringify(keysToFetch));

      // Get profile data
      const profileData = await erc725.fetchData('LSP3Profile');
      
      if (!profileData?.value) {
        return null;
      }

      // Format and return profile data
      const formattedProfile = this.formatProfileData(profileData.value);
      
      return formattedProfile;
    } catch (error) {
      console.error('Error getting profile data:', error);
      return null;
    }
  }

  // Format LSP3 profile data
  private formatProfileData(profileData: any): ProfileData {
    try {
      // Check profile data
      if (!profileData) return {} as ProfileData;

      const lsp3Data = profileData.LSP3Profile || profileData;
      
      const profile: ProfileData = {
        name: lsp3Data.name || '',
        description: lsp3Data.description || '',
        tags: lsp3Data.tags || [],
        links: (lsp3Data.links || []).map((link: any) => ({
          title: link.title || '',
          url: link.url || ''
        })),
        avatar: lsp3Data.avatar || []
      };

      // Handle profile image (array format)
      if (lsp3Data.profileImage) {
        if (Array.isArray(lsp3Data.profileImage)) {
          profile.profileImage = lsp3Data.profileImage.map((image: any) => 
            this.processImageObject(image)
          );
        } else {
          profile.profileImage = [this.processImageObject(lsp3Data.profileImage)];
        }
      }

      // Handle background image (array format)
      if (lsp3Data.backgroundImage) {
        if (Array.isArray(lsp3Data.backgroundImage)) {
          profile.backgroundImage = lsp3Data.backgroundImage.map((image: any) => 
            this.processImageObject(image)
          );
        } else {
          profile.backgroundImage = [this.processImageObject(lsp3Data.backgroundImage)];
        }
      }

      return profile;
    } catch (error) {
      console.error('Error formatting profile data:', error);
      return {} as ProfileData;
    }
  }

  // Process image object
  private processImageObject(image: any): string {
    // If it's a string URL
    if (typeof image === 'string') {
      return this.formatIPFSUrl(image);
    }
    
    // If it's an object with URL
    if (image?.url) {
      return this.formatIPFSUrl(image.url);
    }
    
    // If it's an NFT reference
    if (image?.address) {
      // For NFT images, we can't directly render them
      // Return a placeholder or implement NFT image fetching later
      return `/lukso-nft-placeholder.png`;
    }
    
    return '';
  }

  // Format IPFS URLs
  private formatIPFSUrl(url: string): string {
    try {
      if (!url) return '';

      // If already in HTTP(S) format
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // If data URI (base64 etc)
      if (url.startsWith('data:')) {
        return url;
      }

      // If IPFS format
      if (url.startsWith('ipfs://')) {
        const ipfsHash = url.replace('ipfs://', '');
        return `${IPFS_GATEWAYS[0]}${ipfsHash}`;
      }

      return url;
    } catch (error) {
      console.error('Error formatting IPFS URL:', error);
      return '';
    }
  }

  // Get a profile image URL (utility method)
  getProfileImageUrl(profile: ProfileData): string {
    if (!profile) return '';
    
    // Try avatar first (preferred in LSP3)
    if (profile.avatar && profile.avatar.length > 0) {
      const avatar = profile.avatar[0];
      if (avatar.url) {
        return this.formatIPFSUrl(avatar.url);
      }
    }
    
    // Then try profileImage
    if (profile.profileImage && profile.profileImage.length > 0) {
      return profile.profileImage[0] || '';
    }
    
    return '';
  }
}

// Hook implementation
const useLSP3Profile = (address: string | null, provider: UPClientProvider | null) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');

  useEffect(() => {
    if (!address || !provider) {
      // console.log('useLSP3Profile: No address or provider', { address, providerExists: !!provider });
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        // console.log(`useLSP3Profile: Fetching profile data for ${address}...`);
        
        // LSP3ProfileManager kullanarak profil çek
        const lsp3Manager = new LSP3ProfileManager(provider);
        const profileData = await lsp3Manager.getProfileData(address);
        
        if (profileData) {
          // console.log('useLSP3Profile: Profile fetched successfully:', profileData);
          setProfile(profileData);
          
          // Profil resmi URL'sini ayarla
          const imageUrl = lsp3Manager.getProfileImageUrl(profileData);
          setProfileImageUrl(imageUrl);
        } else {
          // console.log('useLSP3Profile: Profile not found');
          setProfile(null);
          setProfileImageUrl('');
        }
      } catch (e) {
        console.error('useLSP3Profile: Error occurred:', e);
        setError(e instanceof Error ? e : new Error('An error occurred while loading profile data'));
        setProfile(null);
        setProfileImageUrl('');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address, provider]);

  // Helper function to shorten address (e.g., 0x1234...5678)
  const shortenAddress = (addr: string | null): string => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return { 
    profile, 
    loading, 
    error, 
    profileImageUrl,
    shortenAddress,
    displayName: profile?.name || shortenAddress(address)
  };
};

export default useLSP3Profile; 
