import { useState, useEffect } from 'react';
import { useUPProvider } from './useUPProvider';
import ERC725js from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// IPFS Gateway'i
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';

interface LSP3ProfileData {
  name?: string;
  description?: string;
  profileImage?: {
    url?: string;
    width?: number;
    height?: number;
    verification?: {
      method?: string;
      data?: string;
    };
    address?: string;
    tokenId?: string;
  }[];
  tags?: string[];
  links?: {
    title: string;
    url: string;
  }[];
}

export const useLSP3Profile = (address: string | null) => {
  const [profileData, setProfileData] = useState<LSP3ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { web3 } = useUPProvider();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!address || !web3) return;

      setLoading(true);
      setError(null);

      try {
        // ERC725 instance oluştur
        const config = {
          ipfsGateway: IPFS_GATEWAY
        };
        
        const erc725 = new ERC725js(
          LSP3ProfileSchema,
          address,
          web3.currentProvider,
          config
        );
        
        // Profil verilerini çek
        const profileData = await erc725.getData('LSP3Profile');
        
        if (profileData && profileData.value) {
          try {
            // ERC725.js'den gelen veri yapısı:
            // value: { url: "ipfs://...", verification: {...} }
            const profileValue = profileData.value as any;
            
            if (profileValue.url) {
              // IPFS URL'sini düzelt
              let jsonUrl = profileValue.url;
              if (jsonUrl.startsWith('ipfs://')) {
                jsonUrl = `${IPFS_GATEWAY}${jsonUrl.slice(7)}`;
              }
              
              // JSON içeriğini çek
              const response = await fetch(jsonUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                },
                mode: 'cors',
                cache: 'no-cache'
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              
              const responseText = await response.text();
              
              const metadata = JSON.parse(responseText);
              
              if (metadata.LSP3Profile) {
                // Profil resimlerini işle
                const processedProfileImages = metadata.LSP3Profile.profileImage?.map((img: any) => {
                  // Kopya oluştur
                  const processedImg = { ...img };
                  
                  // IPFS URL'lerini düzelt
                  if (processedImg.url && processedImg.url.startsWith('ipfs://')) {
                    processedImg.url = `${IPFS_GATEWAY}${processedImg.url.slice(7)}`;
                  }
                  
                  return processedImg;
                }) || [];
                
                // Profil verilerini ayarla
                setProfileData({
                  name: metadata.LSP3Profile.name,
                  description: metadata.LSP3Profile.description,
                  profileImage: processedProfileImages,
                  tags: metadata.LSP3Profile.tags,
                  links: metadata.LSP3Profile.links
                });
              } else {
                setFallbackProfile(address);
              }
            } else {
              setFallbackProfile(address);
            }
          } catch (fetchError: any) {
            setError(`Metadata getirme hatası: ${fetchError.message}`);
            setFallbackProfile(address);
          }
        } else {
          setFallbackProfile(address);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile data');
        setFallbackProfile(address);
      } finally {
        setLoading(false);
      }
    };
    
    // Fallback profil verisi ayarla
    const setFallbackProfile = (addr: string) => {
      setProfileData({
        name: addr.slice(0, 6) + '...' + addr.slice(-4),
        description: 'LUKSO Profile',
        profileImage: []
      });
    };

    fetchProfileData();
  }, [address, web3]);

  return { profileData, loading, error };
}; 