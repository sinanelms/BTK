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
    
    try:
        # PDF dosyasını tabula ile okuyoruz
        df = read_pdf(pdf_path, pages=read_pdf_until_second_match(pdf_path, "SIRA NO"), 
                    multiple_tables=True, lattice=True, pandas_options={'header': None})
        
        # İlk bilgileri alıyoruz
        if len(df) < 2:
            result["message"] = "PDF formatı uygun değil. Gerekli tablolar bulunamadı."
            return result
            
        sorgulanan_bilgiler = df[1]
        
        # PDF içeriğini kontrol ediyoruz
        if len(df) >= 2 and (df[1].iloc[-1,-1] in ("İletişimin Tespiti (Arama - Aranma - Mesaj Atma - Mesaj Alma)", 
                                                   'İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)')):
            # Abone bilgilerini işleme
            tablo_all_kullanici = lambda df: 2 if len(df) <= 2 else next((i for i, d in enumerate(df[2:], start=2) if np.isin("SIRA NO", d.loc[:, 0].values)), len(df))
            abone_bilgiler = pd.concat(df[2:tablo_all_kullanici(df)], ignore_index=True)
            abone_bilgiler.replace('\r', ' ', regex=True, inplace=True)
            abone_bilgiler = abone_bilgiler.rename(columns=abone_bilgiler.iloc[1]).drop([0,1],axis=0).reset_index(drop=True)
            
            # GSM verilerini işleme
            tablo_all = lambda df: 4 if len(df) <= 3 else next((i for i, d in enumerate(df[4:], start=4) if np.isin("SIRA NO", d.loc[:, 0].values)), len(df))
            gsm = pd.concat(df[3:tablo_all(df)], ignore_index=True)
            gsm = gsm.rename(columns=gsm.iloc[1]).drop([0,1],axis=0).reset_index(drop=True)
            
            # Veri temizleme
            gsm["NUMARA"] = pd.to_numeric(gsm["NUMARA"], errors='coerce').fillna(0).astype('int64')
            gsm = gsm[~gsm["TİP"].str.contains("Yönlendirme", na=False)]
            gsm.fillna(0, inplace=True)
            
            # Tarih dönüşümleri ve diğer sütunları düzenleme
            gsm['TARİH'] = pd.to_datetime(gsm['TARİH'], dayfirst=True, errors='coerce')
            gsm["IMEI"] = pd.to_numeric(gsm["IMEI"], errors='coerce').fillna(0).astype('int64')
            gsm["SIRA NO"] = pd.to_numeric(gsm["SIRA NO"], errors='coerce').fillna(0).astype('int64')
            
            # Süre bilgisini saniye cinsine çevirme
            gsm['salt_sure'] = 0
            if 'SÜRE' in gsm.columns:
                gsm['salt_sure'] = gsm["SÜRE"].astype(str).str.extract(r'(\d+)').astype(float).fillna(0).astype(int)
            
            # Aranma durumunda sütunları düzenleme
            if sorgulanan_bilgiler.iloc[-1,-1] == 'İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)':
                gsm[['NUMARA', 'DİĞER NUMARA']] = gsm[['DİĞER NUMARA', 'NUMARA']]
                gsm.rename(columns={"İsim Soyisim (  Numara)": "İsim Soyisim ( Diğer Numara)",
                                "TC Kimlik No ( Numara)" :"TC Kimlik No (Diğer Numara)", 
                                "IMEI": "IMEIL(Diğer Numara)", 
                                "BAZ (Numara)": "BAZ (Diğer Numara)"}, inplace=True)
            
            # Dataframe'i CSV olarak saklama
            csv_path = pdf_path.replace('.pdf', '.csv')
            gsm.to_csv(csv_path, index=False, encoding='utf-8-sig')
            
            result["success"] = True
            result["message"] = "PDF başarıyla işlendi ve CSV'ye dönüştürüldü."
            result["data"]["csv_path"] = csv_path
            result["data"]["record_count"] = len(gsm)
            
        else:
            result["message"] = "PDF formatı desteklenmiyor. Sadece İletişim Tespiti (Arama-Aranma) formatı desteklenmektedir."
        
    except Exception as e:
        result["message"] = f"PDF işlenirken hata oluştu: {str(e)}"
    
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