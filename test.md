## Anket Test Senaryoları

Bu belge, LUKSO Anket uygulamasının temel fonksiyonlarını test etmek için kullanılacak senaryoları içerir.

**Test Ortamı:**
*   Tarayıcı: [Kullandığınız Tarayıcı]
*   Cüzdan: [Kullandığınız Cüzdan]
*   Ağ: LUKSO Testnet

**Test Adımları:**

Lütfen aşağıdaki senaryoları sırasıyla veya bağımsız olarak deneyin ve sonuçları (Başarılı/Başarısız ve notlar) kaydedin.

---

### 1. Anket Oluşturma

**1.1. Ücretsiz Anket (Gereksinimsiz)**
    *   **Açıklama:** Herkesin oy kullanabileceği, ödülsüz bir anket oluşturma.
    *   **Adımlar:**
        1.  `Create Poll` butonuna tıkla.
        2.  Soru, açıklama ve en az 2 seçenek gir.
        3.  Süreyi ayarla (örn: 1 saat).
        4.  `Voting Requirements` bölümünde `None` seçili kalsın.
        5.  `Rewards` bölümünde `Enable Rewards` seçeneği kapalı kalsın.
        6.  `Create Poll` butonuna tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Anket başarıyla oluşturulmalı ve ana sayfada görünmeli. İşlem için sadece gaz ücreti alınmalı.
    *   **Sonuç:**

**1.2. Ücretli Anket (Token Sahibi Gereksinimli, Ödülsüz)**
    *   **Açıklama:** Sadece belirli bir LSP7 token'ına sahip kullanıcıların oy kullanabileceği, ödülsüz bir anket oluşturma. (Kontrat bu durumda ek ücret alıyor olabilir)
    *   **Adımlar:**
        1.  `Create Poll` butonuna tıkla.
        2.  Soru, açıklama ve en az 2 seçenek gir.
        3.  Süreyi ayarla.
        4.  `Voting Requirements` bölümünde `LSP7 Token Holder` seç.
        5.  Geçerli bir LSP7 token adresi ve minimum miktar gir (örn: 1 LYX).
        6.  `Rewards` bölümünde `Enable Rewards` seçeneği kapalı kalsın.
        7.  `Create Poll` butonuna tıkla. Arayüzde gösterilen işlem ücretini kontrol et (gaz + varsa kontrat ücreti).
        8.  Cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Anket başarıyla oluşturulmalı. İşlem için gaz ücreti + (varsa) kontratın belirlediği gereksinim ücreti alınmalı.
    *   **Sonuç:**

**1.3. Ödüllü Anket (LYX Ödüllü, Gereksinimsiz)**
    *   **Açıklama:** Herkesin oy kullanabileceği, oy başına LYX ödülü olan bir anket oluşturma.
    *   **Adımlar:**
        1.  `Create Poll` butonuna tıkla.
        2.  Soru, açıklama ve en az 2 seçenek gir.
        3.  Süreyi ayarla.
        4.  `Voting Requirements` bölümünde `None` seçili kalsın.
        5.  `Rewards` bölümünde `Enable Rewards` seçeneğini aç.
        6.  `Reward Type` olarak `LYX` seç.
        7.  `Reward Per Person` (Kişi Başı Ödül Miktarı) gir (örn: 0.1 LYX).
        8.  `Target Participant Count` (Hedef Katılımcı Sayısı) gir (örn: 5).
        9.  Arayüzde gösterilen toplam maliyeti (Ödül * Hedef + Komisyon) kontrol et.
        10. `Create Poll` butonuna tıkla ve cüzdan ile toplam maliyeti onayla.
    *   **Beklenen Sonuç:** Anket başarıyla oluşturulmalı. Cüzdandan Toplam Maliyet (Ödül + Komisyon) çekilmeli.
    *   **Sonuç:**

**1.4. Ödüllü Anket (LSP7 Token Ödüllü, Gereksinimsiz)**
    *   **Açıklama:** Herkesin oy kullanabileceği, oy başına belirli bir LSP7 token ödülü olan bir anket oluşturma.
    *   **Adımlar:**
        1.  `Create Poll` butonuna tıkla.
        2.  Soru, açıklama ve en az 2 seçenek gir.
        3.  Süreyi ayarla.
        4.  `Voting Requirements` bölümünde `None` seçili kalsın.
        5.  `Rewards` bölümünde `Enable Rewards` seçeneğini aç.
        6.  `Reward Type` olarak `LSP7 Token` seç.
        7.  Geçerli bir LSP7 token adresi gir.
        8.  `Reward Per Person` (Kişi Başı Token Ödülü) gir (örn: 1 TOKEN).
        9.  `Target Participant Count` (Hedef Katılımcı Sayısı) gir (örn: 5).
        10. Arayüzde gösterilen toplam token miktarını ve (varsa) LYX işlem ücretini kontrol et.
        11. `Create Poll` butonuna tıkla. Önce **Token Transferi Onayı** isteyecek, cüzdan ile onayla.
        12. Ardından anket oluşturma işlemini (ve varsa LYX ücretini) cüzdan ile onayla.
    *   **Beklenen Sonuç:** Anket başarıyla oluşturulmalı. Belirtilen toplam token miktarı için onay verilmeli ve anket oluşturma işlemi için (varsa) LYX ücreti ödenmeli.
    *   **Sonuç:**

**1.5. Kombine Gereksinimli ve Ödüllü Anket (Takipçi + LYX Ödül)**
    *   **Açıklama:** Sadece anketi oluşturanı takip edenlerin oy kullanabileceği, LYX ödüllü bir anket oluşturma. (Bu durumda hem ödül maliyeti hem de kombine gereksinim ücreti olabilir).
    *   **Adımlar:**
        1.  `Create Poll` butonuna tıkla.
        2.  Soru, açıklama ve en az 2 seçenek gir.
        3.  Süreyi ayarla.
        4.  `Voting Requirements` bölümünde `Follower` seç.
        5.  `Rewards` bölümünde `Enable Rewards` seçeneğini aç.
        6.  `Reward Type` olarak `LYX` seç.
        7.  `Reward Per Person` gir (örn: 0.1 LYX).
        8.  `Target Participant Count` gir (örn: 3).
        9.  Arayüzde gösterilen toplam LYX maliyetini (Ödül * Hedef + Komisyon + Kombine Gereksinim Ücreti) kontrol et.
        10. `Create Poll` butonuna tıkla ve cüzdan ile toplam maliyeti onayla.
    *   **Beklenen Sonuç:** Anket başarıyla oluşturulmalı. Cüzdandan Toplam Maliyet (Ödül + Komisyon + Kombine Gereksinim Ücreti) çekilmeli.
    *   **Sonuç:**

---

### 2. Oy Kullanma

**2.1. Gereksinimsiz Ankete Oy Verme**
    *   **Ön Koşul:** 1.1 veya 1.3 senaryosu ile oluşturulmuş aktif bir anket.
    *   **Adımlar:**
        1.  Ankete git (detaylarını aç).
        2.  Bir seçenek seç.
        3.  `Vote` butonuna tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Oy başarıyla kaydedilmeli. Seçilen seçeneğin oy sayısı artmalı. Kullanıcı artık aynı ankete oy verememeli. "You have voted" mesajı görünmeli.
    *   **Sonuç:**

**2.2. Gereksinimli Ankete Oy Verme (Yeterli)**
    *   **Ön Koşul:** 1.2, 1.4 veya 1.5 ile oluşturulmuş aktif bir anket. Testi yapan cüzdan **gereksinimleri karşılamalı** (örn: token sahibi olmalı veya takipçi olmalı).
    *   **Adımlar:**
        1.  Anket detaylarını aç. Oy verme butonlarının aktif olduğunu ve hata mesajı olmadığını doğrula.
        2.  Bir seçenek seç.
        3.  `Vote` butonuna tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Oy başarıyla kaydedilmeli. Oy sayısı artmalı. Kullanıcı tekrar oy verememeli.
    *   **Sonuç:**

**2.3. Gereksinimli Ankete Oy Verme (Yetersiz)**
    *   **Ön Koşul:** 1.2, 1.4 veya 1.5 ile oluşturulmuş aktif bir anket. Testi yapan cüzdan **gereksinimleri karşılamamalı**.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  Oy verme butonlarının pasif olduğunu ve gereksinimleri karşılamadığını belirten bir hata mesajı (`Vote Error Message`) göründüğünü doğrula.
    *   **Beklenen Sonuç:** Kullanıcı oy verememeli. Butonlar pasif olmalı ve açıklayıcı bir hata mesajı gösterilmeli.
    *   **Sonuç:**

**2.4. Biten Ankete Oy Verme**
    *   **Ön Koşul:** Süresi dolmuş bir anket.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  Oy verme butonlarının olmadığını veya pasif olduğunu doğrula.
    *   **Beklenen Sonuç:** Kullanıcı oy verememeli.
    *   **Sonuç:**

---

### 3. Ödül Talep Etme

**3.1. LYX Ödülü Talep Etme**
    *   **Ön Koşul:** 1.3 veya 1.5 ile oluşturulmuş, **süresi dolmuş veya hedef katılımcıya ulaşmış** ve kullanıcının oy kullandığı bir anket.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  `Claim Reward` butonunun aktif olduğunu doğrula.
        3.  Butona tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Ödül (örn: 0.1 LYX) kullanıcının cüzdanına gönderilmeli. `Claim Reward` butonu kaybolmalı ve "Ödül alındı" mesajı görünmeli.
    *   **Sonuç:**

**3.2. LSP7 Token Ödülü Talep Etme**
    *   **Ön Koşul:** 1.4 ile oluşturulmuş, **süresi dolmuş veya hedef katılımcıya ulaşmış** ve kullanıcının oy kullandığı bir anket.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  `Claim Reward` butonunun aktif olduğunu doğrula.
        3.  Butona tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Token ödülü (örn: 1 TOKEN) kullanıcının cüzdanına gönderilmeli. `Claim Reward` butonu kaybolmalı ve "Ödül alındı" mesajı görünmeli.
    *   **Sonuç:**

**3.3. Erken Ödül Talep Etme (Başarısız Olmalı)**
    *   **Ön Koşul:** 1.3, 1.4 veya 1.5 ile oluşturulmuş, **henüz bitmemiş ve hedef katılımcıya ulaşmamış**, kullanıcının oy kullandığı bir anket.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  `Claim Reward` butonunun **görünmediğini** veya **pasif** olduğunu doğrula.
    *   **Beklenen Sonuç:** Kullanıcı ödül talep edememeli.
    *   **Sonuç:**

---

### 4. Anket Yönetimi (Sadece Anket Sahibi)

**4.1. Aktif Anketi Kapatma**
    *   **Ön Koşul:** Testi yapan cüzdanın sahip olduğu **aktif** bir anket.
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  `Yönetim` sekmesine git.
        3.  `Anketi Kapat` butonuna tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Anket durumu "Sona Erdi" olarak güncellenmeli. Artık oy verilememeli. Yönetim sekmesinde kapatma butonu kaybolmalı.
    *   **Sonuç:**

**4.2. Kalan Fonları Çekme (Ödüllü Anket Sonrası)**
    *   **Ön Koşul:** Testi yapan cüzdanın sahip olduğu, **ödüllü ve sona ermiş** bir anket. (Tüm ödüller dağıtılmamış olabilir).
    *   **Adımlar:**
        1.  Anket detaylarını aç.
        2.  `Yönetim` sekmesine git.
        3.  `Kalan Ödülleri Çek` butonunun aktif olduğunu doğrula (eğer çekilecek bakiye varsa).
        4.  Butona tıkla ve cüzdan ile işlemi onayla.
    *   **Beklenen Sonuç:** Kontratta kalan LYX veya token ödülleri anket sahibinin cüzdanına geri gönderilmeli. Buton pasifleşmeli veya kaybolmalı.
    *   **Sonuç:**

---

### 5. Arayüz Kontrolleri

**5.1. Anket Detayları Görünümü**
    *   **Adımlar:**
        1.  Farklı türdeki (ücretsiz, ödüllü, gereksinimli, aktif, bitmiş) anketlerin detaylarını aç.
        2.  Soru, açıklama, seçenekler, oy sayıları, yüzdeler, kalan süre, toplam oy, yaratıcı bilgisi, ödül durumu, gereksinim türü gibi bilgilerin doğru gösterildiğini kontrol et.
    *   **Beklenen Sonuç:** Tüm bilgiler anketin durumuna uygun ve doğru şekilde gösterilmeli. `endTime` gibi değerlerin eksik olduğu durumlarda hata yerine "Bilgi Yok" gibi fallback metinler gösterilmeli.
    *   **Sonuç:**

**5.2. Katılımcılar Sekmesi**
    *   **Adımlar:**
        1.  Oy kullanılmış bir anketin detaylarını aç.
        2.  `Katılımcılar` sekmesine git.
        3.  Her seçenek için oy veren kullanıcıların adreslerinin (ve varsa profil bilgilerinin) doğru listelendiğini kontrol et.
    *   **Beklenen Sonuç:** Oy verenler doğru seçenek altında listelenmeli. Profil resimleri ve isimleri (alınabiliyorsa) gösterilmeli.
    *   **Sonuç:**

**5.3. Takip Et/Takipten Çık Butonu**
    *   **Adımlar:**
        1.  Başkası tarafından oluşturulmuş bir anketin detaylarını aç.
        2.  Yaratıcıyı takip etmiyorsanız `Takip Et` butonunun göründüğünü, takip ediyorsanız `Takipten Çık` butonunun göründüğünü kontrol et.
        3.  Butona tıkla ve işlemi onayla. Butonun durumunun değiştiğini doğrula.
        4.  Eğer anket takipçi gerektiriyorsa, takip durumunun oy verme yeterliliğini etkilediğini kontrol et.
    *   **Beklenen Sonuç:** Takip etme/bırakma işlemi başarılı olmalı ve buton durumu güncellenmeli. Oy verme durumu buna göre değişmeli.
    *   **Sonuç:** 