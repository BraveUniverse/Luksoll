# LUKSO Poll Uygulaması Arayüz ve Kontrat Entegrasyonu

## Genel Bakış

Bu döküman, LUKSO blockchain üzerinde çalışan anket/oylama uygulamasının kullanıcı arayüzü ile akıllı kontrat arasındaki entegrasyonu detaylandırmaktadır. Uygulama, Next.js tabanlı bir SPA (Single Page Application) olarak çalışacak ve mevcut tasarım korunacaktır.

## Ana Ekranlar ve Kontrat Entegrasyonları

### 1. Ana Sayfa / Karşılama Ekranı

**Kullanıcı Durumu:**
- Bağlı değilse: Universal Profile bağlantısı için karşılama ekranı
- Bağlıysa: Ana menü ve özet istatistikler

**Kullanılan Kontrat Fonksiyonları:**
- `getUserPoints(address)`: Kullanıcının toplam puanını göstermek için
- `getUserVotedPollIds(address)`: Kullanıcının kaç ankete katıldığını göstermek için

### 2. Anket Oluşturma Ekranı

**Kullanılan Kontrat Fonksiyonları:**
- `createPoll(...)`: LYX ile anket oluşturmak için
- `createPollWithToken(...)`: LSP7 token ile anket oluşturmak için
- `getAllSupportedTokens()`: Desteklenen tokenleri listelemek için
- `getTokenDetails(address)`: Seçilen tokenin detaylarını göstermek için

**Kullanıcı Arayüzü Özellikleri:**
- Anket sorusu ve açıklaması giriş alanları
- Seçenekler için dinamik giriş alanları (ekle/çıkar butonu ile)
- Anket süresi seçici (saat cinsinden)
- Hedef katılımcı sayısı giriş alanı
- Ödül tipi seçici (ödülsüz, LYX ödüllü, token ödüllü)
- Katılım şartları seçici:
  - Herkes (NONE)
  - Sadece takipçiler (FOLLOWERS_ONLY)
  - LSP7 token sahipleri (LSP7_HOLDER)
  - LSP8 NFT sahipleri (LSP8_HOLDER)
  - Takipçi VE token sahipleri (FOLLOWERS_AND_LSP7_HOLDER)
  - Takipçi VE NFT sahipleri (FOLLOWERS_AND_LSP8_HOLDER)
- Gerekli token veya NFT adresi giriş alanı (ilgili şartlar seçildiğinde)
- Gerekli minimum token miktarı giriş alanı (LSP7 için)

### 3. Anketler Listesi Ekranı

**Kullanılan Kontrat Fonksiyonları:**
- `pollCount`: Toplam anket sayısını öğrenmek için
- `getPollDetails(pollId)`: Anketlerin temel bilgilerini listelemek için
- `getPollStatus(pollId)`: Anketlerin durumunu (aktif/sona ermiş) göstermek için
- `hasVoted(pollId, address)`: Kullanıcının oy verip vermediğini kontrol etmek için
- `hasClaimedReward(pollId, address)`: Kullanıcının ödül alıp almadığını kontrol etmek için

**Kullanıcı Arayüzü Özellikleri:**
- Aktif anketler sekmesi
- Sona ermiş anketler sekmesi
- Katıldığım anketler sekmesi (kullanıcının oy verdiği anketler)
- Oluşturduğum anketler sekmesi
- Her anket için:
  - Anket başlığı
  - Kalan süre veya bitiş tarihi
  - Toplam oy sayısı
  - Ödül bilgisi (varsa)
  - Durumu (aktif/pasif/hedef tamamlandı)

### 4. Anket Detay Ekranı

**Kullanılan Kontrat Fonksiyonları:**
- `getPollDetails(pollId)`: Anketin tüm detaylarını göstermek için
- `getPollOptions(pollId)`: Anket seçeneklerini listelemek için
- `getPollVotes(pollId, optionId)`: Her seçeneğin aldığı oy sayısını göstermek için
- `vote(pollId, optionId)`: Kullanıcının oy vermesi için
- `claimReward(pollId)`: Kullanıcının ödül talep etmesi için
- `getVoters(pollId)`: Tüm oy verenleri listelemek için
- `getVotersByOption(pollId, optionId)`: Belirli bir seçeneğe oy verenleri görmek için
- `votedOption(pollId, address)`: Kullanıcının verdiği oyun seçeneğini göstermek için

**Yaratıcı için Ek Fonksiyonlar:**
- `closePoll(pollId)`: Anketi kapatmak için
- `extendPollDuration(pollId, additionalHours)`: Anket süresini uzatmak için
- `pausePoll(pollId)`: Anketi duraklatmak için
- `resumePoll(pollId)`: Duraklatılmış anketi devam ettirmek için
- `withdrawRemainingFunds(pollId)`: Kalan ödül fonlarını geri çekmek için (hedef tamamlanmadıysa)

**Kullanıcı Arayüzü Özellikleri:**
- Anket başlığı ve açıklaması
- Oylama alanı (seçenekler ve oy verme butonu)
- Sonuç grafiği (şeçeneklere verilen oyların dağılımı)
- Kalan süre veya bitiş tarihi göstergesi
- Katılım şartları bilgisi
- Ödül bilgisi ve talep et butonu (eğer hak kazanıldıysa)
- Anket yaratıcısı bilgisi ve profil linki
- Takip et butonu (anketi oluşturan kişiyi takip etmek için)
- Oy verenler listesi (seçeneklere göre filtrelenebilir)
- Anket yönetimi sekmesi (sadece yaratıcı için):
  - Anketi kapat/duraklat/devam ettir butonları
  - Süre uzatma alanı
  - Kalan fonları çek butonu

### 5. Profil Ekranı

**Kullanılan Kontrat Fonksiyonları:**
- `getUserPoints(address)`: Kullanıcı puanını göstermek için
- `getUserVotingHistory(address)`: Kullanıcının geçmiş oylarını göstermek için
- `getUserVotedPollIds(address)`: Kullanıcının katıldığı anketleri listelemek için

**Kullanıcı Arayüzü Özellikleri:**
- Universal Profile bilgileri (isim, açıklama, profil resmi)
- Kullanıcı puanı ve sıralama bilgisi
- Oluşturulan anket sayısı ve listesi
- Katılınan anket sayısı ve listesi
- Kazanılan ödüller geçmişi

### 6. Admin Panel (Sadece Kontrat Sahibi İçin)

**Kullanılan Kontrat Fonksiyonları:**
- `addSupportedToken(address)`: Yeni desteklenen token eklemek için
- `removeSupportedToken(address)`: Desteklenen bir tokeni kaldırmak için
- `setCommissionRate(newRate)`: Komisyon oranını güncellemek için
- `setPollCreationFee(newFee)`: Anket oluşturma ücretini güncellemek için 
- `setCombinedRequirementFee(newFee)`: Kombine gereksinim ücretini güncellemek için
- `withdrawCommission()`: Biriken LYX komisyonlarını çekmek için
- `withdrawTokenCommission(tokenAddress)`: Biriken token komisyonlarını çekmek için
- `cleanupOldPolls(olderThanDays)`: Eski anket verilerini temizlemek için
- `getTotalLYXCommission()`: Toplam biriken LYX komisyonunu görmek için
- `getEarnedCommissionTokens()`: Komisyon kazanılan tokenleri listelemek için
- `getTokenCommissionEarned(tokenAddress)`: Belirli bir tokenden kazanılan komisyonları görmek için

### 7. Sıralama Ekranı

**Kullanılan Kontrat Fonksiyonları:**
- `getAllRankedUsers()`: Tüm sıralanmış kullanıcıları listelemek için 
- `getUserPoints(address)`: Her kullanıcının puanını görmek için

**Kullanıcı Arayüzü Özellikleri:**
- Puana göre sıralanmış kullanıcı listesi
- Her kullanıcı için:
  - Profil resmi ve isim
  - Toplam puan
  - Oluşturulan anket sayısı
  - Katılınan anket sayısı

## Mobil Uyumluluk ve Duyarlı Tasarım

Uygulama, responsive tasarım prensipleriyle geliştirilecek ve şu ekran boyutlarında optimum deneyim sunacaktır:
- Masaüstü (1200px+)
- Tablet (768px - 1199px)
- Mobil (320px - 767px)

## Veri Akışı ve Durum Yönetimi

Uygulama Context API kullanılarak durum yönetimi sağlayacak. Ana context bileşenleri:
- UPContext: Universal Profile bağlantısı ve kullanıcı kimlik bilgileri
- PollContext: Anket verileri ve etkileşimler
- UIContext: Arayüz durumu (modal'lar, temalar, bildirimler)

## Performans Optimizasyonları

- Anket listesi için sayfalama (pagination) ve sonsuz kaydırma (infinite scroll)
- Önbelleğe alma (caching) stratejileri ile tekrarlayan kontrat çağrılarını minimize etme
- Büyük listelerde sanal kaydırma (virtualized scrolling) kullanımı

## Anketler için Filtreler ve Arama İşlevleri

**Filtreleme Seçenekleri:**
- Durum: Aktif, Pasif, Tamamlanmış
- Ödül tipi: Ödülsüz, LYX Ödüllü, Token Ödüllü
- Katılım şartları: Herkes, Sadece Takipçiler, Token Sahipleri, NFT Sahipleri
- Tarih: Son 24 saat, Son hafta, Son ay, Tüm zamanlar

**Arama:**
- Anket başlığı veya açıklamasında anahtar kelime araması

## Bildirimler ve Etkileşimler

- Anket süresi dolmak üzere olan anketler için bildirimler
- Oy verdiğiniz anketlerin sonuçları için bildirimler
- Ödül kazanıldığında bildirimler
- Takip edilen kişilerin yeni anketleri için bildirimler 