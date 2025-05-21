// Global variables
let allData = []; // Renamed from allProducts to be more generic

// Filtre yöneticisi
let filterManager = null;

// Analiz yöneticisi
let analyticsManager = null;

// Dışa aktarma yöneticisi
let exportManager = null;

// DOM elements
const productsTable = document.getElementById('productsTable'); // This might be used by FilterManager/AnalyticsManager
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resetFiltersButton = document.getElementById('resetFilters');
// const sortSelect = document.getElementById('sortSelect'); // Removed, sorting handled by modules
const tableViewBtn = document.getElementById('tableViewBtn');
const analysisViewBtn = document.getElementById('analysisViewBtn');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch the call records data
    fetchCallRecords();
    
    // Setup dark mode
    setupDarkMode();

    // Setup main event listeners
    setupGlobalEventListeners();
});

// Fetch call records data from API
function fetchCallRecords() { // Renamed from fetchProducts
    // URL'den csv_path parametresini al (eğer varsa)
    const urlParams = new URLSearchParams(window.location.search);
    const csvPath = urlParams.get('csv_path');
    
    // API endpoint'ini oluştur (csv_path varsa ekle)
    const apiUrl = csvPath ? `/api/data?csv_path=${encodeURIComponent(csvPath)}` : '/api/data';
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allData = data.items;
            
            console.log("Call records loaded:", allData.length);
            
            // Initialize filter manager with configuration
            // Assuming FILTER_CONFIG is defined in filter-config.js and loaded in index.html
            filterManager = new FilterManager(FILTER_CONFIG, allData, renderCallRecords); 
            
            // Initialize analytics manager
            // AnalyticsManager might need a reference to the container or a render function
            analyticsManager = new AnalyticsManager(allData); 
            
            // Initialize export manager (dışa aktarma modülü)
            // Ensure ExportManager gets currently filtered data from FilterManager
            exportManager = new ExportManager(() => filterManager.getFilteredData()); 
            
            // Add event listeners for the view switch buttons
            setupViewSwitchEvents();

            // Initial render of data by FilterManager
            filterManager.applyFilters(); // This should trigger initial rendering via callback
        })
        .catch(error => {
            console.error('Error fetching call records:', error);
            showErrorState('Arama kayıtları yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        });
}

// Set up global event listeners (search, reset)
function setupGlobalEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', () => {
        if (filterManager) {
            filterManager.setSearchQuery(searchInput.value.trim());
            filterManager.applyFilters();
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (filterManager) {
                filterManager.setSearchQuery(searchInput.value.trim());
                filterManager.applyFilters();
            }
        }
    });
    
    // Reset filters
    resetFiltersButton.addEventListener('click', () => {
        if (filterManager) {
            filterManager.resetFilters(); // This should also trigger a re-render
        }
        searchInput.value = ''; // Reset main search input
    });
}

// Removed setupFilters, createCheckboxFilters, setupPriceRange, updatePriceFilter, applyFilters (script.js version)
// Removed sortProducts

// Render call records in the table
// This function will be called by FilterManager with the filtered data.
function renderCallRecords(records) {
    // If productsTable is null, it means we are in analysis view or table is not available
    if (!productsTable) {
        console.warn("productsTable element not found. Skipping render.");
        return;
    }

    if (records.length === 0) {
        showEmptyState();
        return;
    }
    
    // Clear previous content
    productsTable.innerHTML = ''; // Keep this if productsTable is the target
    // productsGrid.innerHTML = ''; // Removed productsGrid logic

    // Create table header (optional, could be static in HTML)
    const thead = productsTable.createTHead();
    const headerRow = thead.insertRow();
    // Example headers - adjust based on actual data and desired columns
    // This should ideally match the columns defined in filter-config.js or be dynamic
    const headers = ['SIRA NO', 'TARİH', 'TİP', 'NUMARA', 'İsim Soyisim', 'salt_sure'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = productsTable.createTBody();
    // Render each record
    records.forEach(record => {
        const row = tbody.insertRow();
        // Adjust cell content based on actual record fields
        row.insertCell().textContent = record['SIRA NO'] || '';
        row.insertCell().textContent = record['TARİH'] || '';
        row.insertCell().textContent = record['TİP'] || '';
        row.insertCell().textContent = record['NUMARA'] || record['DİĞER NUMARA'] || ''; // Handle potential variations
        row.insertCell().textContent = record['İsim Soyisim'] || '';
        row.insertCell().textContent = record['salt_sure'] || '';
    });
}

// Removed formatPrice

// Show empty state when no records match filters
function showEmptyState() {
    if (productsTable) {
        productsTable.innerHTML = `
            <tr>
                <td colspan="6"> {/* Adjusted colspan to match new header count */}
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h5>Kayıt Bulunamadı</h5>
                        <p>Filtreleri değiştirerek tekrar deneyiniz.</p>
                    </div>
                </td>
            </tr>
        `;
    }
    // Removed productsGrid related message
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
    if (productsTable) { // Add check for productsTable
        productsTable.innerHTML = `
            <tr>
                <td colspan="6"> {/* Adjusted colspan */}
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                    <h5>Hata Oluştu</h5>
                    <p>${message}</p>
                </div>
            </td>
        </tr>
        `;
    } else {
        // If productsTable is not available (e.g. analysis view), log error to console
        console.error("Error state: " + message);
    }
    // Removed productsGrid related message
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
