/**
 * Filtre yapılandırma dosyası
 * Bu dosya, uygulamanın filtre yapısını tanımlar.
 * Yeni filtreler eklemek veya mevcut filtreleri değiştirmek için bu dosyayı düzenleyin.
 */

const FILTER_CONFIG = {
    // Kategorik filtreler (checkbox filtreleri)
    categoryFilters: [
        {
            id: 'brandFilter',          // HTML container ID
            key: 'brand',               // Veri alanı ve aktif filtreler için kullanılacak anahtar
            displayName: 'Markalar',    // Filtre başlığı
            dataField: 'brand'          // Filtrelenecek veri alanı (ürün özelliği)
        },
        {
            id: 'seriesFilter',
            key: 'series',
            displayName: 'Seriler',
            dataField: 'series'
        },
        {
            id: 'memorySizeFilter',
            key: 'memorySize',
            displayName: 'Bellek Boyutu',
            dataField: 'memory_size'
        },
        {
            id: 'clockSpeedFilter',
            key: 'clockSpeed',
            displayName: 'Saat Hızı',
            dataField: 'clock_speed'
        }
    ],
    
    // Özel filtreler (örneğin, boolean değerler için özel işleme gerektiren filtreler)
    specialFilters: [
        {
            id: 'ocEditionFilter',
            key: 'ocEdition',
            displayName: 'OC Edisyon',
            type: 'boolean',
            trueLabel: 'OC Edisyon',
            falseLabel: 'Standart Edisyon',
            dataField: 'oc_edition'
        }
    ],
    
    // Aralık filtreleri (min-max değerli filtreler, örneğin fiyat aralığı)
    rangeFilters: [
        {
            id: 'priceFilter',
            key: 'price',
            displayName: 'Fiyat Aralığı',
            minKey: 'minPrice',   // Aktif filtreler için min değer anahtarı
            maxKey: 'maxPrice',   // Aktif filtreler için max değer anahtarı
            dataField: 'price',   // Filtrelenecek veri alanı
            format: 'currency',   // Formatlamak için kullanılacak format türü
            suffix: 'TL'         // Değer sonuna eklenecek metin
        }
    ],
    
    // Sıralama seçenekleri
    sortOptions: [
        {
            id: 'default',
            displayName: 'Listele/Sırala',
            sortFunction: null  // Varsayılan sıralama için null
        },
        {
            id: 'price-asc',
            displayName: 'Fiyat (Artan)',
            sortFunction: (a, b) => a.price - b.price
        },
        {
            id: 'price-desc',
            displayName: 'Fiyat (Azalan)',
            sortFunction: (a, b) => b.price - a.price
        },
        {
            id: 'performance-desc',
            displayName: 'Performans (Yüksek-Düşük)',
            sortFunction: (a, b) => b.performance_score - a.performance_score
        },
        {
            id: 'clock-desc',
            displayName: 'Saat Hızı (Yüksek-Düşük)',
            sortFunction: (a, b) => parseFloat(b.clock_speed) - parseFloat(a.clock_speed)
        }
    ],
    
    // Arama yapılandırması
    search: {
        id: 'searchInput',
        buttonId: 'searchButton',
        placeholder: 'arama yap...',
        label: 'Kategoride Ara',
        searchFields: ['product_name', 'model'] // Arama yapılacak alanlar
    }
};