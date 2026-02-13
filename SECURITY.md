declined, etc.
# Güvenlik Politikası

Bu doküman, **Smart Student Portal** projesi için güvenlik açıklarının bildirilmesi,
değerlendirilmesi ve giderilmesi süreçlerini tanımlar.

## Desteklenen Sürümler

Güvenlik güncellemeleri aşağıdaki kapsam için sağlanır:

| Sürüm / Dal | Durum |
| --- | --- |
| `main` (en güncel kod) | ✅ Destekleniyor |
| En son yayınlanan sürüm (`v1.x`) | ✅ Destekleniyor |
| Daha eski sürümler | ❌ Desteklenmiyor |

Not: Güvenlik düzeltmeleri öncelikle `main` dalına uygulanır, ardından gerekli ise yayınlanan sürüme geri taşınır.

## Güvenlik Açığı Bildirme

### Tercih edilen yöntem (özel bildirim)

- GitHub'da **Private Vulnerability Reporting / Security Advisory** özelliğini kullanın.
- Özel bildirim mümkün değilse repository bakımcısıyla doğrudan, özel bir kanaldan iletişime geçin.

### Lütfen yapmayın

- Açık detaylarını ilk aşamada herkese açık issue/discussion içinde paylaşmayın.
- Exploit kodunu, PoC URL’lerini veya hassas veriyi public ortamlara koymayın.

### Bildirime eklenmesi gereken bilgiler

- Açığın kısa özeti ve etkisi
- Etkilenen endpoint/akış (ör. login, şifre sıfırlama, profil fotoğrafı yükleme)
- Yeniden üretim adımları
- Mümkünse PoC (minimum ve güvenli)
- Tahmini etki düzeyi (Confidentiality/Integrity/Availability)
- Ortam bilgisi (Node sürümü, OS, tarayıcı, ters proxy vb.)

## Yanıt ve Çözüm Süresi Hedefleri (SLA)

- **İlk geri dönüş:** 72 saat içinde
- **Ön değerlendirme:** 5 iş günü içinde
- **Kritik/Yüksek seviye açıklar:** mümkün olan en kısa sürede, hedef 7–14 gün
- **Orta/Düşük seviye açıklar:** planlı bakım penceresinde

Bu süreler hedef niteliğindedir; açık karmaşıklığına ve doğrulama ihtiyacına göre değişebilir.

## Sorumlu Açıklama (Responsible Disclosure)

- Açık doğrulanana ve düzeltme yayımlanana kadar gizlilik beklenir.
- Düzeltme yayımlandığında etkilenen sürümler ve alınan aksiyonlar release notlarında paylaşılır.
- Uygun görülen durumlarda araştırmacıya teşekkür verilebilir.

## Kapsam (Bu Proje İçin)

Bu politika aşağıdaki ana bileşenleri kapsar:

- Kimlik doğrulama ve oturum yönetimi (`/auth/*`)
- Yetkilendirme ve admin erişimi (`/admin/students/*`)
- Şifre sıfırlama akışları
- Profil görseli yükleme/silme akışı
- Veritabanı işlemleri (SQLite)
- Docker ile dağıtım yapılandırması

Kapsam dışı tipik örnekler:

- Sadece görsel/UI kusurları (güvenlik etkisi yoksa)
- Açık kaynak bağımlılıklarda henüz pratik istismar yolu olmayan düşük etkili bulgular

## Uygulanan Güvenlik Kontrolleri

Proje içinde halihazırda bulunan başlıca kontroller:

- `helmet` ile temel HTTP güvenlik başlıkları
- `express-session` ile `httpOnly`, `sameSite=lax`, üretimde `secure` cookie
- CSRF koruması (HMAC tabanlı token doğrulama)
- Giriş ve şifre sıfırlama uçlarında `express-rate-limit`
- Şifrelerin `bcrypt` ile hashlenmesi
- Şifre sıfırlama tokenlarının hashlenerek saklanması ve süre sonu kontrolü
- Admin rotalarında kimlik + rol tabanlı kontrol
- Profil fotoğrafı yüklemede MIME tipi ve boyut limiti
- SQLite foreign key ve indekslerle veri bütünlüğü

## Operasyonel Güvenlik Gereksinimleri

Üretim ortamında aşağıdakiler zorunlu kabul edilir:

1. Güçlü ve rastgele `SESSION_SECRET` kullanımı
2. `NODE_ENV=production` ile güvenli cookie davranışı
3. HTTPS/TLS terminasyonu (reverse proxy veya load balancer)
4. Loglarda hassas veri maskeleme (token, parola, oturum bilgisi)
5. Düzenli bağımlılık taraması (`npm audit` + manuel doğrulama)
6. Yedekleme, erişim kontrolü ve en az ayrıcalık prensibi

## Bilinen Riskler ve Güçlendirme Önerileri

Bu proje eğitim/öğrenme odaklı bir portaldır; üretim öncesi aşağıdaki sertleştirmeler önerilir:

- CSP politikasının devreye alınması (şu an gevşek/kapalı yapılandırma kullanılabilir)
- Oturum depolamasının memory-store yerine kalıcı güvenli store’a taşınması
- Şifre politikalarının güçlendirilmesi (uzunluk/karmaşıklık/denylist)
- MFA, kritik aksiyonlarda yeniden kimlik doğrulama
- Sentry/SIEM benzeri merkezi izleme + uyarı
- Güvenli SDLC kontrolleri (SAST/DAST/secret scanning)

## Bağımlılık ve Tedarik Zinciri Güvenliği

- Üçüncü parti paket sürümleri düzenli güncellenmelidir.
- Yeni paket eklenirken bakım durumu, lisans, CVE geçmişi değerlendirilmelidir.
- Kilit dosyası (`package-lock.json`) değişiklikleri code review sürecinden geçmelidir.

## Veri Koruma ve Gizlilik

- Kullanıcı verileri (kimlik, e-posta, öğrenci kayıt bilgileri) asgari gerekli düzeyde işlenmelidir.
- Hassas veriler debug loglarına yazdırılmamalıdır.
- Gerektiğinde veri saklama ve silme süreçleri kurum politikalarıyla uyumlu yürütülmelidir.

## Güvenlik Testi ve Doğrulama

Tavsiye edilen minimum doğrulamalar:

- Kimlik doğrulama bypass testleri
- Yetki yükseltme ve IDOR kontrolleri
- CSRF/XSS/Injection testleri
- Upload abuse testleri (tip, boyut, içerik)
- Rate limit ve brute-force dayanıklılık testleri

## Yasal ve Etik Çerçeve

- Sadece izinli sistemlerde test yapın.
- Hizmet kesintisine neden olacak saldırı simülasyonlarından kaçının.
- Kullanıcı verisi içeren bulguları gizli tutun ve minimizasyon uygulayın.

## İletişim Notu

Bu dosya, teknik güvenlik koordinasyon rehberidir. İletişim kanalları değişirse bu doküman güncellenmelidir.
