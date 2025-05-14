/**
 * Filtre yapılandırma dosyası
 * Bu dosya, uygulamanın filtre yapısını tanımlar.
 * Yeni filtreler eklemek veya mevcut filtreleri değiştirmek için bu dosyayı düzenleyin.
 */

const FILTER_CONFIG = {
    // Kategorik filtreler (checkbox filtreleri)
    categoryFilters: [
        {
            id: 'tipFilter',          // HTML container ID
            key: 'callType',          // Veri alanı ve aktif filtreler için kullanılacak anahtar
            displayName: 'Arama Tipi', // Filtre başlığı
            dataField: 'TİP'          // Filtrelenecek veri alanı (CSV sütun adı)
        },
        {
            id: 'nameFilter',
            key: 'personName',
            displayName: 'İsim Soyisim',
            dataField: 'İsim Soyisim ( Diğer Numara)'
        }
    ],
    
    // Özel filtreler
    specialFilters: [],
    
    // Aralık filtreleri (min-max değerli filtreler)
    rangeFilters: [
        {
            id: 'durationFilter',
            key: 'duration',
            displayName: 'Görüşme Süresi',
            minKey: 'minDuration',      // Aktif filtreler için min değer anahtarı
            maxKey: 'maxDuration',      // Aktif filtreler için max değer anahtarı
            dataField: 'salt_sure',     // Filtrelenecek veri alanı
            format: 'number',           // Formatlamak için kullanılacak format türü
            suffix: 'sn'                // Değer sonuna eklenecek metin
        }
    ],
    
    // Tarih aralığı filtresi
    dateRangeFilters: [
        {
            id: 'dateFilter',
            key: 'date',
            displayName: 'Tarih Aralığı',
            startKey: 'startDate',    // Aktif filtreler için başlangıç tarihi anahtarı
            endKey: 'endDate',        // Aktif filtreler için bitiş tarihi anahtarı
            dataField: 'TARİH',       // Filtrelenecek veri alanı
            format: 'date'            // Formatlamak için kullanılacak format türü
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
            id: 'date-asc',
            displayName: 'Tarih (Eskiden Yeniye)',
            sortFunction: (a, b) => new Date(a.TARİH) - new Date(b.TARİH)
        },
        {
            id: 'date-desc',
            displayName: 'Tarih (Yeniden Eskiye)',
            sortFunction: (a, b) => new Date(b.TARİH) - new Date(a.TARİH)
        },
        {
            id: 'duration-asc',
            displayName: 'Süre (Artan)',
            sortFunction: (a, b) => parseInt(a.salt_sure) - parseInt(b.salt_sure)
        },
        {
            id: 'duration-desc',
            displayName: 'Süre (Azalan)',
            sortFunction: (a, b) => parseInt(b.salt_sure) - parseInt(a.salt_sure)
        }
    ],
    
    // Arama yapılandırması
    search: {
        id: 'searchInput',
        buttonId: 'searchButton',
        placeholder: 'telefon, isim veya TC ara...',
        label: 'Aramada Ara',
        searchFields: ['DİĞER NUMARA', 'İsim Soyisim ( Diğer Numara)', 'TC Kimlik No (Diğer Numara)'] // Arama yapılacak alanlar
    }
};