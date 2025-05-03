'use client';

import { useState, useEffect } from 'react';
import { UPClientProvider } from '@lukso/up-provider';
import { ERC725 } from '@erc725/erc725.js';
import LSP5Schema from '@erc725/erc725.js/schemas/LSP5ReceivedAssets.json';
import LSP4Schema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import LSP3Schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';

// IPFS Gateway URLs
const IPFS_GATEWAYS = [
  'https://api.universalprofile.cloud/ipfs/',
  'https://2eff.lukso.dev/ipfs/',
  'https://ipfs.lukso.network/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

interface AssetMetadata {
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  address: string;
  interfaceId: string;
  type: 'LSP7' | 'LSP8' | 'UNKNOWN';
  balance?: string;
  isNFT: boolean;
}

/**
 * Manages LSP5 Received Assets - Reads received assets
 */
class LSP5ReceivedAssetsManager {
  private provider: UPClientProvider | null;
  private erc725Config: any;

  constructor(provider: UPClientProvider | null) {
    this.provider = provider;
    this.erc725Config = {
      ipfsGateway: IPFS_GATEWAYS[0]
    };
  }

  /**
   * Fetches the LSP5ReceivedAssets for a given address
   */
  async getReceivedAssets(address: string): Promise<AssetMetadata[]> {
    if (!address || !this.provider) {
      console.warn('LSP5ReceivedAssetsManager: No address or provider available');
      return [];
    }

    try {
      // ERC725 instance oluştur
      const erc725 = new ERC725(
        LSP5Schema as any,
        address as `0x${string}`,
        this.provider,
        this.erc725Config
      );

      // console.log('Fetching LSP5ReceivedAssets data...');
      
      // LSP5ReceivedAssets[] array'ini oku
      const receivedAssetsResult = await erc725.getData('LSP5ReceivedAssets[]');
      
      if (!receivedAssetsResult?.value || !Array.isArray(receivedAssetsResult.value)) {
        // console.log('No received assets found or not an array');
        return [];
      }
      
      const receivedAssetAddresses = receivedAssetsResult.value as string[];
      // console.log(`${receivedAssetAddresses.length} assets found`);
      
      // Her bir asset için metadata topla
      const assetsPromises = receivedAssetAddresses.map(assetAddress => 
        this.getAssetMetadata(assetAddress)
      );
      
      // Tüm promise'ları çözümle ve null olmayanları filtrele
      const assets = await Promise.all(assetsPromises);
      const validAssets = assets.filter(Boolean) as AssetMetadata[];
      
      return validAssets;
    } catch (error) {
      console.error('Could not retrieve LSP5ReceivedAssets data:', error);
      return [];
    }
  }

  /**
   * Fetches metadata for a given token/nft address
   */
  private async getAssetMetadata(assetAddress: string): Promise<AssetMetadata | null> {
    if (!assetAddress || !this.provider) return null;

    try {
      // ERC725 instance oluştur
      const erc725 = new ERC725(
        LSP4Schema as any,
        assetAddress as `0x${string}`,
        this.provider,
        this.erc725Config
      );

      // console.log(`Fetching asset metadata: ${assetAddress}`);
      
      // Token metadata'sını oku
      const [nameResult, symbolResult, metadataResult, tokenTypeResult] = await Promise.all([
        erc725.getData('LSP4TokenName'),
        erc725.getData('LSP4TokenSymbol'),
        erc725.getData('LSP4Metadata'),  // LSP4TokenIcon yerine LSP4Metadata kullanıyoruz
        erc725.getData('LSP4TokenType')  // Token tipini de alalım
      ]);
      
      // console.log(`Metadata results:`, { nameResult, symbolResult, metadataResult, tokenTypeResult });
      
      // Interface ID'yi belirle
      let interfaceId = '0x00000000';
      let assetType: 'LSP7' | 'LSP8' | 'UNKNOWN' = 'UNKNOWN';
      let isNFT = false;
      
      // Önce ERC165 supportsInterface ile kontrol et
      try {
        // ERC165 supportsInterface ile interface ID'yi kontrol et
        // LUKSO dokümanındaki belirtilen interface ID'leri kullan
        const supportsLSP7Interface = await this.checkInterface(assetAddress, '0xe33f65c3');
        const supportsLSP8Interface = await this.checkInterface(assetAddress, '0x49399145');
        
        // console.log(`Interface checks: LSP7=${supportsLSP7Interface}, LSP8=${supportsLSP8Interface}`);
        
        if (supportsLSP8Interface) {
          interfaceId = '0x49399145';
          assetType = 'LSP8';
          isNFT = true;
        } else if (supportsLSP7Interface) {
          interfaceId = '0xe33f65c3';
          assetType = 'LSP7';
          // LSP7 için token tipine bak
          isNFT = tokenTypeResult?.value === 1; // TokenType 1 ise NFT
        }
      } catch (err) {
        console.warn(`Interface check failed: ${assetAddress}`, err);
      }
      
      // Eğer interface kontrolü başarısız olduysa ya da tanımlanamadıysa, LSP4TokenType'a bak
      if (assetType === 'UNKNOWN' && tokenTypeResult?.value !== undefined) {
        // TokenType değerine göre belirle
        // 0 = Token (LSP7)
        // 1 = NFT (LSP7 NFT)
        // 2 = Collection (LSP8 Collection)
        const tokenType = Number(tokenTypeResult.value);
        // console.log(`LSP4TokenType value: ${tokenType}`);
        
        if (tokenType === 0) {
          assetType = 'LSP7';
          isNFT = false;
          interfaceId = '0xe33f65c3'; // LSP7 interface ID
        } else if (tokenType === 1) {
          assetType = 'LSP7';
          isNFT = true;
          interfaceId = '0xe33f65c3'; // LSP7 interface ID (NFT olarak)
        } else if (tokenType === 2) {
          assetType = 'LSP8';
          isNFT = true;
          interfaceId = '0x49399145'; // LSP8 interface ID
        }
      }
      
      // İşlemlere devam et ve assetType'ı döndür
      // console.log(`Asset type determined: ${assetType}, NFT: ${isNFT}`);
      
      // Icon URL'sini düzenle
      let iconUrl = '';
      if (metadataResult?.value) {
        try {
          // LSP4Metadata içinde icon veya image bilgisi olabilir
          const metadata: any = metadataResult.value;
          // console.log('LSP4Metadata value:', metadata);
          
          if (metadata && typeof metadata === 'object') {
            let potentialIcon = '';
            let potentialImage = '';

            // Metadata'nın kendisinde icon/image bilgisi
            if (metadata.icon) {
              potentialIcon = this.formatIPFSUrl(metadata.icon);
            }
            if (metadata.images && Array.isArray(metadata.images) && metadata.images.length > 0) {
              const firstImage = metadata.images[0];
              if (firstImage && typeof firstImage === 'object' && firstImage.url) {
                potentialImage = this.formatIPFSUrl(firstImage.url);
              } else if (typeof firstImage === 'string') {
                potentialImage = this.formatIPFSUrl(firstImage);
              }
            }
            
            // LSP4Metadata alt özelliği içinde olabilir
            if (metadata.LSP4Metadata) {
              const lsp4Metadata = metadata.LSP4Metadata;
              if (lsp4Metadata.icon && !potentialIcon) { // Sadece henüz bulunmadıysa ata
                potentialIcon = this.formatIPFSUrl(lsp4Metadata.icon);
              }
              if (lsp4Metadata.images && Array.isArray(lsp4Metadata.images) && lsp4Metadata.images.length > 0 && !potentialImage) {
                const firstImage = lsp4Metadata.images[0];
                if (firstImage && typeof firstImage === 'object' && firstImage.url) {
                  potentialImage = this.formatIPFSUrl(firstImage.url);
                } else if (typeof firstImage === 'string') {
                  potentialImage = this.formatIPFSUrl(firstImage);
                }
              }
            }
            
            // JSON yapısını kontrol et - bazen Verifiable URI olabilir
            if (metadata.url && typeof metadata.url === 'string' && (!potentialIcon || !potentialImage)) {
              try {
                const formattedUrl = this.formatIPFSUrl(metadata.url);
                // console.log(`Fetching URL content: ${formattedUrl}`);
                
                const response = await fetch(formattedUrl);
                if (response.ok) {
                  const contentType = response.headers.get('Content-Type');
                  if (contentType && contentType.includes('application/json')) {
                    const json = await response.json();
                    // console.log('Fetched JSON content:', json);
                    
                    // JSON içinden icon/image bulmayı dene (henüz bulunmadıysa)
                    if (json.icon && !potentialIcon) {
                      potentialIcon = this.formatIPFSUrl(json.icon);
                    }
                    if (json.images && Array.isArray(json.images) && json.images.length > 0 && !potentialImage) {
                      const firstImage = json.images[0];
                      if (firstImage) {
                        potentialImage = this.formatIPFSUrl(firstImage.url || firstImage);
                      }
                    }
                    if (json.LSP4Metadata && (!potentialIcon || !potentialImage)) {
                      const lsp4Metadata = json.LSP4Metadata;
                      if (lsp4Metadata.icon && !potentialIcon) {
                        potentialIcon = this.formatIPFSUrl(lsp4Metadata.icon);
                      }
                      if (lsp4Metadata.images && Array.isArray(lsp4Metadata.images) && lsp4Metadata.images.length > 0 && !potentialImage) {
                         const firstImage = lsp4Metadata.images[0];
                         if (firstImage) {
                           potentialImage = this.formatIPFSUrl(firstImage.url || firstImage);
                         }
                      }
                    }
                  } else {
                     console.warn(`Content type JSON değil: ${contentType}`);
                  }
                } else {
                  console.warn(`HTTP error! status: ${response.status}`);
                }
              } catch (e) {
                console.warn('Metadata URL içeriği alınamadı:', e);
              }
            }

            // Asset tipine göre ata:
            // NFT ise öncelik resim, değilse ikon.
            if (isNFT) {
              iconUrl = potentialImage || potentialIcon; // NFT için önce image, yoksa icon
            } else {
              iconUrl = potentialIcon || potentialImage; // Token için önce icon, yoksa image
            }

          }
        } catch (iconErr) {
          console.warn('Icon/Image verisi işlenemedi:', iconErr);
        }
      }
      
      // Token balance'ı oku (token ise)
      let balance = undefined;
      if (assetType === 'LSP7' && this.provider) {
        try {
          // Bağlı olan cüzdan adresini al
          const accounts = await this.provider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const userAddress = accounts[0];
            
            // LSP7 standardına göre balanceOf fonksiyonunu çağır
            try {
              // balanceOf fonksiyon imzası: 0x70a08231
              // adres padleme: adres 32 byte'a tamamlanmalı
              const callData = {
                to: assetAddress,
                data: '0x70a08231000000000000000000000000' + userAddress.substring(2)
              };
              
              const balanceResult = await this.provider.request({
                method: 'eth_call',
                params: [callData, 'latest']
              });
              
              if (balanceResult) {
                // Dönen sonucun string olup olmadığını kontrol et
                let balanceHex = '';
                if (typeof balanceResult === 'string') {
                  balanceHex = balanceResult;
                } else if (typeof balanceResult === 'object' && balanceResult !== null && 'result' in balanceResult && typeof balanceResult.result === 'string') {
                  // Use 'result' string if it's an object containing it
                  balanceHex = balanceResult.result;
                }

                // Convert to BigInt if a valid hex string was obtained
                if (balanceHex && balanceHex.startsWith('0x')) {
                  try {
                    balance = BigInt(balanceHex).toString();
                  } catch (bigIntError) {
                    console.warn(`BigInt conversion error: ${balanceHex}`, bigIntError);
                    balance = undefined; // Leave undefined on error
                  }
                } else {
                  console.warn(`Invalid balanceOf result received: ${balanceResult}`);
                  balance = undefined;
                }
              }
            } catch (callError) {
              console.warn('balanceOf call failed:', callError);
            }
          }
        } catch (balanceErr) {
          console.warn('Could not read token balance:', balanceErr);
        }
      }
      
      return {
        name: nameResult?.value?.toString() || 'Unknown Token', 
        symbol: symbolResult?.value?.toString() || '???',
        iconUrl,
        address: assetAddress,
        interfaceId,
        type: assetType,
        balance,
        isNFT
      };
    } catch (error) {
      console.error(`Could not retrieve asset metadata: ${assetAddress}`, error);
      return null;
    }
  }
  
  /**
   * Formats IPFS URLs
   */
  private formatIPFSUrl(url: any): string {
    try {
      let targetUrl = url;
      
      // Return empty string if URL is null or undefined
      if (!targetUrl) return '';
      
      // Try to get the first element if it's an array
      if (Array.isArray(targetUrl)) {
        if (targetUrl.length > 0) {
          targetUrl = targetUrl[0];
        } else {
          return ''; // Return empty if array is empty
        }
      }
      
      // Use url.url if targetUrl is not a string but has a url property
      if (typeof targetUrl !== 'string' && targetUrl && targetUrl.url) {
        targetUrl = targetUrl.url;
      }
      
      // Return empty if it's still not a string after checks
      if (typeof targetUrl !== 'string') {
        console.warn('URL is not a string (final check):', targetUrl, 'Original:', url);
        return '';
      }
      
      // Leave HTTP(S) or data URIs as is
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('data:')) {
        return targetUrl;
      }
      
      // Format IPFS URLs
      if (targetUrl.startsWith('ipfs://')) {
        const ipfsHash = targetUrl.replace('ipfs://', '');
        return `${IPFS_GATEWAYS[0]}${ipfsHash}`;
      }
      
      return targetUrl; // Return as is for unknown formats
    } catch (error) {
      console.warn('Error formatting URL:', url, error);
      return '';
    }
  }
  
  /**
   * Checks interface using ERC165 supportsInterface
   */
  private async checkInterface(assetAddress: string, interfaceId: string): Promise<boolean> {
    try {
      if (!this.provider) return false;
      
      // Prepare supportsInterface function signature manually
      // bytes4(keccak256('supportsInterface(bytes4)')) = 0x01ffc9a7
      // Pad interfaceId to 32 bytes
      const functionSignature = '0x01ffc9a7';
      
      // Pad interfaceId to 32 bytes
      const paddedInterfaceId = interfaceId.padEnd(66, '0').substring(0, 66);
      
      // Data format: function signature + parameters
      const data = functionSignature + paddedInterfaceId.substring(2);
      
      // Make RPC call
      const result = await this.provider.request({
        method: 'eth_call',
        params: [
          {
            to: assetAddress,
            data: data
          },
          'latest'
        ]
      });
      
      // Check boolean result (0x01 = true, 0x00 = false)
      return result === '0x0000000000000000000000000000000000000000000000000000000000000001';
    } catch (err) {
      console.warn(`supportsInterface check failed: ${assetAddress} - ${interfaceId}`, err);
      return false;
    }
  }
}

/**
 * LSP5 Received Assets Hook
 * React hook to fetch tokens and NFTs owned by a user
 */
const useLSP5ReceivedAssets = (address: string | null | undefined, provider: UPClientProvider | null) => {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address || !provider) {
      // console.log('useLSP5ReceivedAssets: No address or provider');
      return;
    }

    const fetchAssets = async () => {
      setLoading(true);
      setError(null);

      try {
        // console.log(`useLSP5ReceivedAssets: Fetching asset data for ${address}...`);
        
        // Fetch assets using LSP5ReceivedAssetsManager
        const manager = new LSP5ReceivedAssetsManager(provider);
        const assetList = await manager.getReceivedAssets(address);
        
        // console.log('useLSP5ReceivedAssets: Assets fetched successfully:', assetList);
        setAssets(assetList);
      } catch (e) {
        console.error('useLSP5ReceivedAssets: Error occurred:', e);
        setError(e instanceof Error ? e : new Error('An error occurred while loading asset data'));
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [address, provider]);

  return { assets, loading, error };
};

export default useLSP5ReceivedAssets; 