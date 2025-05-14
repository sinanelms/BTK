/**
 * Dışa Aktarma Modülü
 * 
 * Bu dosya, filtrelenmiş kayıtların çeşitli formatlarda dışa aktarılması için
 * gerekli fonksiyonları içerir.
 */

class ExportManager {
    constructor(recordsProvider) {
        this.recordsProvider = recordsProvider;
        this.initializeEventListeners();
    }

    /**
     * Olay dinleyicilerini başlatır
     */
    initializeEventListeners() {
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPdf').addEventListener('click', () => this.exportToPdf());
        document.getElementById('exportCsv').addEventListener('click', () => this.exportToCsv());
    }

    /**
     * Dışa aktarma işlemi için kayıtları hazırlar
     */
    prepareRecordsForExport() {
        let records = [];
        
        // Eğer recordsProvider bir fonksiyon ise çağır
        if (typeof this.recordsProvider === 'function') {
            records = this.recordsProvider();
        } 
        // FilterManager nesnesine referans ise
        else if (this.recordsProvider && this.recordsProvider.filteredProducts) {
            records = this.recordsProvider.filteredProducts;
        }
        
        return records;
    }

    /**
     * Verileri sade bir dizi olarak formatlayarak döndürür
     */
    formatRecordsToArray(records) {
        return records.map(record => {
            return {
                'Sıra No': record['SIRA NO'] || '',
                'Tarih': record['TARİH'] || '',
                'Tip': record['TİP'] || '',
                'Numara': record['NUMARA'] || '',
                'Diğer Numara': record['DİĞER NUMARA'] || '',
                'İsim Soyisim': record['İsim Soyisim ( Diğer Numara)'] || '',
                'Süre (sn)': record['salt_sure'] || '0',
                'TC Kimlik No': record['TC Kimlik No (Diğer Numara)'] || '',
                'IMEI': record['IMEI'] || ''
            };
        });
    }

    /**
     * Excel formatında dışa aktarır
     */
    exportToExcel() {
        // Hazırlık için dönüşüm bilgisini göster
        this.showExportStatus('Excel dosyası hazırlanıyor...', 'info');
        
        const records = this.prepareRecordsForExport();
        const formattedRecords = this.formatRecordsToArray(records);
        
        try {
            // SheetJS ile excel oluşturma
            const worksheet = XLSX.utils.json_to_sheet(formattedRecords);
            const workbook = XLSX.utils.book_new();
            
            // Turkish character encoding için ayar
            workbook.Props = {
                Title: "Telefon Arama Kayıtları",
                Subject: "Arama Kayıtları",
                Author: "Arama Kayıtları Uygulaması",
                CreatedDate: new Date()
            };
            
            // Türkçe karakterleri düzgün göstermek için sayfa kodlaması ayarı
            workbook.Workbook = {
                Views: [{RTL: false}],
                Sheets: [{
                    WorkbookOptions: {
                        DisplayLanguage: "tr-TR"
                    }
                }]
            };
            
            // Çalışma sayfasını ekle
            XLSX.utils.book_append_sheet(workbook, worksheet, "Arama Kayıtları");
            
            // Kolon genişliklerini ayarla
            const columnsWidth = [
                { wpx: 60 },  // Sıra No
                { wpx: 150 }, // Tarih
                { wpx: 120 }, // Tip
                { wpx: 120 }, // Numara
                { wpx: 120 }, // Diğer Numara
                { wpx: 200 }, // İsim Soyisim
                { wpx: 80 },  // Süre
                { wpx: 140 }, // TC Kimlik No
                { wpx: 140 }  // IMEI
            ];
            
            worksheet['!cols'] = columnsWidth;
            
            // Aktarma tarihi ve saat bilgisini dosya ismine ekle
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `telefon_arama_kayitlari_${timestamp}.xlsx`;
            
            // Excel dosyasını indir (BookType: 'xlsx' ve UTF8 için)
            const wopts = { 
                bookType: 'xlsx', 
                bookSST: false, 
                type: 'binary',
                cellStyles: true
            };
            
            // Excel dosyasını indir
            XLSX.writeFile(workbook, filename, wopts);
            
            // Başarı mesajı göster
            this.showExportStatus(`${records.length} kayıt Excel formatında başarıyla indirildi.`, 'success');
        } catch (error) {
            console.error('Excel dışa aktarma hatası:', error);
            this.showExportStatus('Excel dışa aktarma işlemi sırasında bir hata oluştu.', 'danger');
        }
    }

    /**
     * PDF formatında dışa aktarır
     */
    exportToPdf() {
        // Hazırlık için dönüşüm bilgisini göster
        this.showExportStatus('PDF dosyası hazırlanıyor...', 'info');
        
        const records = this.prepareRecordsForExport();
        const formattedRecords = this.formatRecordsToArray(records);
        
        try {
            // Türkçe karakterleri ASCII karşılıklarıyla değiştir
            const fixTurkishChars = (str) => {
                if (typeof str !== 'string') return str;
                return str
                    .replace(/ı/g, 'i')
                    .replace(/İ/g, 'I')
                    .replace(/ğ/g, 'g')
                    .replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u')
                    .replace(/Ü/g, 'U')
                    .replace(/ş/g, 's')
                    .replace(/Ş/g, 'S')
                    .replace(/ç/g, 'c')
                    .replace(/Ç/g, 'C')
                    .replace(/ö/g, 'o')
                    .replace(/Ö/g, 'O');
            };
            
            // Tamamen ASCII tabanlı veriler oluştur
            const asciiFormattedRecords = formattedRecords.map(record => {
                const result = {};
                for (const key in record) {
                    // Hem anahtarları hem değerleri düzelt
                    const fixedKey = fixTurkishChars(key);
                    result[fixedKey] = fixTurkishChars(record[key]);
                }
                return result;
            });
            
            // jsPDF'i başlat
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'pt', 'a4');
            
            // Doküman başlığı
            doc.setFontSize(16);
            doc.text('Telefon Arama Kayitlari', 40, 40);
            
            // Alt bilgi olarak tarih ve sayfa bilgisini ekle
            const now = new Date().toLocaleString('tr-TR').replace(/[ıİğĞüÜşŞçÇöÖ]/g, m => 
                m === 'ı' ? 'i' : 
                m === 'İ' ? 'I' : 
                m === 'ğ' ? 'g' : 
                m === 'Ğ' ? 'G' : 
                m === 'ü' ? 'u' : 
                m === 'Ü' ? 'U' : 
                m === 'ş' ? 's' : 
                m === 'Ş' ? 'S' : 
                m === 'ç' ? 'c' : 
                m === 'Ç' ? 'C' : 
                m === 'ö' ? 'o' : 'O'
            );
            
            doc.setFontSize(10);
            doc.text(`Olusturulma Tarihi: ${now}`, 40, 60);
            doc.text(`Toplam Kayit Sayisi: ${records.length}`, 40, 75);
            
            // Tablo verisini hazırla - ASCII karakterler olarak
            const tableData = asciiFormattedRecords.map(record => [
                record['Sira No'],
                record['Tarih'],
                record['Tip'],
                record['Numara'],
                record['Diger Numara'],
                record['Isim Soyisim'],
                record['Sure (sn)']
            ]);
            
            // Tablo başlıklarını ayarla - ASCII karakterler olarak
            const headers = [
                'Sira No', 'Tarih', 'Tip', 'Numara', 'Diger Numara', 'Isim Soyisim', 'Sure (sn)'
            ];
            
            // Tabloyu oluştur ve PDF'e ekle
            doc.autoTable({
                startY: 90,
                head: [headers],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 50 },     // Sıra No
                    1: { cellWidth: 120 },    // Tarih
                    2: { cellWidth: 100 },    // Tip
                    3: { cellWidth: 100 },    // Numara
                    4: { cellWidth: 100 },    // Diğer Numara
                    5: { cellWidth: 150 },    // İsim Soyisim
                    6: { cellWidth: 50 }      // Süre
                },
                didDrawPage: (data) => {
                    // Sayfa numarası ekle
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        const pageSize = doc.internal.pageSize;
                        doc.text(`Sayfa ${i} / ${pageCount}`, pageSize.width - 70, pageSize.height - 20);
                    }
                }
            });
            
            // Aktarma tarihi ve saat bilgisini dosya ismine ekle - ASCII karakterler olarak
            const timestamp = now.replace(/[: \/]/g, '-');
            const filename = `telefon_arama_kayitlari_${timestamp}.pdf`;
            
            // PDF dosyasını indir
            doc.save(filename);
            
            // Başarı mesajı göster
            this.showExportStatus(`${records.length} kayit PDF formatinda basariyla indirildi.`, 'success');
        } catch (error) {
            console.error('PDF dışa aktarma hatası:', error);
            this.showExportStatus('PDF disa aktarma islemi sirasinda bir hata olustu.', 'danger');
        }
    }

    /**
     * CSV formatında dışa aktarır
     */
    exportToCsv() {
        // Hazırlık için dönüşüm bilgisini göster
        this.showExportStatus('CSV dosyası hazırlanıyor...', 'info');
        
        const records = this.prepareRecordsForExport();
        const formattedRecords = this.formatRecordsToArray(records);
        
        try {
            // Başlıkları belirle
            const headers = Object.keys(formattedRecords[0]);
            
            // CSV verisi oluştur
            let csvData = headers.join(',') + '\n';
            
            // Her kayıt için satır ekle
            formattedRecords.forEach(record => {
                const row = headers.map(header => {
                    let value = record[header] || '';
                    // Özel karakterleri işle (virgüller ve yeni satırlar)
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',');
                
                csvData += row + '\n';
            });
            
            // Aktarma tarihi ve saat bilgisini dosya ismine ekle
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `telefon_arama_kayitlari_${timestamp}.csv`;
            
            // UTF-8 BOM ekleyerek Türkçe karakterlerin düzgün görünmesini sağla
            const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const csvBlob = new Blob([BOM, csvData], { type: 'text/csv;charset=utf-8;' });
            
            // CSV dosyasını indir
            saveAs(csvBlob, filename);
            
            // Başarı mesajı göster
            this.showExportStatus(`${records.length} kayıt CSV formatında başarıyla indirildi.`, 'success');
        } catch (error) {
            console.error('CSV dışa aktarma hatası:', error);
            this.showExportStatus('CSV dışa aktarma işlemi sırasında bir hata oluştu.', 'danger');
        }
    }

    /**
     * Dışa aktarma durumunu gösterir
     */
    showExportStatus(message, type = 'info') {
        // Durum gösterici elementini kontrol et/oluştur
        let statusElement = document.getElementById('exportStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'exportStatus';
            statusElement.className = 'alert mt-3';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.right = '20px';
            statusElement.style.maxWidth = '400px';
            statusElement.style.zIndex = '9999';
            document.body.appendChild(statusElement);
        }
        
        // Duruma göre uygun ikon ve renk belirle
        let icon, bgClass;
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle me-2"></i>';
                bgClass = 'alert-success';
                break;
            case 'danger':
                icon = '<i class="fas fa-exclamation-circle me-2"></i>';
                bgClass = 'alert-danger';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
                bgClass = 'alert-warning';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle me-2"></i>';
                bgClass = 'alert-info';
                break;
        }
        
        // Eski sınıfları temizle ve yeni sınıfı ekle
        statusElement.className = 'alert ' + bgClass;
        
        // İçeriği ayarla
        statusElement.innerHTML = icon + message;
        
        // Göster
        statusElement.style.display = 'block';
        
        // Belirli bir süre sonra gizle (success ve info tipleri için)
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }
}

// Global olarak export et
window.ExportManager = ExportManager;