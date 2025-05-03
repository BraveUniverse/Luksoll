const DEFAULT_IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';

/**
 * Formats IPFS URLs to be accessible via an HTTP gateway.
 * Handles ipfs://, http://, https://, and data: prefixes.
 * @param url The URL string to format.
 * @returns The formatted URL string, or an empty string if input is invalid.
 */
export const formatIPFSUrl = (url: any): string => {
  try {
    let targetUrl = url;

    // Handle potential arrays or objects containing the URL
    if (!targetUrl) return '';
    if (Array.isArray(targetUrl)) {
      if (targetUrl.length > 0) targetUrl = targetUrl[0]; else return '';
    }
    if (typeof targetUrl !== 'string' && targetUrl && targetUrl.url && typeof targetUrl.url === 'string') {
      targetUrl = targetUrl.url;
    }
    if (typeof targetUrl !== 'string') {
      console.warn('Provided value is not a string or does not contain a valid URL:', url);
      return '';
    }

    // Leave HTTP(S) or data URIs as is
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('data:')) {
      return targetUrl;
    }

    // Format IPFS URLs
    if (targetUrl.startsWith('ipfs://')) {
      const ipfsHash = targetUrl.replace('ipfs://', '');
      // Basic check for valid IPFS hash (CIDv0 or CIDv1)
      if (ipfsHash.match(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/) || ipfsHash.match(/^b[a-zA-Z0-9]{58}$/)){
          return `${DEFAULT_IPFS_GATEWAY}${ipfsHash}`;
      } else {
          console.warn('Invalid IPFS hash detected:', ipfsHash);
          return ''; // Return empty for invalid hash
      }
    }

    // If it doesn't start with known protocols, assume it might be just the hash
    // Add a basic check for potential hash format before prepending gateway
    if (targetUrl.match(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/) || targetUrl.match(/^b[a-zA-Z0-9]{58}$/)) {
        return `${DEFAULT_IPFS_GATEWAY}${targetUrl}`;
    }

    // Return the original targetUrl if it doesn't match known patterns but is a string
    // This might be a relative path or another type of URL we don't handle.
    // console.warn('Unknown URL format, returning as is:', targetUrl);
    return targetUrl; 

  } catch (error) {
    console.warn('Error formatting URL:', url, error);
    return '';
  }
}; 