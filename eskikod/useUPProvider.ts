import { useState, useEffect, useCallback } from 'react';
import { createClientUPProvider } from '@lukso/up-provider';
import Web3 from 'web3';
import type { EthExecutionAPI, SupportedProviders } from 'web3';

// İstemci tarafında olup olmadığımızı kontrol et
const isClient = typeof window !== 'undefined';

// UP Provider'ı yalnızca istemci tarafında oluştur (Dokümana uygun şekilde)
const getUPProvider = () => {
  if (isClient) {
    return createClientUPProvider();
  }
  return null;
};

// Sadece bir tane provider ve web3 instance'ı oluştur
const upProvider = isClient ? getUPProvider() : null;
const web3Instance = isClient && upProvider ? new Web3(upProvider as unknown as SupportedProviders<EthExecutionAPI>) : null;

export const useUPProvider = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [contextAccount, setContextAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Provider bağlantı durumunu takip et
  const updateConnectionStatus = useCallback((_accounts: string[], _contextAccounts: string[]) => {
    const hasAccounts = _accounts && _accounts.length > 0;
    const hasContextAccounts = _contextAccounts && _contextAccounts.length > 0;
    
    setIsConnected(hasAccounts);
    
    if (hasAccounts) {
      setAccount(_accounts[0]);
    } else {
      setAccount(null);
    }
    
    // contextAccount'ı sadece _contextAccounts varsa güncelle,
    // account değerini contextAccount'a kopyalama
    if (hasContextAccounts) {
      setContextAccount(_contextAccounts[0]);
    } else {
      // Eğer contextAccount yoksa null olarak bırak,
      // account değerini kopyalama
      setContextAccount(null);
    }
  }, []);

  // Provider'ı başlat
  useEffect(() => {
    if (!isClient || !upProvider) {
      return;
    }
    
    // Direkt bağlantı denemesi yapalım
    const connect = async () => {
      try {
        if (upProvider) {
          // eth_requestAccounts ile bağlantı kuruyoruz (cüzdanı açar)
          await upProvider.request({ method: 'eth_requestAccounts' });
          
          // Bağlantı kurulduktan sonra context hesaplarını alalım
          const contextAccounts = await upProvider.request({ method: 'up_contextAccounts' });
          
          // Sadece contextAccounts varsa güncelle
          if (contextAccounts && Array.isArray(contextAccounts) && contextAccounts.length > 0) {
            setContextAccount(contextAccounts[0]);
          }
        }
      } catch (error) {
        // Hata durumunda sessizce geç
      }
    };
    
    const init = async () => {
      try {
        // Mevcut hesapları al
        const accounts = await web3Instance?.eth.getAccounts();
        const contextAccounts = await (upProvider as any).request({ method: 'up_contextAccounts' });
        
        // Bağlantı durumunu güncelle
        if (accounts && accounts.length > 0) {
          // Account bilgisini güncelle
          setAccount(accounts[0]);
          setIsConnected(true);
          setChainId(chainId ? Number(chainId) : null);
          
          // Context hesabını ayrı işle (account'tan bağımsız olarak)
          if (contextAccounts && Array.isArray(contextAccounts) && contextAccounts.length > 0) {
            setContextAccount(contextAccounts[0]);
          }
        } else {
          // Hesaplar yoksa bağlantıyı denemek için connect fonksiyonunu çağıralım
          await connect();
        }
      } catch (error: any) {
        // Hata durumunda da bağlanmayı deneyelim
        await connect();
      }
    };
    
    init();
    
    // Event listener'ları ekle
    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts.length > 0 ? accounts[0] : null);
      setIsConnected(accounts.length > 0);
    };
    
    const handleContextAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setContextAccount(accounts[0]);
      }
    };
    
    const handleChainChanged = (chainId: number) => {
      setChainId(chainId);
    };
    
    const handleDisconnect = (error: any) => {
      setIsConnected(false);
      setProviderError(error?.message || 'Bağlantı kesildi');
    };
    
    if (upProvider) {
      // Hesap değişikliklerini dinle
      upProvider.on('accountsChanged', handleAccountsChanged);
      
      // Context hesap değişikliklerini dinle
      upProvider.on('contextAccountsChanged', handleContextAccountsChanged);
      
      // Chain değişikliklerini dinle
      upProvider.on('chainChanged', handleChainChanged);
    }
    
    // Cleanup
    return () => {
      if (upProvider) {
        upProvider.removeListener('accountsChanged', handleAccountsChanged);
        upProvider.removeListener('contextAccountsChanged', handleContextAccountsChanged);
        upProvider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateConnectionStatus]);

  // Bağlantıyı yenile
  const refreshConnection = useCallback(async () => {
    if (!isClient || !upProvider) {
      return false;
    }
    
    try {
      // Mevcut hesapları al
      const accounts = await web3Instance?.eth.getAccounts();
      
      // Context hesaplarını LUKSO dökümanına göre doğru metodla al
      const contextAccounts = await (upProvider as any).request({ method: 'up_contextAccounts' });
      
      // Bağlantı durumunu güncelle
      if (accounts && accounts.length > 0) {
        // Account bilgisini güncelle
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Context hesabını ayrı işle (account'tan bağımsız olarak)
        if (contextAccounts && Array.isArray(contextAccounts) && contextAccounts.length > 0) {
          setContextAccount(contextAccounts[0]);
        }
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      return false;
    }
  }, []);

  return {
    isConnected,
    account,
    contextAccount,
    chainId,
    providerError,
    refreshConnection,
    web3: web3Instance,
    provider: upProvider
  };
};