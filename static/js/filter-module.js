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
            const values = this.products.map(p => p[filter.dataField]);
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
                    if (product[field].toLowerCase().includes(this.activeFilters.search)) {
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
                if (this.activeFilters[filter.minKey] && 
                    product[filter.dataField] < this.activeFilters[filter.minKey]) {
                    return false;
                }
                if (this.activeFilters[filter.maxKey] && 
                    product[filter.dataField] > this.activeFilters[filter.maxKey]) {
                    return false;
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
     * Ürün listesini render eder
     */
    renderProducts() {
        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Önceki içeriği temizle
        this.productsTable.innerHTML = '';
        this.productsGrid.innerHTML = '';
        
        // Her ürünü render et
        this.filteredProducts.forEach(product => {
            // Tablo görünümüne ekle (masaüstü)
            const tableRow = document.createElement('tr');
            tableRow.className = 'product-row';
            tableRow.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${product.image_url}" alt="${product.product_name}" class="table-product-image">
                        <div>
                            <div class="fw-bold">${product.product_name}</div>
                            <small class="text-muted">${product.model}</small>
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-danger">${this.formatValue(product.price, 'currency')} ${product.currency}</td>
                <td>${product.memory_size}</td>
                <td>${product.clock_speed}</td>
                <td>
                    <div class="badge bg-${product.performance_score >= 95 ? 'success' : 'warning'} rounded-circle p-2">
                        ${product.performance_score}
                    </div>
                </td>
            `;
            this.productsTable.appendChild(tableRow);
            
            // Izgara görünümüne ekle (mobil)
            const template = document.getElementById('productCardTemplate');
            const clone = document.importNode(template.content, true);
            
            // Verileri doldur
            clone.querySelector('.product-image').src = product.image_url;
            clone.querySelector('.product-image').alt = product.product_name;
            clone.querySelector('.product-name').textContent = product.product_name;
            clone.querySelector('.product-model').textContent = product.model;
            clone.querySelector('.product-price').textContent = `${this.formatValue(product.price, 'currency')} ${product.currency}`;
            
            const badge = clone.querySelector('.performance-badge');
            badge.textContent = product.performance_score;
            badge.classList.add(product.performance_score >= 95 ? 'bg-success' : 'bg-warning');
            
            clone.querySelector('.memory-size').textContent = product.memory_size;
            clone.querySelector('.clock-speed').textContent = product.clock_speed;
            
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
    }
    
    /**
     * Boş durum mesajını gösterir
     */
    showEmptyState() {
        this.productsTable.innerHTML = `
            <tr>
                <td colspan="5">
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
                <td colspan="5">
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