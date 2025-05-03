const CACHE_PREFIX = 'luksopoll_cache_';
const CACHE_VERSION = 'v1'; // Increment if cache structure changes
const METADATA_CACHE_KEY = `${CACHE_PREFIX}metadata_${CACHE_VERSION}`;
const PROFILE_CACHE_KEY = `${CACHE_PREFIX}profile_${CACHE_VERSION}`;
const POLL_STATIC_DETAILS_CACHE_KEY = `${CACHE_PREFIX}poll_static_${CACHE_VERSION}`;
const POLL_OPTIONS_CACHE_KEY = `${CACHE_PREFIX}poll_options_${CACHE_VERSION}`;

// General function to get cache
function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null; // window is not available during SSR/Build
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error reading cache key ${key} from localStorage:`, error);
    return null;
  }
}

// General function to set cache
function setCache<T>(key: string, value: T): void {
   if (typeof window === 'undefined') return; 
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error setting cache key ${key} in localStorage:`, error);
    // Error handling could be added here (e.g., clearing cache)
  }
}

// Metadata Cache (Asset Address -> Metadata)
type MetadataCache = Record<string, any>; 

export const getCachedMetadataAll = (): MetadataCache => {
  return getCache<MetadataCache>(METADATA_CACHE_KEY) || {};
};

export const setCachedMetadataAll = (allMetadata: MetadataCache): void => {
  setCache(METADATA_CACHE_KEY, allMetadata);
};

export const getCachedMetadata = (address: string): any | null => {
    return getCachedMetadataAll()[address.toLowerCase()] || null;
}

export const setCachedMetadata = (address: string, metadata: any): void => {
    const allMetadata = getCachedMetadataAll();
    allMetadata[address.toLowerCase()] = metadata;
    setCachedMetadataAll(allMetadata);
}

// Profile Cache (Creator Address -> Profile)
type ProfileCache = Record<string, any>; 

export const getCachedProfileAll = (): ProfileCache => {
  return getCache<ProfileCache>(PROFILE_CACHE_KEY) || {};
};

export const setCachedProfileAll = (allProfiles: ProfileCache): void => {
  setCache(PROFILE_CACHE_KEY, allProfiles);
};

export const getCachedProfile = (address: string): any | null => {
    return getCachedProfileAll()[address.toLowerCase()] || null;
}

export const setCachedProfile = (address: string, profile: any): void => {
    const allProfiles = getCachedProfileAll();
    allProfiles[address.toLowerCase()] = profile;
    setCachedProfileAll(allProfiles);
}

// Poll Static Details Cache (Poll ID -> Static Data)

type PollStaticDetailsCache = Record<number, any>; 

export const getCachedPollStaticDetailsAll = (): PollStaticDetailsCache => {
    return getCache<PollStaticDetailsCache>(POLL_STATIC_DETAILS_CACHE_KEY) || {};
}

export const setCachedPollStaticDetailsAll = (allDetails: PollStaticDetailsCache): void => {
    setCache(POLL_STATIC_DETAILS_CACHE_KEY, allDetails);
}

export const getCachedPollStaticDetails = (pollId: number): any | null => {
    return getCachedPollStaticDetailsAll()[pollId] || null;
}

export const setCachedPollStaticDetails = (pollId: number, details: any): void => {
    const allDetails = getCachedPollStaticDetailsAll();
    allDetails[pollId] = details; 
    setCachedPollStaticDetailsAll(allDetails);
}

// Poll Options Cache (Poll ID -> string[])
type PollOptionsCache = Record<number, string[]>; 

export const getCachedPollOptionsAll = (): PollOptionsCache => {
    return getCache<PollOptionsCache>(POLL_OPTIONS_CACHE_KEY) || {};
}

export const setCachedPollOptionsAll = (allOptions: PollOptionsCache): void => {
    setCache(POLL_OPTIONS_CACHE_KEY, allOptions);
}

export const getCachedPollOptions = (pollId: number): string[] | null => {
    return getCachedPollOptionsAll()[pollId] || null;
}

export const setCachedPollOptions = (pollId: number, options: string[]): void => {
    const allOptions = getCachedPollOptionsAll();
    allOptions[pollId] = options;
    setCachedPollOptionsAll(allOptions);
}

// Optional function to clear all cache
export const clearAllCache = (): void => {
   if (typeof window === 'undefined') return; 
   try {
       localStorage.removeItem(METADATA_CACHE_KEY);
       localStorage.removeItem(PROFILE_CACHE_KEY);
       localStorage.removeItem(POLL_STATIC_DETAILS_CACHE_KEY);
       localStorage.removeItem(POLL_OPTIONS_CACHE_KEY);
       console.log('Luksopoll cache cleared.'); // Keep log message in English
   } catch (error) {
       console.error('Error clearing cache:', error);
   }
} 