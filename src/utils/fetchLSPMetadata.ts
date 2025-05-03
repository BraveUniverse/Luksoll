'use client';

import Web3 from 'web3';
import { ERC725 } from '@erc725/erc725.js';
import LSP4Schema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';

// IPFS Gateway URLs (taken from useLSP5ReceivedAssets.ts)
const IPFS_GATEWAYS = [
  'https://api.universalprofile.cloud/ipfs/',
  'https://2eff.lukso.dev/ipfs/',
  'https://ipfs.lukso.network/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

const DEFAULT_IPFS_GATEWAY = IPFS_GATEWAYS[0];

// ERC725 config (taken from useLSP5ReceivedAssets.ts)
const erc725Config = {
  ipfsGateway: DEFAULT_IPFS_GATEWAY,
};

export interface AssetMetadataResult {
  name: string;
  symbol: string;
  iconUrl?: string;
  isNFT: boolean;
}

// Helper function to format IPFS URLs (taken from useLSP5ReceivedAssets.ts)
const formatIPFSUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('ipfs://')) {
    return `${DEFAULT_IPFS_GATEWAY}${url.substring(7)}`;
  }
  // Leave as is if already http/https
  if (url.startsWith('http')) {
    return url;
  }
  // For other cases (maybe just the hash is provided?)
  return `${DEFAULT_IPFS_GATEWAY}${url}`;
};

// Interface check function (taken from useLSP5ReceivedAssets.ts)
// Requires a web3 instance to work
const checkInterface = async (assetAddress: string, interfaceIdToCheck: string, web3: Web3): Promise<boolean> => {
  try {
    // Minimal ABI for supportsInterface
    const supportsInterfaceABI = [{
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }];
    const contract = new web3.eth.Contract(supportsInterfaceABI, assetAddress);
    return await contract.methods.supportsInterface(interfaceIdToCheck).call();
  } catch (error) {
    console.warn(`Interface ${interfaceIdToCheck} check failed for ${assetAddress}:`, error);
    return false;
  }
};

/**
 * Fetches LSP4 metadata for a given token/nft address
 * (Adapted from getAssetMetadata logic in useLSP5ReceivedAssets.ts)
 */
export const fetchLSPMetadata = async (
  assetAddress: string,
  web3: Web3 | null
): Promise<AssetMetadataResult | null> => {
  if (!assetAddress || !web3) return null;

  try {
    const erc725 = new ERC725(
      LSP4Schema as any,
      assetAddress as `0x${string}`,
      web3.currentProvider, // Use web3 provider directly
      erc725Config
    );

    // console.log(`Fetching asset metadata: ${assetAddress}`);

    const [nameResult, symbolResult, metadataResult, tokenTypeResult] = await Promise.all([
      erc725.getData('LSP4TokenName'),
      erc725.getData('LSP4TokenSymbol'),
      erc725.getData('LSP4Metadata'),
      erc725.getData('LSP4TokenType')
    ]);

    let assetType: 'LSP7' | 'LSP8' | 'UNKNOWN' = 'UNKNOWN';
    let isNFT = false;

    try {
      const supportsLSP7Interface = await checkInterface(assetAddress, '0xe33f65c3', web3);
      const supportsLSP8Interface = await checkInterface(assetAddress, '0x49399145', web3);

      if (supportsLSP8Interface) {
        assetType = 'LSP8';
        isNFT = true;
      } else if (supportsLSP7Interface) {
        assetType = 'LSP7';
        isNFT = tokenTypeResult?.value === 1;
      }
    } catch (err) {
      console.warn(`Interface check failed: ${assetAddress}`, err);
    }

    if (assetType === 'UNKNOWN' && tokenTypeResult?.value !== undefined) {
      const tokenType = Number(tokenTypeResult.value);
      if (tokenType === 0) {
        assetType = 'LSP7';
        isNFT = false;
      } else if (tokenType === 1) {
        assetType = 'LSP7';
        isNFT = true;
      } else if (tokenType === 2) {
        assetType = 'LSP8';
        isNFT = true;
      }
    }

    let iconUrl = undefined; 
    let finalName = typeof nameResult?.value === 'string' ? nameResult.value : 'Unknown Asset'; 
    let finalSymbol = typeof symbolResult?.value === 'string' ? symbolResult.value : '??';

    if (metadataResult?.value) {
      try {
        const metadata: any = metadataResult.value;
        // console.log('LSP4Metadata value:', metadata);

        if (metadata && typeof metadata === 'object') {
          let potentialIcon = '';
          let potentialImage = '';

          const parseUrl = (value: any): string => {
            if (!value) return '';
            if (typeof value === 'string') return formatIPFSUrl(value);
            if (Array.isArray(value) && value.length > 0) {
              const firstItem = value[0];
              if (firstItem && typeof firstItem === 'object' && firstItem.url) {
                return formatIPFSUrl(firstItem.url);
              }
              if (typeof firstItem === 'string') {
                return formatIPFSUrl(firstItem);
              }
            }
            if (typeof value === 'object' && value.url) {
              return formatIPFSUrl(value.url);
            }
            return '';
          };

          // Search directly in metadata
          potentialIcon = parseUrl(metadata.icon);
          potentialImage = parseUrl(metadata.images);
          
          // Search in LSP4Metadata sub-object
          if (metadata.LSP4Metadata) {
            const lsp4Metadata = metadata.LSP4Metadata;
            if (!potentialIcon) potentialIcon = parseUrl(lsp4Metadata.icon);
            if (!potentialImage) potentialImage = parseUrl(lsp4Metadata.images);
          }

          // Check JSON URL content (if metadata.url exists)
          if (metadata.url && typeof metadata.url === 'string' && (!potentialIcon || !potentialImage)) {
            try {
              const formattedUrl = formatIPFSUrl(metadata.url);
              const response = await fetch(formattedUrl);
              if (response.ok) {
                const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.includes('application/json')) {
                  const json = await response.json();
                  if (json.icon && !potentialIcon) potentialIcon = parseUrl(json.icon);
                  if (json.image && !potentialImage) potentialImage = parseUrl(json.image); // image is commonly used
                  if (json.images && !potentialImage) potentialImage = parseUrl(json.images);
                  if (json.LSP4Metadata) {
                     const lsp4Metadata = json.LSP4Metadata;
                     if (!potentialIcon) potentialIcon = parseUrl(lsp4Metadata.icon);
                     if (!potentialImage) potentialImage = parseUrl(lsp4Metadata.images);
                   }
                }
              }
            } catch (e) {
              console.warn('Could not fetch metadata URL content:', e);
            }
          }
          
          // Prioritize image for NFT, otherwise icon
          iconUrl = isNFT ? (potentialImage || potentialIcon) : (potentialIcon || potentialImage);
        }
      } catch (iconErr) {
        console.warn('Could not process metadata content:', iconErr);
      }
    }

    return {
      name: finalName,
      symbol: finalSymbol,
      iconUrl: iconUrl || undefined, // Return undefined if empty string
      isNFT: isNFT,
    };

  } catch (error) {
    console.error(`Could not retrieve asset (${assetAddress}) metadata:`, error);
    return null;
  }
}; 