# BTK Arama Kayıtları Analiz Platformu

Bu proje, BTK (Bilgi Teknolojileri ve İletişim Kurumu) tarafından sağlanan telefon arama kayıtlarının PDF formatındaki raporlarını analiz etmek ve görselleştirmek için geliştirilmiş bir web uygulamasıdır.

## Özellikler

- PDF formatındaki BTK arama kayıtlarını otomatik işleme
- Arama kayıtlarını CSV formatına dönüştürme
- Detaylı arama kayıtları analizi
- Kullanıcı dostu web arayüzü
- Çoklu PDF dosyası yükleme ve yönetimi
- Güvenli dosya işleme ve veri yönetimi

## Teknik Detaylar

### Kullanılan Teknolojiler

- Python 3.x
- Flask (Web Framework)
- PyMuPDF (PDF işleme)
- Tabula-py (PDF tablo çıkarma)
- Pandas (Veri analizi)
- HTML/CSS/JavaScript (Frontend)

### Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/sinanelms/BTK.git
cd BTK
```

2. Gerekli Python paketlerini yükleyin:
```bash
pip install -r requirements.txt
```

3. Uygulamayı başlatın:
```bash
python app.py
```

Uygulama varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.

## Kullanım

1. Web tarayıcınızda `http://localhost:5000` adresine gidin
2. "PDF Yükle" butonuna tıklayarak BTK arama kayıtları PDF'ini yükleyin
3. Sistem otomatik olarak PDF'i işleyecek ve analiz edecektir
4. Sonuçları web arayüzünde görüntüleyebilirsiniz

## Güvenlik

- Yüklenen dosyalar güvenli bir şekilde işlenir
- Dosya adları UUID ile benzersiz hale getirilir
- Sadece PDF dosyaları kabul edilir
- Maksimum dosya boyutu 100MB ile sınırlandırılmıştır

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir özellik dalı oluşturun (`git checkout -b yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Dalınıza push yapın (`git push origin yeni-ozellik`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## İletişim

Sorularınız veya önerileriniz için lütfen bir Issue açın veya e-posta gönderin.

## Notlar

- Bu uygulama sadece BTK'nın standart arama kayıtları formatını desteklemektedir
- PDF dosyalarının doğru formatta olduğundan emin olun
- Büyük dosyaların işlenmesi biraz zaman alabilir 
