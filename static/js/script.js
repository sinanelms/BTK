// Global variables
let allProducts = [];
let filteredProducts = [];

// Filtre yöneticisi
let filterManager = null;

// Analiz yöneticisi
let analyticsManager = null;

// Dışa aktarma yöneticisi
let exportManager = null;

// DOM elements
const productsTable = document.getElementById('productsTable');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resetFiltersButton = document.getElementById('resetFilters');
const sortSelect = document.getElementById('sortSelect');
const tableViewBtn = document.getElementById('tableViewBtn');
const analysisViewBtn = document.getElementById('analysisViewBtn');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch the product data
    fetchProducts();
    
    // Setup dark mode
    setupDarkMode();
});

// Fetch call records data from API
function fetchProducts() {
    fetch('/api/data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allProducts = data.items;
            filteredProducts = [...allProducts];
            
            console.log("Call records loaded:", allProducts.length);
            
            // Initialize filter manager with configuration
            filterManager = new FilterManager(FILTER_CONFIG, allProducts);
            
            // Initialize analytics manager
            analyticsManager = new AnalyticsManager(allProducts);
            
            // Initialize export manager (dışa aktarma modülü)
            exportManager = new ExportManager(() => filterManager.filteredProducts);
            
            // Add event listeners for the view switch buttons
            setupViewSwitchEvents();
        })
        .catch(error => {
            console.error('Error fetching call records:', error);
            showErrorState('Arama kayıtları yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        });
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', () => {
        activeFilters.search = searchInput.value.trim().toLowerCase();
        applyFilters();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            activeFilters.search = searchInput.value.trim().toLowerCase();
            applyFilters();
        }
    });
    
    // Reset filters
    resetFiltersButton.addEventListener('click', resetFilters);
    
    // Sort selection
    sortSelect.addEventListener('change', () => {
        sortProducts(sortSelect.value);
    });
    
    // Price range inputs
    minPriceInput.addEventListener('change', updatePriceFilter);
    maxPriceInput.addEventListener('change', updatePriceFilter);
}

// Set up the dynamic filters based on product data
function setupFilters() {
    // Extract unique values for each filter
    const brands = [...new Set(allProducts.map(p => p.brand))];
    const series = [...new Set(allProducts.map(p => p.series))];
    const memorySizes = [...new Set(allProducts.map(p => p.memory_size))];
    const clockSpeeds = [...new Set(allProducts.map(p => p.clock_speed))];
    
    // Create filter checkboxes
    createCheckboxFilters('brandFilter', 'brand', brands);
    createCheckboxFilters('seriesFilter', 'series', series);
    createCheckboxFilters('memorySizeFilter', 'memorySize', memorySizes);
    createCheckboxFilters('clockSpeedFilter', 'clockSpeed', clockSpeeds);
    
    // Create OC Edition filter (true/false)
    const ocContainer = document.querySelector('#ocEditionFilter .filter-checkboxes');
    ocContainer.innerHTML = `
        <div class="filter-checkbox">
            <input type="checkbox" id="ocEdition-true" value="true">
            <label for="ocEdition-true">OC Edisyon</label>
        </div>
        <div class="filter-checkbox">
            <input type="checkbox" id="ocEdition-false" value="false">
            <label for="ocEdition-false">Standart Edisyon</label>
        </div>
    `;
    
    // Add event listeners to OC Edition checkboxes
    document.querySelectorAll('#ocEditionFilter input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checked = document.querySelectorAll('#ocEditionFilter input[type="checkbox"]:checked');
            activeFilters.ocEdition = Array.from(checked).map(cb => cb.value === 'true');
            applyFilters();
        });
    });
}

// Create checkbox filters for a given category
function createCheckboxFilters(containerId, filterKey, values) {
    const container = document.querySelector(`#${containerId} .filter-checkboxes`);
    container.innerHTML = '';
    
    values.forEach(value => {
        const checkboxId = `${filterKey}-${value.replace(/\s+/g, '').toLowerCase()}`;
        
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
        
        // Add event listener
        checkbox.addEventListener('change', () => {
            // Get all checked checkboxes in this filter group
            const checked = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
            activeFilters[filterKey] = Array.from(checked).map(cb => cb.value);
            applyFilters();
        });
    });
}

// Set up the price range filter
function setupPriceRange() {
    // Find min and max prices from all products
    const prices = allProducts.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Set placeholder values for inputs
    minPriceInput.placeholder = formatPrice(minPrice);
    maxPriceInput.placeholder = formatPrice(maxPrice);
    
    // Set initial label values
    minPriceLabel.textContent = formatPrice(minPrice) + " TL";
    maxPriceLabel.textContent = formatPrice(maxPrice) + " TL";
    
    // Initialize jQuery UI slider
    $(function() {
        $("#price-slider-range").slider({
            range: true,
            min: minPrice,
            max: maxPrice,
            values: [minPrice, maxPrice],
            slide: function(event, ui) {
                // Update input fields and labels
                minPriceInput.value = ui.values[0];
                maxPriceInput.value = ui.values[1];
                minPriceLabel.textContent = formatPrice(ui.values[0]) + " TL";
                maxPriceLabel.textContent = formatPrice(ui.values[1]) + " TL";
                
                // Update active filters
                activeFilters.minPrice = ui.values[0];
                activeFilters.maxPrice = ui.values[1];
                
                // Apply filters
                applyFilters();
            }
        });
    });
}

// Handle price filter updates from min/max inputs
function updatePriceFilter() {
    activeFilters.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    activeFilters.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
    
    // Update slider positions if input values change
    if (activeFilters.minPrice !== null && activeFilters.maxPrice !== null) {
        $("#price-slider-range").slider("values", [
            activeFilters.minPrice,
            activeFilters.maxPrice
        ]);
    } else if (activeFilters.minPrice !== null) {
        $("#price-slider-range").slider("values", 0, activeFilters.minPrice);
    } else if (activeFilters.maxPrice !== null) {
        $("#price-slider-range").slider("values", 1, activeFilters.maxPrice);
    }
    
    // Update labels
    if (activeFilters.minPrice !== null) {
        minPriceLabel.textContent = formatPrice(activeFilters.minPrice) + " TL";
    }
    
    if (activeFilters.maxPrice !== null) {
        maxPriceLabel.textContent = formatPrice(activeFilters.maxPrice) + " TL";
    }
    
    applyFilters();
}

// Apply all active filters to the products
function applyFilters() {
    filteredProducts = allProducts.filter(product => {
        // Search filter
        if (activeFilters.search && !product.product_name.toLowerCase().includes(activeFilters.search) && 
            !product.model.toLowerCase().includes(activeFilters.search)) {
            return false;
        }
        
        // Brand filter
        if (activeFilters.brand.length > 0 && !activeFilters.brand.includes(product.brand)) {
            return false;
        }
        
        // Series filter
        if (activeFilters.series.length > 0 && !activeFilters.series.includes(product.series)) {
            return false;
        }
        
        // Price range filter
        if (activeFilters.minPrice && product.price < activeFilters.minPrice) {
            return false;
        }
        if (activeFilters.maxPrice && product.price > activeFilters.maxPrice) {
            return false;
        }
        
        // Memory size filter
        if (activeFilters.memorySize.length > 0 && !activeFilters.memorySize.includes(product.memory_size)) {
            return false;
        }
        
        // Clock speed filter
        if (activeFilters.clockSpeed.length > 0 && !activeFilters.clockSpeed.includes(product.clock_speed)) {
            return false;
        }
        
        // OC Edition filter
        if (activeFilters.ocEdition.length > 0 && !activeFilters.ocEdition.includes(product.oc_edition)) {
            return false;
        }
        
        return true;
    });
    
    // Apply any active sorting
    if (sortSelect.value !== 'default') {
        sortProducts(sortSelect.value);
    } else {
        renderProducts();
    }
}

// Reset all filters to initial state
function resetFilters() {
    // Clear all filter states
    activeFilters = {
        search: '',
        brand: [],
        series: [],
        minPrice: null,
        maxPrice: null,
        memorySize: [],
        clockSpeed: [],
        ocEdition: []
    };
    
    // Reset UI elements
    searchInput.value = '';
    minPriceInput.value = '';
    maxPriceInput.value = '';
    
    // Reset price range sliders
    const prices = allProducts.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Reset slider
    $("#price-slider-range").slider("values", [minPrice, maxPrice]);
    
    // Update price labels
    minPriceLabel.textContent = formatPrice(minPrice) + " TL";
    maxPriceLabel.textContent = formatPrice(maxPrice) + " TL";
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset sort selection
    sortSelect.value = 'default';
    
    // Reset the filtered products to all products
    filteredProducts = [...allProducts];
    renderProducts();
}

// Sort products based on the selected option
function sortProducts(sortOption) {
    switch (sortOption) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'performance-desc':
            filteredProducts.sort((a, b) => b.performance_score - a.performance_score);
            break;
        case 'clock-desc':
            filteredProducts.sort((a, b) => {
                return parseFloat(b.clock_speed) - parseFloat(a.clock_speed);
            });
            break;
        default:
            // No sorting, use default order
            break;
    }
    
    renderProducts();
}

// Render products in table and grid views
function renderProducts() {
    if (filteredProducts.length === 0) {
        showEmptyState();
        return;
    }
    
    // Clear previous content
    productsTable.innerHTML = '';
    productsGrid.innerHTML = '';
    
    // Render each product
    filteredProducts.forEach(product => {
        // Add to table (desktop view)
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
            <td class="fw-bold text-danger">${formatPrice(product.price)} ${product.currency}</td>
            <td>${product.memory_size}</td>
            <td>${product.clock_speed}</td>
            <td>
                <div class="badge bg-${product.performance_score >= 95 ? 'success' : 'warning'} rounded-circle p-2">
                    ${product.performance_score}
                </div>
            </td>
        `;
        productsTable.appendChild(tableRow);
        
        // Add to grid (mobile view)
        const template = document.getElementById('productCardTemplate');
        const clone = document.importNode(template.content, true);
        
        // Fill in the data
        clone.querySelector('.product-image').src = product.image_url;
        clone.querySelector('.product-image').alt = product.product_name;
        clone.querySelector('.product-name').textContent = product.product_name;
        clone.querySelector('.product-model').textContent = product.model;
        clone.querySelector('.product-price').textContent = `${formatPrice(product.price)} ${product.currency}`;
        
        const badge = clone.querySelector('.performance-badge');
        badge.textContent = product.performance_score;
        badge.classList.add(product.performance_score >= 95 ? 'bg-success' : 'bg-warning');
        
        clone.querySelector('.memory-size').textContent = product.memory_size;
        clone.querySelector('.clock-speed').textContent = product.clock_speed;
        
        productsGrid.appendChild(clone);
    });
}

// Format price with thousands separator
function formatPrice(price) {
    return price.toLocaleString('tr-TR');
}

// Show empty state when no products match filters
function showEmptyState() {
    productsTable.innerHTML = `
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
    
    productsGrid.innerHTML = `
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
 * Tablo ve Analiz görünümleri arasında geçiş için
 * olay dinleyicilerini ayarlar
 */
function setupViewSwitchEvents() {
    // Tablo görünümüne geçiş
    tableViewBtn.addEventListener('click', () => {
        if (analyticsManager) {
            analyticsManager.switchView('table');
        }
    });
    
    // Analiz görünümüne geçiş
    analysisViewBtn.addEventListener('click', () => {
        if (analyticsManager) {
            analyticsManager.switchView('analysis');
        }
    });
}

// Show error state
function showErrorState(message) {
    productsTable.innerHTML = `
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
    
    productsGrid.innerHTML = `
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

// Setup dark mode functionality
function setupDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    const darkIcon = document.getElementById('darkIcon');
    const lightIcon = document.getElementById('lightIcon');
    const darkModeStylesheet = document.getElementById('dark-mode-style');
    const body = document.body;
    
    // Check if user has a preference saved
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Initialize based on saved preference
    if (isDarkMode) {
        enableDarkMode();
    }
    
    // Toggle dark/light mode
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });
    
    // Function to enable dark mode
    function enableDarkMode() {
        body.classList.add('dark-mode');
        darkModeStylesheet.disabled = false;
        darkIcon.classList.add('d-none');
        lightIcon.classList.remove('d-none');
        localStorage.setItem('darkMode', 'true');
    }
    
    // Function to disable dark mode
    function disableDarkMode() {
        body.classList.remove('dark-mode');
        darkModeStylesheet.disabled = true;
        darkIcon.classList.remove('d-none');
        lightIcon.classList.add('d-none');
        localStorage.setItem('darkMode', 'false');
    }
}
