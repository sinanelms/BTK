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
            
            // Excel dosyasını indir
            XLSX.writeFile(workbook, filename);
            
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
            // jsPDF'i başlat
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'pt', 'a4');
            
            // Doküman başlığı
            doc.setFontSize(16);
            doc.text('Telefon Arama Kayıtları', 40, 40);
            
            // Alt bilgi olarak tarih ve sayfa bilgisini ekle
            const now = new Date().toLocaleString('tr-TR');
            doc.setFontSize(10);
            doc.text(`Oluşturulma Tarihi: ${now}`, 40, 60);
            doc.text(`Toplam Kayıt Sayısı: ${records.length}`, 40, 75);
            
            // Tablo verisini hazırla
            const tableData = formattedRecords.map(record => [
                record['Sıra No'],
                record['Tarih'],
                record['Tip'],
                record['Numara'],
                record['Diğer Numara'],
                record['İsim Soyisim'],
                record['Süre (sn)']
            ]);
            
            // Tablo başlıklarını ayarla
            const headers = [
                'Sıra No', 'Tarih', 'Tip', 'Numara', 'Diğer Numara', 'İsim Soyisim', 'Süre (sn)'
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
            
            // Aktarma tarihi ve saat bilgisini dosya ismine ekle
            const timestamp = now.replace(/[: \/]/g, '-');
            const filename = `telefon_arama_kayitlari_${timestamp}.pdf`;
            
            // PDF dosyasını indir
            doc.save(filename);
            
            // Başarı mesajı göster
            this.showExportStatus(`${records.length} kayıt PDF formatında başarıyla indirildi.`, 'success');
        } catch (error) {
            console.error('PDF dışa aktarma hatası:', error);
            this.showExportStatus('PDF dışa aktarma işlemi sırasında bir hata oluştu.', 'danger');
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
            
            // CSV dosyasını indir
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, filename);
            
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