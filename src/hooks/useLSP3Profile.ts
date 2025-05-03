'use client';
 
 import { useState, useEffect } from 'react';
 import { ERC725 } from '@erc725/erc725.js';
 import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
 import Web3 from 'web3'; // Use standard Web3 import
 import type { EthExecutionAPI, SupportedProviders } from 'web3'; // Use standard Web3 types
 import { useUP } from '@/context/UPContext'; // Import useUP to access context
 
 // IPFS Gateway URLs - Adding gateways recommended by LUKSO
 const IPFS_GATEWAYS = [
   'https://api.universalprofile.cloud/ipfs/',
   'https://2eff.lukso.dev/ipfs/',
   'https://ipfs.lukso.network/ipfs/',
   'https://cloudflare-ipfs.com/ipfs/',
   'https://ipfs.io/ipfs/'
 ];
 // Use a primary gateway for fetching
 const PRIMARY_IPFS_GATEWAY = IPFS_GATEWAYS[0];
 
 // LSP3 Profil veri tipi tanımı (Genişletilmiş)
 interface ProfileData {
   name?: string;
   description?: string;
   tags?: string[];
   links?: { title: string; url: string }[];
   profileImage?: string[]; // Store processed URLs directly
   backgroundImage?: string[]; // Store processed URLs directly
   avatar?: { // Keep avatar structure for potential future use/logic
     url?: string; // Raw URL from metadata
     processedUrl?: string; // Processed URL for display
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
   private erc725Config: any; // Keep config for potential future use or if getData fails
 
   constructor() {
     // ERC725 config might still be useful for other methods or fallbacks
     this.erc725Config = {
       ipfsGateway: PRIMARY_IPFS_GATEWAY, // Set a primary one
       ipfsGateways: IPFS_GATEWAYS
     };
   }
 
   // Get profile data using fetchData and public RPC URL
   async getProfileData(address: string): Promise<ProfileData | null> {
     try {
       if (!address || !address.startsWith('0x')) {
         console.warn('Invalid address provided to getProfileData:', address);
         return null;
       }
 
       // Create ERC725 instance using public RPC URL (eskikod approach)
       const PUBLIC_RPC_URL = 'https://rpc.mainnet.lukso.network';
       const erc725 = new ERC725(
         LSP3ProfileSchema as any,
         address as `0x${string}`,
         PUBLIC_RPC_URL, // Use public RPC URL string as provider
         this.erc725Config // Pass config
       );
 
       console.debug('LSP3 Profile data fetching (using fetchData):', address);
 
       // 1. Get the decoded profile data directly using fetchData
       const decodedProfileMetadata = await erc725.fetchData('LSP3Profile');
       
       // fetchData returns the resolved data directly inside 'value'
       const profileValue = decodedProfileMetadata?.value as any;
 
       // Check if we have the LSP3Profile data inside the value
       if (!profileValue || !profileValue.LSP3Profile) {
         console.debug('Fetched data does not contain LSP3Profile key or value is null:', address, decodedProfileMetadata);
         return null; // No valid IPFS link found
       }
       
       // 4. Format the LSP3Profile data from the fetched JSON
       const formattedProfile = this.formatProfileData(profileValue.LSP3Profile);
       console.debug('Profile fetched and formatted:', formattedProfile.name);
       
       return formattedProfile;
 
     } catch (error: any) {
       // Catch potential errors from erc725.fetchData()
       console.error('Error getting profile data:', error.message || error);
       // Rethrow or handle specific errors if needed (e.g., HEX encoding error)
       // Check if the error message matches the original one
       if (error.message && error.message.includes('odd length')) {
            console.error(">>> Detected the specific 'odd length hex string' error during fetchData call!");
       }
       return null;
     }
   }
 
   // Format LSP3 profile data (expects the content of LSP3Profile, not the raw ERC725 value)
   private formatProfileData(lsp3Data: any): ProfileData {
     try {
       if (!lsp3Data) return {} as ProfileData;
 
       // Process avatar array (add processedUrl)
       const processedAvatars = (lsp3Data.avatar || []).map((avatar: any) => ({
           ...avatar, // Keep original fields
           processedUrl: avatar?.url ? this.formatIPFSUrl(avatar.url) : undefined // Add processed URL
       }));
 
       const profile: ProfileData = {
         name: lsp3Data.name || '',
         description: lsp3Data.description || '',
         tags: lsp3Data.tags || [],
         links: (lsp3Data.links || []).map((link: any) => ({
           title: link.title || '',
           url: link.url || '' // Keep original link URL for now
         })),
         // Process images and store processed URLs directly
         profileImage: this.processImages(lsp3Data.profileImage),
         backgroundImage: this.processImages(lsp3Data.backgroundImage),
         avatar: processedAvatars // Store the processed avatar array
       };
 
       return profile;
     } catch (error) {
       console.error('Error formatting profile data:', error);
       return {} as ProfileData; // Return empty object on formatting error
     }
   }
 
   // Helper to process an array of image objects/strings from metadata
   private processImages(images: any): string[] {
       if (!images) return [];
       const imageArray = Array.isArray(images) ? images : [images]; // Ensure it's an array
       
       return imageArray
           .map((image: any) => this.processImageObject(image)) // Get URL or placeholder
           .filter((url): url is string => !!url); // Filter out empty results
   }
 
   // Process a single image object or string URL from metadata
   private processImageObject(image: any): string | null {
     // If it's a string URL
     if (typeof image === 'string') {
       return this.formatIPFSUrl(image);
     }
     
     // If it's an object with URL (common format)
     if (image?.url && typeof image.url === 'string') {
       return this.formatIPFSUrl(image.url);
     }
     
     // If it's an NFT reference (return placeholder)
     if (image?.address) {
       console.log("NFT Image reference found, using placeholder:", image);
       return `/lukso-nft-placeholder.png`; // Placeholder for NFT images
     }
 
     console.warn("Unrecognized image format:", image);
     return null; // Return null for unrecognized formats
   }
 
   // Format IPFS URLs (unchanged, uses PRIMARY_IPFS_GATEWAY)
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
         return `${PRIMARY_IPFS_GATEWAY}${ipfsHash}`;
       }
 
       // If it looks like just a hash (basic check)
       if (/^[a-zA-Z0-9]{46}$/.test(url)) {
          console.warn("URL looks like an IPFS hash without prefix, prepending gateway:", url);
          return `${PRIMARY_IPFS_GATEWAY}${url}`;
       }
 
       console.warn("Unrecognized URL format, returning as is:", url);
       return url; // Return original URL if format is unknown
     } catch (error) {
       console.error('Error formatting IPFS URL:', error);
       return ''; // Return empty string on error
     }
   }
 
   // Get a displayable profile image URL (priority: avatar -> profileImage)
   getProfileImageUrl(profile: ProfileData | null): string {
     if (!profile) return '/default-avatar.png'; // Default if no profile
 
     // 1. Try processed avatar URL first
     if (profile.avatar && profile.avatar.length > 0) {
         const firstAvatar = profile.avatar[0];
         if (firstAvatar?.processedUrl) {
             return firstAvatar.processedUrl;
         }
         // Fallback: if original URL exists but wasn't processed (shouldn't happen often)
         if (firstAvatar?.url) {
            return this.formatIPFSUrl(firstAvatar.url); // Process it now
         }
     }
 
     // 2. Then try the first processed profileImage URL
     if (profile.profileImage && profile.profileImage.length > 0) {
       return profile.profileImage[0]; // Already processed URL
     }
     
     return '/default-avatar.png'; // Fallback to default avatar
   }
 }
 
 // Hook implementation
 const useLSP3Profile = (address: string | null) => { // Hook no longer takes provider/web3 args
   // const { web3 } = useUP(); // We don't need context web3 if manager uses public RPC
   const [profile, setProfile] = useState<ProfileData | null>(null);
   const [loading, setLoading] = useState<boolean>(false);
   const [error, setError] = useState<Error | null>(null);
   const [profileImageUrl, setProfileImageUrl] = useState<string>('');
 
   useEffect(() => {
     // Only depend on address
     if (!address) {
       // console.log('useLSP3Profile: No address provided');
       setProfile(null); // Clear profile if address is null
       setProfileImageUrl('');
       return;
     }
 
     const fetchProfile = async () => {
       setLoading(true);
       setError(null);
 
       try {
         // console.log(`useLSP3Profile: Fetching profile data for ${address}...`);
         
         // LSP3ProfileManager kullanarak profil çek
         const lsp3Manager = new LSP3ProfileManager(); // Manager no longer needs constructor args
         const profileData = await lsp3Manager.getProfileData(address); // Call method without web3
         
         if (profileData) {
           // console.log('useLSP3Profile: Profile fetched successfully:', profileData);
           setProfile(profileData);
           
           // Profil resmi URL'sini ayarla (uses the updated getProfileImageUrl)
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
   }, [address]); // Only depend on address
 
   // Helper function to shorten address (e.g., 0x1234...5678)
   const shortenAddress = (addr: string | null): string => {
     if (!addr) return '';
     return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
   };
 
   // Determine display name: Profile name or shortened address
   const displayName = profile?.name || shortenAddress(address);
 
   return { 
     profile, 
     loading, 
     error, 
     profileImageUrl, // The primary image URL for display
     shortenAddress,
     displayName // Use the calculated display name
   };
 };
 
 export default useLSP3Profile; 