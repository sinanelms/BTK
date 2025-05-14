/**
 * Arama Kayıtları Analiz Modülü
 * 
 * Bu modül, arama kayıtlarının analizi ve görselleştirilmesi için gerekli
 * işlevleri sağlar.
 */

class AnalyticsManager {
    constructor(callRecords) {
        this.callRecords = callRecords;
        this.charts = {};
        this.currentTimeView = 'daily';
        this.selectedPerson = '';
        
        // Renk paleti
        this.colorPalette = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#6f42c1', '#5a5c69', '#858796', '#20c9a6', '#fed136'
        ];
        
        this.initAnalytics();
    }
    
    /**
     * Analiz modülünü başlatır ve yükler
     */
    initAnalytics() {
        this.setupEventListeners();
        this.loadContactsList();
        this.renderOverviewStats();
        this.renderCallTypeDistribution();
        this.renderTimeDistribution();
        this.renderTopContacts();
        this.renderLongestCalls();
        this.renderDurationDistribution();
        this.renderTimeline();
    }
    
    /**
     * Olay dinleyicilerini ayarlar
     */
    setupEventListeners() {
        // Görünüm seçimi butonları (Tablo/Analiz)
        document.getElementById('tableViewBtn').addEventListener('click', () => this.switchView('table'));
        document.getElementById('analysisViewBtn').addEventListener('click', () => this.switchView('analysis'));
        
        // Zaman analizi periyod seçimi
        document.getElementById('dailyBtn').addEventListener('click', () => this.updateTimeDistribution('daily'));
        document.getElementById('weeklyBtn').addEventListener('click', () => this.updateTimeDistribution('weekly'));
        document.getElementById('monthlyBtn').addEventListener('click', () => this.updateTimeDistribution('monthly'));
        
        // Kişi seçimi değişikliği
        document.getElementById('contactSelect').addEventListener('change', (e) => {
            this.selectedPerson = e.target.value;
            this.renderTimeline();
        });
    }
    
    /**
     * Tablo ve Analiz görünümleri arasında geçiş yapar
     */
    switchView(view) {
        const tableView = document.getElementById('tableView');
        const analysisView = document.getElementById('analysisView');
        const tableViewBtn = document.getElementById('tableViewBtn');
        const analysisViewBtn = document.getElementById('analysisViewBtn');
        
        if (view === 'table') {
            tableView.classList.remove('d-none');
            analysisView.classList.add('d-none');
            tableViewBtn.classList.add('active');
            tableViewBtn.classList.remove('btn-outline-primary');
            tableViewBtn.classList.add('btn-primary');
            analysisViewBtn.classList.remove('active');
            analysisViewBtn.classList.remove('btn-primary');
            analysisViewBtn.classList.add('btn-outline-primary');
        } else {
            tableView.classList.add('d-none');
            analysisView.classList.remove('d-none');
            tableViewBtn.classList.remove('active');
            tableViewBtn.classList.remove('btn-primary');
            tableViewBtn.classList.add('btn-outline-primary');
            analysisViewBtn.classList.add('active');
            analysisViewBtn.classList.remove('btn-outline-primary');
            analysisViewBtn.classList.add('btn-primary');
            
            // Grafikleri yenile ve doğru boyutlandırmayı sağla
            this.resizeCharts();
        }
    }
    
    /**
     * Kişi listesini yükler
     */
    loadContactsList() {
        const contactSelect = document.getElementById('contactSelect');
        const uniqueContacts = [...new Set(this.callRecords.map(record => record.name))].filter(name => name);
        
        uniqueContacts.sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            contactSelect.appendChild(option);
        });
    }
    
    /**
     * Özet istatistikleri gösterir
     */
    renderOverviewStats() {
        const statisticsSummary = document.getElementById('statisticsSummary');
        
        // Toplam arama sayısı
        const totalCalls = this.callRecords.length;
        
        // Gelen arama sayısı
        const incomingCalls = this.callRecords.filter(record => record['TİP'] && record['TİP'].includes('Gelen')).length;
        
        // Giden arama sayısı
        const outgoingCalls = this.callRecords.filter(record => record['TİP'] && record['TİP'].includes('aradı')).length;
        
        // Cevapsız arama sayısı
        const missedCalls = this.callRecords.filter(record => record['TİP'] && record['TİP'].includes('Cevapsız')).length;
        
        // Toplam konuşma süresi
        const totalDuration = this.callRecords.reduce((total, record) => {
            return total + (parseInt(record.salt_sure) || 0);
        }, 0);
        
        // Ortalama konuşma süresi (cevapsız aramalar hariç)
        const answeredCalls = this.callRecords.filter(record => 
            parseInt(record.salt_sure) > 0 || 
            (record['TİP'] && !record['TİP'].includes('Cevapsız'))
        );
        const avgDuration = answeredCalls.length > 0 ? 
            Math.round(answeredCalls.reduce((total, record) => {
                return total + (parseInt(record.salt_sure) || 0);
            }, 0) / answeredCalls.length) : 0;
        
        // Benzersiz kişi sayısı
        const uniqueContacts = new Set();
        this.callRecords.forEach(record => {
            if (record['İsim Soyisim ( Diğer Numara)']) uniqueContacts.add(record['İsim Soyisim ( Diğer Numara)']);
            else if (record['DİĞER NUMARA']) uniqueContacts.add(record['DİĞER NUMARA']);
        });
        
        // İstatistikleri HTML içeriğine dönüştür
        statisticsSummary.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <div class="stat-item">
                        <h6>Toplam Arama</h6>
                        <p class="fs-4">${totalCalls}</p>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="stat-item">
                        <h6>Benzersiz Kişiler</h6>
                        <p class="fs-4">${uniqueContacts.size}</p>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="stat-item">
                        <h6>Toplam Konuşma Süresi</h6>
                        <p class="fs-4">${this.formatDuration(totalDuration)}</p>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="stat-item">
                        <h6>Ortalama Görüşme</h6>
                        <p class="fs-4">${this.formatDuration(avgDuration)}</p>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="stat-item text-primary">
                        <h6>Gelen Aramalar</h6>
                        <p class="fs-5">${incomingCalls}</p>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="stat-item text-success">
                        <h6>Giden Aramalar</h6>
                        <p class="fs-5">${outgoingCalls}</p>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="stat-item text-danger">
                        <h6>Cevapsız Aramalar</h6>
                        <p class="fs-5">${missedCalls}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Arama tiplerine göre dağılım grafiğini oluşturur
     */
    renderCallTypeDistribution() {
        const ctx = document.getElementById('callTypeChart').getContext('2d');
        
        // Arama tiplerini ve sayılarını hesapla
        const callTypes = {};
        this.callRecords.forEach(record => {
            const type = record['TİP'] || 'Bilinmiyor';
            callTypes[type] = (callTypes[type] || 0) + 1;
        });
        
        // Grafik veri seti oluştur
        const labels = Object.keys(callTypes);
        const data = Object.values(callTypes);
        const backgroundColor = this.colorPalette.slice(0, labels.length);
        
        // Grafiği oluştur
        this.charts.callType = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Zaman aralığına göre arama dağılımı grafiğini oluşturur
     */
    renderTimeDistribution() {
        const ctx = document.getElementById('timeDistributionChart').getContext('2d');
        this.updateTimeDistribution('daily');
    }
    
    /**
     * Zaman aralığını değiştirir (günlük, haftalık, aylık)
     */
    updateTimeDistribution(timeFrame) {
        this.currentTimeView = timeFrame;
        
        // UI güncelle
        document.getElementById('dailyBtn').classList.toggle('active', timeFrame === 'daily');
        document.getElementById('weeklyBtn').classList.toggle('active', timeFrame === 'weekly');
        document.getElementById('monthlyBtn').classList.toggle('active', timeFrame === 'monthly');
        
        // Veri setini oluştur
        let labels, data;
        
        if (timeFrame === 'daily') {
            ({ labels, data } = this.getDailyDistribution());
        } else if (timeFrame === 'weekly') {
            ({ labels, data } = this.getWeeklyDistribution());
        } else {
            ({ labels, data } = this.getMonthlyDistribution());
        }
        
        // Mevcut grafiği güncelle veya yeni oluştur
        if (this.charts.timeDistribution) {
            this.charts.timeDistribution.data.labels = labels;
            this.charts.timeDistribution.data.datasets[0].data = data.incoming;
            this.charts.timeDistribution.data.datasets[1].data = data.outgoing;
            this.charts.timeDistribution.data.datasets[2].data = data.missed;
            this.charts.timeDistribution.update();
        } else {
            const ctx = document.getElementById('timeDistributionChart').getContext('2d');
            this.charts.timeDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Gelen Aramalar',
                            data: data.incoming,
                            backgroundColor: 'rgba(78, 115, 223, 0.8)',
                            borderColor: 'rgba(78, 115, 223, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Giden Aramalar',
                            data: data.outgoing,
                            backgroundColor: 'rgba(28, 200, 138, 0.8)',
                            borderColor: 'rgba(28, 200, 138, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Cevapsız Aramalar',
                            data: data.missed,
                            backgroundColor: 'rgba(231, 74, 59, 0.8)',
                            borderColor: 'rgba(231, 74, 59, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Arama Sayısı'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: this.getTimeFrameLabel(timeFrame)
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Günlük dağılım verilerini hesaplar
     */
    getDailyDistribution() {
        // Saat bazında gruplandır (0-23)
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const labels = hours.map(hour => `${hour}:00`);
        
        // Veri setleri için boş diziler oluştur
        const incoming = Array(24).fill(0);
        const outgoing = Array(24).fill(0);
        const missed = Array(24).fill(0);
        
        // Arama kayıtlarını saat bazında gruplandır
        this.callRecords.forEach(record => {
            if (!record['TARİH']) return;
            
            try {
                const date = new Date(record['TARİH']);
                const hour = date.getHours();
                
                if (record['TİP'] && record['TİP'].includes('Gelen')) {
                    incoming[hour]++;
                } else if (record['TİP'] && record['TİP'].includes('aradı')) {
                    outgoing[hour]++;
                } else if (record['TİP'] && record['TİP'].includes('Cevapsız')) {
                    missed[hour]++;
                }
            } catch (e) {
                console.error('Tarih ayrıştırma hatası:', e);
            }
        });
        
        return { labels, data: { incoming, outgoing, missed } };
    }
    
    /**
     * Haftalık dağılım verilerini hesaplar
     */
    getWeeklyDistribution() {
        // Haftanın günleri
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        
        // Veri setleri için boş diziler oluştur
        const incoming = Array(7).fill(0);
        const outgoing = Array(7).fill(0);
        const missed = Array(7).fill(0);
        
        // Arama kayıtlarını haftanın günlerine göre gruplandır
        this.callRecords.forEach(record => {
            if (!record['TARİH']) return;
            
            try {
                const date = new Date(record['TARİH']);
                const dayOfWeek = date.getDay(); // 0=Pazar, 1=Pazartesi, ...
                
                if (record['TİP'] && record['TİP'].includes('Gelen')) {
                    incoming[dayOfWeek]++;
                } else if (record['TİP'] && record['TİP'].includes('aradı')) {
                    outgoing[dayOfWeek]++;
                } else if (record['TİP'] && record['TİP'].includes('Cevapsız')) {
                    missed[dayOfWeek]++;
                }
            } catch (e) {
                console.error('Tarih ayrıştırma hatası:', e);
            }
        });
        
        return { labels: days, data: { incoming, outgoing, missed } };
    }
    
    /**
     * Aylık dağılım verilerini hesaplar
     */
    getMonthlyDistribution() {
        // Aylar
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        // Veri setleri için boş diziler oluştur
        const incoming = Array(12).fill(0);
        const outgoing = Array(12).fill(0);
        const missed = Array(12).fill(0);
        
        // Arama kayıtlarını aylara göre gruplandır
        this.callRecords.forEach(record => {
            if (!record['TARİH']) return;
            
            try {
                const date = new Date(record['TARİH']);
                const month = date.getMonth(); // 0=Ocak, 1=Şubat, ...
                
                if (record['TİP'] && record['TİP'].includes('Gelen')) {
                    incoming[month]++;
                } else if (record['TİP'] && record['TİP'].includes('aradı')) {
                    outgoing[month]++;
                } else if (record['TİP'] && record['TİP'].includes('Cevapsız')) {
                    missed[month]++;
                }
            } catch (e) {
                console.error('Tarih ayrıştırma hatası:', e);
            }
        });
        
        return { labels: months, data: { incoming, outgoing, missed } };
    }
    
    /**
     * Zaman aralığı etiketini döndürür
     */
    getTimeFrameLabel(timeFrame) {
        switch (timeFrame) {
            case 'daily':
                return 'Saat';
            case 'weekly':
                return 'Haftanın Günü';
            case 'monthly':
                return 'Ay';
            default:
                return '';
        }
    }
    
    /**
     * En çok görüşülen kişilerin grafiğini oluşturur
     */
    renderTopContacts() {
        const ctx = document.getElementById('topContactsChart').getContext('2d');
        
        // Kişi bazında arama sayılarını hesapla
        const contactCounts = {};
        this.callRecords.forEach(record => {
            const contact = record['İsim Soyisim ( Diğer Numara)'] || record['DİĞER NUMARA'] || 'Bilinmiyor';
            contactCounts[contact] = (contactCounts[contact] || 0) + 1;
        });
        
        // En çok görüşülen 10 kişiyi bul
        const topContacts = Object.entries(contactCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Grafik verilerini oluştur
        const labels = topContacts.map(item => this.truncateText(item[0], 15));
        const data = topContacts.map(item => item[1]);
        
        // Grafiği oluştur
        this.charts.topContacts = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Arama Sayısı',
                    data: data,
                    backgroundColor: 'rgba(54, 185, 204, 0.8)',
                    borderColor: 'rgba(54, 185, 204, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Arama Sayısı'
                        }
                    }
                }
            }
        });
    }
    
    /**
     * En uzun görüşmelerin grafiğini oluşturur
     */
    renderLongestCalls() {
        const ctx = document.getElementById('longestCallsChart').getContext('2d');
        
        // Süresi olan aramalar
        const callsWithDuration = this.callRecords
            .filter(record => parseInt(record.salt_sure) > 0)
            .map(record => ({
                contact: record['İsim Soyisim ( Diğer Numara)'] || record['DİĞER NUMARA'] || 'Bilinmiyor',
                duration: parseInt(record.salt_sure) || 0,
                date: record['TARİH'] || '',
                type: record['TİP'] || 'Bilinmiyor'
            }));
        
        // En uzun görüşmeleri bul
        const longestCalls = callsWithDuration
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);
        
        // Grafik verilerini oluştur
        const labels = longestCalls.map(call => this.truncateText(call.contact, 15));
        const data = longestCalls.map(call => call.duration);
        
        // Grafiği oluştur
        this.charts.longestCalls = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Süre (saniye)',
                    data: data,
                    backgroundColor: 'rgba(246, 194, 62, 0.8)',
                    borderColor: 'rgba(246, 194, 62, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Süre (saniye)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const call = longestCalls[context.dataIndex];
                                return [
                                    `Süre: ${this.formatDuration(call.duration)}`,
                                    `Tip: ${call.type}`,
                                    `Tarih: ${call.date}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Arama sürelerinin dağılım grafiğini oluşturur
     */
    renderDurationDistribution() {
        const ctx = document.getElementById('durationDistributionChart').getContext('2d');
        
        // Aramalardan süreleri topla
        const durations = this.callRecords
            .filter(record => parseInt(record.salt_sure) > 0)
            .map(record => parseInt(record.salt_sure));
        
        // Süre aralıklarını belirle (saniye cinsinden)
        const durationRanges = [
            { min: 0, max: 30, label: '0-30 sn' },
            { min: 31, max: 60, label: '31-60 sn' },
            { min: 61, max: 120, label: '1-2 dk' },
            { min: 121, max: 300, label: '2-5 dk' },
            { min: 301, max: 600, label: '5-10 dk' },
            { min: 601, max: 1800, label: '10-30 dk' },
            { min: 1801, max: 3600, label: '30-60 dk' },
            { min: 3601, max: Infinity, label: '60+ dk' }
        ];
        
        // Her aralık için sayım yap
        const counts = durationRanges.map(range => {
            return durations.filter(d => d >= range.min && d <= range.max).length;
        });
        
        // Grafik verilerini oluştur
        const labels = durationRanges.map(range => range.label);
        
        // Grafiği oluştur
        this.charts.durationDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Arama Sayısı',
                    data: counts,
                    backgroundColor: 'rgba(78, 115, 223, 0.8)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Arama Sayısı'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Süre Aralığı'
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Zaman çizelgesini oluşturur
     */
    renderTimeline() {
        const timelineContainer = document.getElementById('timelineContainer');
        
        // Seçilen kişiye göre arama kayıtlarını filtrele
        let filteredRecords = this.callRecords;
        if (this.selectedPerson) {
            filteredRecords = this.callRecords.filter(record => record['İsim Soyisim ( Diğer Numara)'] === this.selectedPerson);
        }
        
        // Tarih sırasına göre sırala
        filteredRecords = filteredRecords
            .filter(record => record['TARİH'])
            .sort((a, b) => new Date(a['TARİH']) - new Date(b['TARİH']));
        
        // Zaman çizelgesi HTML'ini oluştur
        if (filteredRecords.length === 0) {
            timelineContainer.innerHTML = '<div class="alert alert-info">Seçilen kriterlere uygun kayıt bulunamadı.</div>';
            return;
        }
        
        let timelineHTML = '<div class="timeline">';
        
        // Her arama kaydı için bir zaman çizelgesi öğesi oluştur
        filteredRecords.forEach((record, index) => {
            const date = new Date(record.tarih);
            const formattedDate = this.formatDate(date);
            const formattedTime = this.formatTime(date);
            
            // Arama tipi için ikon ve renk seç
            let icon, colorClass;
            if (record.tip && record.tip.includes('Gelen')) {
                icon = '<i class="fas fa-phone-alt"></i>';
                colorClass = 'bg-primary';
            } else if (record.tip && record.tip.includes('Giden')) {
                icon = '<i class="fas fa-phone-volume"></i>';
                colorClass = 'bg-success';
            } else if (record.tip && record.tip.includes('Cevapsız')) {
                icon = '<i class="fas fa-phone-slash"></i>';
                colorClass = 'bg-danger';
            } else {
                icon = '<i class="fas fa-phone"></i>';
                colorClass = 'bg-secondary';
            }
            
            timelineHTML += `
                <div class="timeline-item">
                    <div class="timeline-date">
                        <div class="date">${formattedDate}</div>
                        <div class="time">${formattedTime}</div>
                    </div>
                    <div class="timeline-marker ${colorClass}">${icon}</div>
                    <div class="timeline-content">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${record.name || record.phone || 'Bilinmiyor'}</h5>
                                <p class="card-text">
                                    <span class="badge ${this.getCallTypeBadgeClass(record.tip)}">${record.tip || 'Bilinmiyor'}</span>
                                    ${parseInt(record.duration) > 0 ? `<span class="badge bg-info ms-2">${this.formatDuration(record.duration)}</span>` : ''}
                                </p>
                                <div class="small text-muted">
                                    ${record.phone ? `Numara: ${record.phone}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        timelineHTML += '</div>';
        timelineContainer.innerHTML = timelineHTML;
        
        // Zaman çizelgesi için gerekli CSS'i eklediğimizden emin ol
        this.ensureTimelineCSS();
    }
    
    /**
     * Zaman çizelgesi için CSS'i ekler
     */
    ensureTimelineCSS() {
        if (!document.getElementById('timeline-style')) {
            const style = document.createElement('style');
            style.id = 'timeline-style';
            style.textContent = `
                .timeline {
                    position: relative;
                    padding: 1rem 0;
                }
                
                .timeline::before {
                    content: '';
                    position: absolute;
                    height: 100%;
                    width: 2px;
                    left: calc(80px + 0.5rem);
                    background-color: #e9ecef;
                }
                
                .timeline-item {
                    display: flex;
                    margin-bottom: 1.5rem;
                }
                
                .timeline-date {
                    width: 80px;
                    text-align: right;
                    padding-right: 1rem;
                }
                
                .timeline-date .date {
                    font-weight: bold;
                    font-size: 0.8rem;
                }
                
                .timeline-date .time {
                    font-size: 0.75rem;
                    color: #6c757d;
                }
                
                .timeline-marker {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 50%;
                    color: white;
                    z-index: 1;
                    margin-right: 1rem;
                }
                
                .timeline-content {
                    flex: 1;
                }
                
                .timeline-content .card {
                    margin-top: -0.5rem;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Arama tipine göre badge sınıfını döndürür
     */
    getCallTypeBadgeClass(type) {
        if (!type) return 'bg-secondary';
        
        if (type.includes('Gelen')) return 'bg-primary';
        if (type.includes('Giden')) return 'bg-success';
        if (type.includes('Cevapsız')) return 'bg-danger';
        if (type.includes('Mesaj')) return 'bg-info';
        
        return 'bg-secondary';
    }
    
    /**
     * Metni belirli bir uzunlukta kısaltır
     */
    truncateText(text, maxLength) {
        if (!text) return 'Bilinmiyor';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    /**
     * Süreyi formatlar (saniyeden okunabilir formata)
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0 sn';
        
        seconds = parseInt(seconds);
        
        if (seconds < 60) {
            return `${seconds} sn`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes} dk${remainingSeconds > 0 ? ` ${remainingSeconds} sn` : ''}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} sa${minutes > 0 ? ` ${minutes} dk` : ''}`;
        }
    }
    
    /**
     * Tarihi formatlar (gün.ay.yıl)
     */
    formatDate(date) {
        if (!(date instanceof Date)) return '';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    }
    
    /**
     * Saati formatlar (saat:dakika)
     */
    formatTime(date) {
        if (!(date instanceof Date)) return '';
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    /**
     * Grafikleri yeniden boyutlandırır
     */
    resizeCharts() {
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 100);
    }
}

// Analiz modülünü ana script'e entegre etmek için export et
window.AnalyticsManager = AnalyticsManager;