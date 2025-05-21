import pandas as pd
import numpy as np
import os
import fitz  # PyMuPDF
from tabula import read_pdf
import json
from datetime import datetime
import glob

def read_pdf_until_second_match(pdf_path, search_text):
    """
    PDF dosyasını açıp belirli bir metnin ikinci kez geçtiği 
    sayfaya kadar olan sayfa aralığını döndürür.
    """
    doc = fitz.open(pdf_path)
    if len(doc) < 5:
        return "all"
    else:
        matched_pages = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            if search_text in text:
                matched_pages.append(page_num + 1)  # Sayfa numarasını kaydedin (+1 çünkü sayma 0'dan başlar)
            if len(matched_pages) == 2:  # İkinci eşleşmeyi bulduğumuzda döngüyü durdur
                break
        
        doc.close()
        return f"1-{matched_pages[1]}" if len(matched_pages) >= 2 else "all"

def process_pdf_to_dict(pdf_path):
    """
    PDF dosyasını işleyerek içinden telefon arama kayıtlarını çıkartan 
    ve çeşitli analizleri yapan fonksiyon.
    """
    result = {"success": False, "message": "", "data": {}}
    df = None # Initialize df to None
    
    try:
        # PDF dosyasını tabula ile okuyoruz
        try:
            df = read_pdf(pdf_path, pages=read_pdf_until_second_match(pdf_path, "SIRA NO"), 
                        multiple_tables=True, lattice=True, pandas_options={'header': None})
        except Exception as tabula_error:
            result["message"] = f"PDF'ten tablolar okunurken bir sorun oluştu. Dosya bozuk veya desteklenmeyen bir formatta olabilir. Detay: {str(tabula_error)}"
            return result

        # Temel tablo sayısı kontrolü
        if df is None or not isinstance(df, list) or len(df) < 2: # df can be None if tabula fails silently sometimes
            result["message"] = "PDF formatı uygun değil. Beklenen temel tablolar bulunamadı. Lütfen BTK'nın standart formatını kullandığınızdan emin olun."
            return result
            
        # df[1] (sorgulanan_bilgiler) tablo yapısı kontrolü
        if len(df) < 2 or df[1].empty or df[1].shape[0] < 1 or df[1].shape[1] < 1:
            result["message"] = "PDF yapısı bozuk: Sorgulanan bilgiler tablosu (df[1]) eksik veya hatalı."
            return result
        
        sorgulanan_bilgiler_text = ""
        try:
            sorgulanan_bilgiler_text = df[1].iloc[-1,-1]
        except IndexError:
            result["message"] = "PDF yapısı bozuk: Sorgulanan bilgiler tablosundaki (df[1]) PDF tipi bilgisine ulaşılamadı."
            return result

        # PDF içeriğini (tipini) kontrol ediyoruz
        expected_pdf_types = ("İletişimin Tespiti (Arama - Aranma - Mesaj Atma - Mesaj Alma)", 
                              'İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)')
        if sorgulanan_bilgiler_text not in expected_pdf_types:
            result["message"] = "PDF formatı desteklenmiyor. Sadece İletişim Tespiti (Arama-Aranma veya Aranma-Arama) formatı desteklenmektedir."
            return result
            
        # Abone bilgilerini işleme
        # tablo_all_kullanici'nin df[2:] kullanacağını ve df'nin en az 3 elemanı olması gerektiğini göz önünde bulundurun.
        if len(df) < 3:
            result["message"] = "PDF yapısı bozuk: Abone bilgileri için yeterli tablo bulunamadı (df[2] eksik)."
            return result
        tablo_all_kullanici = lambda df_list: 2 if len(df_list) <= 2 else next((i for i, d in enumerate(df_list[2:], start=2) if d.shape[1] > 0 and np.isin("SIRA NO", d.iloc[:, 0].values)), len(df_list))
        
        try:
            abone_bilgiler_end_index = tablo_all_kullanici(df)
            if abone_bilgiler_end_index <= 2 and (len(df) > 2 and not df[2].empty): # Eğer tablo_all_kullanici SIRA NO bulamazsa ve df[2] varsa, en azından onu almayı dene
                 abone_bilgiler_end_index = 3 # Sadece df[2]'yi alacak şekilde ayarla
            
            # Check if df[2] to abone_bilgiler_end_index actually contains DataFrames
            valid_dfs_for_concat_abone = [d for d in df[2:abone_bilgiler_end_index] if isinstance(d, pd.DataFrame) and not d.empty]
            if not valid_dfs_for_concat_abone:
                result["message"] = "PDF yapısı bozuk: Abone bilgileri tabloları (df[2] sonrası) boş veya bulunamadı."
                return result
            abone_bilgiler = pd.concat(valid_dfs_for_concat_abone, ignore_index=True)
        except Exception as e:
            result["message"] = f"Abone bilgileri işlenirken hata: {str(e)}"
            return result

        if abone_bilgiler.empty or abone_bilgiler.shape[0] < 2: # Başlık satırları için en az 2 satır beklenir
            result["message"] = "Abone bilgileri tablosu boş veya geçersiz yapıda."
            return result
        abone_bilgiler.replace('\r', ' ', regex=True, inplace=True)
        abone_bilgiler = abone_bilgiler.rename(columns=abone_bilgiler.iloc[1]).drop([0,1],axis=0).reset_index(drop=True)
        
        # GSM verilerini işleme
        # tablo_all'un df[3:] kullanacağını ve df'nin en az 4 elemanı olması gerektiğini göz önünde bulundurun.
        if len(df) < 4: # Aslında gsm_start_index'e bağlı
            result["message"] = "PDF yapısı bozuk: GSM verileri için yeterli tablo bulunamadı (df[3] eksik)."
            return result
        
        gsm_start_index = abone_bilgiler_end_index # GSM verileri abone bilgilerinden sonra başlar
        tablo_all = lambda df_list, start_idx: start_idx if len(df_list) <= start_idx else next((i for i, d in enumerate(df_list[start_idx:], start=start_idx) if d.shape[1] > 0 and np.isin("SIRA NO", d.iloc[:, 0].values)), len(df_list))
        
        try:
            gsm_end_index = tablo_all(df, gsm_start_index)
            # Check if df[gsm_start_index] to gsm_end_index actually contains DataFrames
            valid_dfs_for_concat_gsm = [d for d in df[gsm_start_index:gsm_end_index] if isinstance(d, pd.DataFrame) and not d.empty]
            if not valid_dfs_for_concat_gsm:
                result["message"] = "PDF yapısı bozuk: GSM kayıt tabloları boş veya bulunamadı."
                return result
            gsm = pd.concat(valid_dfs_for_concat_gsm, ignore_index=True)
        except Exception as e:
            result["message"] = f"GSM verileri işlenirken hata: {str(e)}"
            return result
            
        if gsm.empty or gsm.shape[0] < 2: # Başlık satırları için en az 2 satır beklenir
            result["message"] = "GSM kayıt tablosu boş veya geçersiz yapıda."
            return result
        gsm = gsm.rename(columns=gsm.iloc[1]).drop([0,1],axis=0).reset_index(drop=True)

        # Kritik sütun kontrolü (temel olanlar)
        required_columns = ['NUMARA', 'TİP', 'TARİH'] 
        for col in required_columns:
            if col not in gsm.columns:
                result["message"] = f"PDF'ten '{col}' sütunu okunamadı. Dosya formatı eksik veya hatalı."
                return result
        
        # Veri temizleme
        try:
            gsm["NUMARA"] = pd.to_numeric(gsm["NUMARA"], errors='coerce').fillna(0).astype('int64')
        except KeyError: # Bu zaten yukarıda kontrol edildi ama çift güvenlik
            result["message"] = "PDF'ten 'NUMARA' sütunu okunamadı veya işlenemedi."
            return result
        if 'TİP' in gsm.columns:
            gsm = gsm[~gsm["TİP"].str.contains("Yönlendirme", na=False)]
        else: # TİP sütunu yoksa bu kritik bir hatadır, yukarıda yakalanmalıydı.
            result["message"] = "PDF'ten 'TİP' sütunu okunamadı."
            return result
            
        gsm.fillna(0, inplace=True) # Fill all remaining NaNs with 0, proceed with caution
        
        # Tarih dönüşümleri ve diğer sütunları düzenleme
        try:
            gsm['TARİH'] = pd.to_datetime(gsm['TARİH'], dayfirst=True, errors='coerce')
            # Check if all dates are NaT after conversion, which might indicate a format issue
            if gsm['TARİH'].isnull().all() and not gsm.empty : # If not empty and all TARİH are NaT
                result["message"] = "TARİH sütunundaki değerler geçerli bir tarih formatına dönüştürülemedi. Lütfen tarih formatını kontrol edin (örn: DD.MM.YYYY)."
                return result
        except KeyError:
            result["message"] = "PDF'ten 'TARİH' sütunu okunamadı veya işlenemedi."
            return result

        # IMEI and SIRA NO are optional for core functionality but good to have
        if "IMEI" in gsm.columns:
            gsm["IMEI"] = pd.to_numeric(gsm["IMEI"], errors='coerce').fillna(0).astype('int64')
        if "SIRA NO" in gsm.columns:
            gsm["SIRA NO"] = pd.to_numeric(gsm["SIRA NO"], errors='coerce').fillna(0).astype('int64')
        
        # Süre bilgisini saniye cinsine çevirme
        gsm['salt_sure'] = 0
        if 'SÜRE' in gsm.columns:
            gsm['salt_sure'] = gsm["SÜRE"].astype(str).str.extract(r'(\d+)').astype(float).fillna(0).astype(int)
        
        # Aranma durumunda sütunları düzenleme
        if sorgulanan_bilgiler_text == 'İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)':
            # Ensure 'DİĞER NUMARA' exists before trying to swap
            if 'DİĞER NUMARA' not in gsm.columns:
                result["message"] = "Aranma tipi PDF'te 'DİĞER NUMARA' sütunu bulunamadı. Sütun değişimi yapılamıyor."
                return result
            gsm[['NUMARA', 'DİĞER NUMARA']] = gsm[['DİĞER NUMARA', 'NUMARA']]
            
            # Rename columns carefully, checking if they exist
            rename_map_aranma = {
                "İsim Soyisim (  Numara)": "İsim Soyisim ( Diğer Numara)",
                "TC Kimlik No ( Numara)" :"TC Kimlik No (Diğer Numara)", 
                "IMEI": "IMEIL(Diğer Numara)", # Note: This renames the original IMEI after it might have been processed
                "BAZ (Numara)": "BAZ (Diğer Numara)"
            }
            # Filter out columns that don't exist in gsm from the rename_map
            actual_rename_map = {k: v for k, v in rename_map_aranma.items() if k in gsm.columns}
            gsm.rename(columns=actual_rename_map, inplace=True)

        # Dataframe'i CSV olarak saklama
        csv_path = pdf_path.replace('.pdf', '.csv')
        gsm.to_csv(csv_path, index=False, encoding='utf-8-sig')
        
        result["success"] = True
        result["message"] = "PDF başarıyla işlendi ve CSV'ye dönüştürüldü."
        result["data"]["csv_path"] = csv_path
        result["data"]["record_count"] = len(gsm)
            
    except Exception as e:
        # Log the full traceback for unexpected errors
        import traceback
        error_trace = traceback.format_exc()
        # print(f"Unexpected error in PDF processing: {error_trace}") # For server logs
        result["message"] = f"PDF işlenirken beklenmedik bir hata oluştu. Lütfen sistem yöneticisi ile iletişime geçin. Hata: {str(e)}"
    
    return result

def get_uploaded_pdfs():
    """
    Yüklenmiş PDF dosyalarının listesini döndürür
    """
    pdf_files = glob.glob('uploads/pdf/*.pdf')
    pdf_info = []
    
    for pdf_file in pdf_files:
        filename = os.path.basename(pdf_file)
        upload_time = datetime.fromtimestamp(os.path.getctime(pdf_file)).strftime('%d.%m.%Y %H:%M:%S')
        
        # CSV dönüşümü var mı kontrol et
        csv_file = pdf_file.replace('.pdf', '.csv')
        converted = os.path.exists(csv_file)
        
        pdf_info.append({
            "filename": filename,
            "path": pdf_file,
            "upload_time": upload_time,
            "converted": converted,
            "csv_path": csv_file if converted else None
        })
    
    # En son yüklenen en üstte olacak şekilde sırala
    pdf_info.sort(key=lambda x: x["upload_time"], reverse=True)
    
    return pdf_info