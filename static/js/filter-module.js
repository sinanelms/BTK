/**
 * Modüler Filtre Sistemi
 * 
 * Bu dosya, uygulama için modüler filtre sistemini tanımlar.
 * Yeni filtreler eklemek veya mevcut filtreleri değiştirmek için
 * filter-config.js dosyasını kullanabilirsiniz.
 */

class FilterManager {
    constructor(config, products) {
        this.config = config;
        this.products = products;
        this.activeFilters = {};
        this.filteredProducts = [...products];
        this.filterRegistry = {
            categoryFilters: {},
            specialFilters: {},
            rangeFilters: {}
        };
        
        // DOM elemanları
        this.filterContainer = document.getElementById('dynamicFiltersContainer');
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.sortSelect = document.getElementById('sortSelect');
        this.resetButton = document.getElementById('resetFilters');
        
        // Sonuç alanları
        this.productsTable = document.getElementById('productsTable');
        this.productsGrid = document.getElementById('productsGrid');
        
        // Filtreleri başlat
        this.initializeFilters();
        this.setupEventListeners();
    }
    
    /**
     * Filtre konfigürasyonuna göre filtreleri oluşturur
     */
    initializeFilters() {
        // Aktif filtreler için boş başlangıç durumu
        this.resetActiveFilters();
        
        // Arama filtresi kurulumu
        const searchConfig = this.config.search;
        if (searchConfig) {
            document.getElementById('searchLabel').textContent = searchConfig.label;
            this.searchInput.placeholder = searchConfig.placeholder;
        }
        
        // Sıralama seçeneklerini kur
        this.setupSortOptions();
        
        // Kategori filtreleri (checkbox listesi)
        this.setupCategoryFilters();
        
        // Özel filtreler (boolean, özel işleme gerektiren)
        this.setupSpecialFilters();
        
        // Aralık filtreleri (slider, min-max)
        this.setupRangeFilters();
        
        // Tarih aralığı filtreleri
        this.setupDateRangeFilters();
    }
    
    /**
     * Sıralama seçeneklerini oluşturur
     */
    setupSortOptions() {
        // Sıralama seçeneklerini temizle
        this.sortSelect.innerHTML = '';
        
        // Konfigürasyondan sıralama seçeneklerini ekle
        this.config.sortOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.displayName;
            this.sortSelect.appendChild(optionElement);
        });
    }
    
    /**
     * Kategori filtrelerini oluşturur (checkbox listesi şeklinde)
     */
    setupCategoryFilters() {
        this.config.categoryFilters.forEach(filter => {
            // Benzersiz değerleri topla
            const values = [...new Set(this.products.map(p => p[filter.dataField]))];
            
            // Filtre için aktif filtreler nesnesini oluştur
            this.activeFilters[filter.key] = [];
            
            // Filtreyi kayıt defterine ekle
            this.filterRegistry.categoryFilters[filter.key] = {
                ...filter,
                values: values
            };
            
            // Filtreyi oluştur
            this.createCheckboxFilter(filter.id, filter.key, filter.displayName, values);
        });
    }
    
    /**
     * Özel filtreleri oluşturur (boolean, vs.)
     */
    setupSpecialFilters() {
        this.config.specialFilters.forEach(filter => {
            // Filtre için aktif filtreler nesnesini oluştur
            this.activeFilters[filter.key] = [];
            
            // Filtreyi kayıt defterine ekle
            this.filterRegistry.specialFilters[filter.key] = { ...filter };
            
            // Filtreyi oluştur (şimdilik sadece boolean tip)
            if (filter.type === 'boolean') {
                this.createBooleanFilter(filter);
            }
        });
    }
    
    /**
     * Aralık filtrelerini oluşturur (slider)
     */
    setupRangeFilters() {
        this.config.rangeFilters.forEach(filter => {
            // Aktif filtreler için min ve max anahtarlarını oluştur
            this.activeFilters[filter.minKey] = null;
            this.activeFilters[filter.maxKey] = null;
            
            // Filtreyi kayıt defterine ekle
            this.filterRegistry.rangeFilters[filter.key] = { ...filter };
            
            // Min/Max değerleri bul
            const values = this.products.map(p => p[filter.dataField]).filter(v => v !== undefined && v !== null);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            // Slider elementlerini al
            const rangeContainer = document.querySelector(`#${filter.id} .price-range`);
            const minInput = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            const maxInput = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            const minLabel = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
            const maxLabel = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
            const slider = document.getElementById(`${filter.key}-slider-range`);
            
            // Başlangıç değerlerini ayarla
            minInput.placeholder = this.formatValue(minValue, filter.format);
            maxInput.placeholder = this.formatValue(maxValue, filter.format);
            minLabel.textContent = this.formatValue(minValue, filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
            maxLabel.textContent = this.formatValue(maxValue, filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
            
            // jQuery UI slider'ı oluştur
            $(function() {
                $(`#${filter.key}-slider-range`).slider({
                    range: true,
                    min: minValue,
                    max: maxValue,
                    values: [minValue, maxValue],
                    slide: (event, ui) => {
                        // Input ve etiketleri güncelle
                        minInput.value = ui.values[0];
                        maxInput.value = ui.values[1];
                        minLabel.textContent = this.formatValue(ui.values[0], filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
                        maxLabel.textContent = this.formatValue(ui.values[1], filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
                        
                        // Aktif filtreleri güncelle
                        this.activeFilters[filter.minKey] = ui.values[0];
                        this.activeFilters[filter.maxKey] = ui.values[1];
                        
                        // Filtreleri uygula
                        this.applyFilters();
                    }
                });
            });
            
            // Input olayları için dinleyiciler ekle
            minInput.addEventListener('change', () => this.updateRangeFilter(filter));
            maxInput.addEventListener('change', () => this.updateRangeFilter(filter));
        });
    }
    
    /**
     * Tarih aralığı filtrelerini oluşturur
     */
    setupDateRangeFilters() {
        if (!this.config.dateRangeFilters) return;
        
        this.config.dateRangeFilters.forEach(filter => {
            // Aktif filtreler için başlangıç ve bitiş tarihlerini oluştur
            this.activeFilters[filter.startKey] = null;
            this.activeFilters[filter.endKey] = null;
            
            // Filter container'ını al veya oluştur
            let container = document.getElementById(filter.id);
            if (!container) {
                container = document.createElement('div');
                container.id = filter.id;
                container.className = 'filter-group mb-4';
                container.innerHTML = `
                    <h6>${filter.displayName}</h6>
                    <div class="date-range">
                        <div class="mb-2">
                            <label class="form-label small">Başlangıç Tarihi</label>
                            <input type="date" id="start${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}" class="form-control form-control-sm">
                        </div>
                        <div>
                            <label class="form-label small">Bitiş Tarihi</label>
                            <input type="date" id="end${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}" class="form-control form-control-sm">
                        </div>
                    </div>
                `;
                document.getElementById('dynamicFiltersContainer').appendChild(container);
            }
            
            // Başlangıç ve bitiş tarihlerini al
            const startDateInput = document.getElementById(`start${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            const endDateInput = document.getElementById(`end${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            
            // Olay dinleyicilerini ekle
            startDateInput.addEventListener('change', () => {
                this.activeFilters[filter.startKey] = startDateInput.value ? new Date(startDateInput.value) : null;
                this.applyFilters();
            });
            
            endDateInput.addEventListener('change', () => {
                this.activeFilters[filter.endKey] = endDateInput.value ? new Date(endDateInput.value) : null;
                this.applyFilters();
            });
        });
    }
    
    /**
     * Checkbox filtresi oluşturur
     */
    createCheckboxFilter(containerId, filterKey, displayName, values) {
        const container = document.querySelector(`#${containerId} .filter-checkboxes`);
        container.innerHTML = '';
        
        // Başlık güncelleme
        const header = document.querySelector(`#${containerId} h6`);
        if (header) {
            header.textContent = displayName;
        }
        
        // Checkbox'ları oluştur
        values.forEach(value => {
            const checkboxId = `${filterKey}-${value.toString().replace(/\s+/g, '').toLowerCase()}`;
            
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'filter-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = value;
            
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = value;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
            
            // Olay dinleyicisi ekle
            checkbox.addEventListener('change', () => {
                // Bu filtredeki tüm seçilmiş checkboxları al
                const checked = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
                this.activeFilters[filterKey] = Array.from(checked).map(cb => cb.value);
                this.applyFilters();
            });
        });
    }
    
    /**
     * Boolean filtresi oluşturur (örn. OC Edisyon)
     */
    createBooleanFilter(filter) {
        const container = document.querySelector(`#${filter.id} .filter-checkboxes`);
        container.innerHTML = '';
        
        // Başlık güncelleme
        const header = document.querySelector(`#${filter.id} h6`);
        if (header) {
            header.textContent = filter.displayName;
        }
        
        // True/False seçeneklerini oluştur
        container.innerHTML = `
            <div class="filter-checkbox">
                <input type="checkbox" id="${filter.key}-true" value="true">
                <label for="${filter.key}-true">${filter.trueLabel}</label>
            </div>
            <div class="filter-checkbox">
                <input type="checkbox" id="${filter.key}-false" value="false">
                <label for="${filter.key}-false">${filter.falseLabel}</label>
            </div>
        `;
        
        // Olay dinleyicilerini ekle
        document.querySelectorAll(`#${filter.id} input[type="checkbox"]`).forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checked = document.querySelectorAll(`#${filter.id} input[type="checkbox"]:checked`);
                this.activeFilters[filter.key] = Array.from(checked).map(cb => cb.value === 'true');
                this.applyFilters();
            });
        });
    }
    
    /**
     * Aralık filtrelerini günceller (input değişikliğinde)
     */
    updateRangeFilter(filter) {
        const minInput = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
        const maxInput = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
        const minLabel = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
        const maxLabel = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
        
        // Değerleri güncelle
        this.activeFilters[filter.minKey] = minInput.value ? parseFloat(minInput.value) : null;
        this.activeFilters[filter.maxKey] = maxInput.value ? parseFloat(maxInput.value) : null;
        
        // Slider pozisyonlarını güncelle
        if (this.activeFilters[filter.minKey] !== null && this.activeFilters[filter.maxKey] !== null) {
            $(`#${filter.key}-slider-range`).slider("values", [
                this.activeFilters[filter.minKey],
                this.activeFilters[filter.maxKey]
            ]);
        } else if (this.activeFilters[filter.minKey] !== null) {
            $(`#${filter.key}-slider-range`).slider("values", 0, this.activeFilters[filter.minKey]);
        } else if (this.activeFilters[filter.maxKey] !== null) {
            $(`#${filter.key}-slider-range`).slider("values", 1, this.activeFilters[filter.maxKey]);
        }
        
        // Etiketleri güncelle
        if (this.activeFilters[filter.minKey] !== null) {
            minLabel.textContent = this.formatValue(this.activeFilters[filter.minKey], filter.format) + 
                                  (filter.suffix ? ` ${filter.suffix}` : '');
        }
        
        if (this.activeFilters[filter.maxKey] !== null) {
            maxLabel.textContent = this.formatValue(this.activeFilters[filter.maxKey], filter.format) + 
                                  (filter.suffix ? ` ${filter.suffix}` : '');
        }
        
        this.applyFilters();
    }
    
    /**
     * Değeri formatlar (para birimi, vs.)
     */
    formatValue(value, format) {
        if (format === 'currency') {
            return value.toLocaleString('tr-TR');
        }
        return value;
    }
    
    /**
     * Olay dinleyicilerini ayarlar
     */
    setupEventListeners() {
        // Arama fonksiyonu
        this.searchButton.addEventListener('click', () => {
            this.activeFilters.search = this.searchInput.value.trim().toLowerCase();
            this.applyFilters();
        });
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.activeFilters.search = this.searchInput.value.trim().toLowerCase();
                this.applyFilters();
            }
        });
        
        // Filtreleri sıfırlama
        this.resetButton.addEventListener('click', () => this.resetFilters());
        
        // Sıralama seçimi
        this.sortSelect.addEventListener('change', () => {
            this.sortProducts(this.sortSelect.value);
        });
    }
    
    /**
     * Tüm filtreleri uygular
     */
    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            // Arama filtresi
            const searchConfig = this.config.search;
            if (this.activeFilters.search) {
                let matchesSearch = false;
                for (const field of searchConfig.searchFields) {
                    if (product[field] && product[field].toString().toLowerCase().includes(this.activeFilters.search)) {
                        matchesSearch = true;
                        break;
                    }
                }
                if (!matchesSearch) return false;
            }
            
            // Kategori filtreleri
            for (const filter of this.config.categoryFilters) {
                if (this.activeFilters[filter.key].length > 0 && 
                    !this.activeFilters[filter.key].includes(product[filter.dataField])) {
                    return false;
                }
            }
            
            // Özel filtreler
            for (const filter of this.config.specialFilters) {
                if (filter.type === 'boolean' && 
                    this.activeFilters[filter.key].length > 0 && 
                    !this.activeFilters[filter.key].includes(product[filter.dataField])) {
                    return false;
                }
            }
            
            // Aralık filtreleri
            for (const filter of this.config.rangeFilters) {
                if (this.activeFilters[filter.minKey] && product[filter.dataField] !== undefined &&
                    parseFloat(product[filter.dataField]) < this.activeFilters[filter.minKey]) {
                    return false;
                }
                if (this.activeFilters[filter.maxKey] && product[filter.dataField] !== undefined &&
                    parseFloat(product[filter.dataField]) > this.activeFilters[filter.maxKey]) {
                    return false;
                }
            }
            
            // Tarih aralığı filtreleri
            if (this.config.dateRangeFilters) {
                for (const filter of this.config.dateRangeFilters) {
                    const productDate = new Date(product[filter.dataField]);
                    
                    if (this.activeFilters[filter.startKey] && 
                        productDate < this.activeFilters[filter.startKey]) {
                        return false;
                    }
                    
                    if (this.activeFilters[filter.endKey]) {
                        // Bitiş tarihini günün sonuna ayarla (23:59:59)
                        const endDate = new Date(this.activeFilters[filter.endKey]);
                        endDate.setHours(23, 59, 59, 999);
                        
                        if (productDate > endDate) {
                            return false;
                        }
                    }
                }
            }
            
            return true;
        });
        
        // Aktif sıralamayı uygula
        if (this.sortSelect.value !== 'default') {
            this.sortProducts(this.sortSelect.value);
        } else {
            this.renderProducts();
        }
    }
    
    /**
     * Ürünleri sıralar
     */
    sortProducts(sortOption) {
        const sortConfig = this.config.sortOptions.find(opt => opt.id === sortOption);
        
        if (sortConfig && sortConfig.sortFunction) {
            this.filteredProducts.sort(sortConfig.sortFunction);
        }
        
        this.renderProducts();
    }
    
    /**
     * Arama kaydı listesini render eder
     */
    renderProducts() {
        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Önceki içeriği temizle
        this.productsTable.innerHTML = '';
        this.productsGrid.innerHTML = '';
        
        // Her arama kaydını render et
        this.filteredProducts.forEach(record => {
            // Tablo görünümüne ekle (masaüstü)
            const tableRow = document.createElement('tr');
            tableRow.className = 'record-row';
            
            // Görüşme türüne göre renk belirleme
            let typeColor = "primary";
            if (record['TİP'].includes("Mesaj")) {
                typeColor = "info";
            } else if (record['TİP'].includes("Görüntülü")) {
                typeColor = "success";
            } else if (record['TİP'].includes("Ödemeli")) {
                typeColor = "warning";
            }
            
            // Tarih formatı
            const recordDate = new Date(record['TARİH']);
            const formattedDate = recordDate.toLocaleString('tr-TR');
            
            tableRow.innerHTML = `
                <td>${record['SIRA NO']}</td>
                <td>${formattedDate}</td>
                <td><span class="badge bg-${typeColor}">${record['TİP']}</span></td>
                <td>${record['DİĞER NUMARA']}</td>
                <td>${record['İsim Soyisim ( Diğer Numara)']}</td>
                <td>${record['salt_sure']} sn</td>
            `;
            this.productsTable.appendChild(tableRow);
            
            // Izgara görünümüne ekle (mobil)
            const template = document.getElementById('productCardTemplate');
            const clone = document.importNode(template.content, true);
            
            // Verileri doldur
            clone.querySelector('.person-name').textContent = record['İsim Soyisim ( Diğer Numara)'];
            clone.querySelector('.phone-number').textContent = record['DİĞER NUMARA'];
            clone.querySelector('.date-time').textContent = formattedDate;
            clone.querySelector('.tc-number').textContent = 'TC: ' + record['TC Kimlik No (Diğer Numara)'];
            
            const callType = clone.querySelector('.call-type');
            callType.textContent = record['TİP'];
            callType.classList.add(`bg-${typeColor}`);
            
            const durationBadge = clone.querySelector('.duration-badge');
            durationBadge.textContent = record['salt_sure'] + ' sn';
            
            this.productsGrid.appendChild(clone);
        });
    }
    
    /**
     * Tüm filtreleri sıfırlar
     */
    resetFilters() {
        // Tüm filtre durumlarını sıfırla
        this.resetActiveFilters();
        
        // UI elemanlarını sıfırla
        this.searchInput.value = '';
        
        // Aralık filtrelerini sıfırla
        this.config.rangeFilters.forEach(filter => {
            const minInput = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            const maxInput = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}`);
            const minLabel = document.getElementById(`min${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
            const maxLabel = document.getElementById(`max${filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}Label`);
            
            minInput.value = '';
            maxInput.value = '';
            
            // Min/Max değerleri bul
            const values = this.products.map(p => p[filter.dataField]);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            // Slider'ı sıfırla
            $(`#${filter.key}-slider-range`).slider("values", [minValue, maxValue]);
            
            // Etiketleri güncelle
            minLabel.textContent = this.formatValue(minValue, filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
            maxLabel.textContent = this.formatValue(maxValue, filter.format) + (filter.suffix ? ` ${filter.suffix}` : '');
        });
        
        // Tüm checkbox'ları temizle
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Sıralama seçimini sıfırla
        this.sortSelect.value = 'default';
        
        // Filtrelenmiş ürünleri tüm ürünlere sıfırla
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }
    
    /**
     * Aktif filtreleri sıfırlar
     */
    resetActiveFilters() {
        // Temel filtreler
        this.activeFilters = {
            search: ''
        };
        
        // Kategori filtrelerini sıfırla
        this.config.categoryFilters.forEach(filter => {
            this.activeFilters[filter.key] = [];
        });
        
        // Özel filtreleri sıfırla
        this.config.specialFilters.forEach(filter => {
            this.activeFilters[filter.key] = [];
        });
        
        // Aralık filtrelerini sıfırla
        this.config.rangeFilters.forEach(filter => {
            this.activeFilters[filter.minKey] = null;
            this.activeFilters[filter.maxKey] = null;
        });
        
        // Tarih aralığı filtrelerini sıfırla
        if (this.config.dateRangeFilters) {
            this.config.dateRangeFilters.forEach(filter => {
                this.activeFilters[filter.startKey] = null;
                this.activeFilters[filter.endKey] = null;
            });
        }
    }
    
    /**
     * Boş durum mesajını gösterir
     */
    showEmptyState() {
        this.productsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h5>Arama Sonucu Bulunamadı</h5>
                        <p>Filtreleri değiştirerek tekrar deneyiniz.</p>
                    </div>
                </td>
            </tr>
        `;
        
        this.productsGrid.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h5>Arama Sonucu Bulunamadı</h5>
                            <p>Filtreleri değiştirerek tekrar deneyiniz.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Hata durumunu gösterir
     */
    showErrorState(message) {
        this.productsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h5>Hata Oluştu</h5>
                        <p>${message}</p>
                    </div>
                </td>
            </tr>
        `;
        
        this.productsGrid.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h5>Hata Oluştu</h5>
                            <p>${message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}