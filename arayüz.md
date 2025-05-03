# LuksoPoll - Modern Anket Arayüzü Tasarımı

## 1. Tasarım Prensipleri

Modern, minimal ancak profesyonel bir arayüz için aşağıdaki tasarım prensiplerine odaklanacağız:

- **Temizlik ve Netlik**: Gereksiz öğelerden arındırılmış, bilginin açıkça gösterildiği bir tasarım
- **Kullanım Kolaylığı**: Tüm işlevlere kolay erişim sağlayan, kullanıcıyı yönlendiren bir deneyim
- **Profesyonellik**: LUKSO ekosisteminin inovatif yapısını yansıtan modern bir görünüm
- **Tutarlılık**: Tüm sayfalar ve bileşenler arasında tutarlı stil ve davranışlar
- **UPPROVIDER**: Sayfaların her yerinde UPProvider kullanılacak gerekli dökümanları ;
https://github.com/lukso-network/tools-up-provider
https://www.npmjs.com/package/@lukso/up-provider
https://docs.lukso.tech/tools/dapps/up-provider/getting-started
https://docs.lukso.tech/learn/mini-apps/connect-upprovider
!! BU STANDARTLAR HARİCİNDE CÜZDAN BAĞLANTI VE BLOKZİNCİR İŞLEM GÖNDERİMİ YAPILMAYACAK. !!
## 2. Renk Şeması

LUKSO'nun kurumsal renklerinden esinlenen, ancak daha sofistike bir şema:

### Ana Renkler
- **Ana Renk**: `#FF2975` (LUKSO'nun pembe tonu)
- **İkincil Renk**: `#500126` 
- **Aksiyonlar**: `#ed1169` 
### Nötr Tonlar
- **Arka Plan**: `##fff0f4` 
- **Kartlar/Paneller**: `#FFFFFF` (Beyaz)
- **Metinler**: `#500126`
- **İkincil Metinler**: `#ffe2ea`
- **Ayırıcılar**: `#E2E8F0` (Açık gri)

### Durum Renkleri
- **Başarı**: `#10B981` (Yeşil)
- **Uyarı**: `#FBBF24` (Sarı)
- **Hata**: `#EF4444` (Kırmızı)
- **Bilgi**: `#3B82F6` (Mavi)

## 3. Tipografi

- **Ana Font**: Fütüristik, Modern ve Şık bir font sen seçeceksin
- **Başlıklar**: Fütüristik, Modern ve Şık bir font sen seçeceksin
- **Gövde Metni**: Fütüristik, Modern ve Şık bir font sen seçeceksin
- **Butonlar/Etiketler**: Fütüristik, Modern ve Şık bir font sen seçeceksin
!!Hepsini Aynı font kullanıp boyutları değiştirebilirsin!!
## 4. Bileşenler

### Kartlar
- **Anket Kartları**: Yuvarlatılmış köşeler, hafif gölgeler, hover efektleri
- **Bilgi Kartları**: İstatistikler ve bildirimler için basit, anlaşılır kartlar

### Butonlar
- **Birincil**: Dolgu renkli, yuvarlak köşeli
- **İkincil**: Kenarlıklı, transparan arka planlı
- **Üçüncül**: Sadece metin, hover durumunda altı çizgili

### Form Elemanları
- **Giriş Alanları**: Minimal tasarım, odaklandığında belirgin kenarlıklar
- **Seçim Kutuları**: Özel tasarlanmış onay kutuları ve radyo butonları
- **Seçiciler**: Temiz ve modern dropdown menüler

## 5. Sayfa Düzenleri

### Karşılama Ekranı
1. Gerekli Butonların ve yönlendirmelerin olduğu basit bir arayüz.
   Anket oluşturma 
   Açık anketler
   Profil gibi gerekli yapılara yönlendirmeleri sağlar. Yapılan yönlendirmelerde her biri ile alakalı bir modal tasarlanır


### Anket Detay Sayfası
Kontrat üzerinden alınan anket detaylarını göstereceğimiz bir modal aynı şekilde oy kullanma kullanılmış oyları görme vs de eklenecek kontrat üzerinden

### Anket Oluşturma Sayfası
- Adım adım anket oluşturma sihirbazı
- Anket bilgileri, seçenekler, ayarlar, ödüller
- Ön izleme özelliği
- Onaylama ve blockchain'e gönderme

## 6. Görsel Unsurlar

### İkonlar
- **Stil**: Çizgi ikonlar veya Duotone
- **Boyut**: 24px (standart), 20px (küçük alanlar)
- **Kütüphane**: Heroicons veya Phosphor Icons

### İllüstrasyonlar
- **Stil**: Minimalist, modern, 2D veya izometrik
- **Renkler**: Uygulama renk şemasıyla uyumlu
- **Temalar**: Oylama, katılım, blockchain, ödüller

### Animasyonlar
- Sayfa geçişleri
- Veri yükleme göstergeleri
- Hover ve tıklama efektleri
- Başarı/hata durumu bildirimleri

## 7. Responsive Tasarım Kırılma Noktaları
Herhangi bir kırılma noktası olmayacak iframe içerisinde çalışacağı için full ekran yapılacak ama ekran boyutu küçüldükçe her şey küçülecek ve sığacak

## 8. Özel Özellikler

### Blockchain Entegrasyonu
- Cüzdan bağlantı durumu göstergesi
- İşlem durumu bildirimleri
- Gas ücretleri ve işlem detayları
- LSP3 Profile Metadata ile profil çekilmesi kullanıcı adı ve profil resmi getirilip arayüze eklenmesi (Bağlı kullanıcı oy verenler anketi oluşturanlar adres olarak hiç bir şey gösterilmeyecek her profil metadatası ile görüntülenecek)
https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md#specification
https://docs.lukso.tech/learn/universal-profile/metadata/read-profile-data
https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-3-Profile-Metadata.md
- LSP4 Metadata ile LSP7/8 assetlerin encode edilip gerekli metadatanın çekilmesi (LSP7/8 Kullanılan her yerde olacak)
https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-7-DigitalAsset.md
https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-4-DigitalAsset-Metadata.md
https://docs.lukso.tech/learn/digital-assets/metadata-management/read-asset-data
https://docs.lukso.tech/networks/mainnet/parameters
https://docs.lukso.tech/standards/metadata/lsp5-received-assets



## 10. Uygulama Süreci

1. **Renk şeması ve tipografi** uygulaması
2. **Ana sayfa** yeniden tasarımı
3. **Anket kartları** stillendirilmesi
4. **Anket detay** sayfası tasarımı
5. **Form elemanları** ve **butonlar** 
6. **Profil sayfası** tasarımı
7. **Mobil uyumluluk** çalışması
8. **Animasyonlar** ve etkileşim iyileştirmeleri
