import unittest
import os
import sys
import shutil
import pandas as pd
from unittest.mock import patch, MagicMock, call

# Adjust sys.path to import from the parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from pdf_processor import process_pdf_to_dict, read_pdf_until_second_match

# Define the directory for uploads (consistent with app.py)
TEST_UPLOAD_FOLDER = 'uploads/pdf/'
# Define a directory for test-related temporary files if needed, though CSVs go to TEST_UPLOAD_FOLDER
TEST_SAMPLES_DIR = 'tests/sample_files_output/'


class TestPdfProcessing(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Create upload and test sample directories if they don't exist
        os.makedirs(TEST_UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(TEST_SAMPLES_DIR, exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        # Clean up: remove the test upload and sample directories and their contents
        if os.path.exists(TEST_UPLOAD_FOLDER):
            shutil.rmtree(TEST_UPLOAD_FOLDER)
        if os.path.exists(TEST_SAMPLES_DIR):
            shutil.rmtree(TEST_SAMPLES_DIR)

    def tearDown(self):
        # Clean up any files created in UPLOAD_FOLDER during a test
        for item in os.listdir(TEST_UPLOAD_FOLDER):
            item_path = os.path.join(TEST_UPLOAD_FOLDER, item)
            if os.path.isfile(item_path):
                os.remove(item_path)

    # --- Mock Data Generation ---
    def _get_mock_df1_sorgulanan_bilgiler(self, pdf_type="İletişimin Tespiti (Arama - Aranma - Mesaj Atma - Mesaj Alma)"):
        return pd.DataFrame([
            [None, None, None],
            [None, None, None],
            [None, None, pdf_type]
        ])

    def _get_mock_df_abone_bilgiler_raw(self): # Before header processing
        return pd.DataFrame([
            ["header_junk1", "header_junk1"],
            ["İsim Soyisim", "Adres"], # This will become the header
            ["John Doe", "123 Main St"]
        ])

    def _get_mock_df_gsm_raw(self, arama_aranma_type=True): # Before header processing
        if arama_aranma_type: # Arama-Aranma
            return pd.DataFrame([
                ["header_junk1", "header_junk1", "header_junk1", "header_junk1", "header_junk1"],
                ["SIRA NO", "NUMARA", "TİP", "TARİH", "SÜRE"], # This will become the header
                ["1", "5551234567", "Giden Arama", "01.01.2023 10:00", "60"],
                ["2", "5557654321", "Gelen Arama", "02.01.2023 11:00", "120"]
            ])
        else: # Aranma-Arama
            return pd.DataFrame([
                ["header_junk1", "header_junk1", "header_junk1", "header_junk1", "header_junk1", "header_junk1"],
                ["SIRA NO", "DİĞER NUMARA", "TİP", "TARİH", "SÜRE", "NUMARA"], # This will become the header
                ["1", "5551234567", "Gelen Arama", "01.01.2023 10:00", "60", "5000000000"],
                ["2", "5557654321", "Giden Arama", "02.01.2023 11:00", "120", "5000000000"]
            ])
            
    # --- Test Cases ---

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5") # Mock helper function
    def test_successful_processing_arama_aranma(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler("İletişimin Tespiti (Arama - Aranma - Mesaj Atma - Mesaj Alma)")
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        mock_df_gsm_raw = self._get_mock_df_gsm_raw(arama_aranma_type=True)
        
        # Mock tabula.read_pdf to return a list of DataFrames
        mock_read_pdf_tabula.return_value = [
            pd.DataFrame(), # df[0] - usually some metadata, not critical for these tests
            mock_df1,       # df[1] - sorgulanan_bilgiler
            mock_df_abone_raw, # df[2] - abone_bilgiler part 1
            mock_df_gsm_raw   # df[3] - gsm part 1
        ]
        
        dummy_pdf_path = os.path.join(TEST_UPLOAD_FOLDER, "dummy_arama.pdf")
        # Create a dummy file for os.path.exists checks if any part of the code needs it
        with open(dummy_pdf_path, 'w') as f:
            f.write("dummy pdf content")

        result = process_pdf_to_dict(dummy_pdf_path)

        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "PDF başarıyla işlendi ve CSV'ye dönüştürüldü.")
        self.assertIn("csv_path", result["data"])
        self.assertTrue(os.path.exists(result["data"]["csv_path"]))
        self.assertEqual(result["data"]["record_count"], 2) # From mock_df_gsm_raw

        # Optional: Load CSV and check content
        if result["success"]:
            df_csv = pd.read_csv(result["data"]["csv_path"])
            self.assertEqual(len(df_csv), 2)
            self.assertEqual(df_csv.iloc[0]["NUMARA"], 5551234567)
            os.remove(result["data"]["csv_path"]) # Clean up generated CSV
        os.remove(dummy_pdf_path) # Clean up dummy PDF

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_successful_processing_aranma_arama(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler("İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)")
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        # For Aranma-Arama, NUMARA and DİĞER NUMARA are swapped by the processor
        mock_df_gsm_raw = self._get_mock_df_gsm_raw(arama_aranma_type=False) 
        
        mock_read_pdf_tabula.return_value = [
            pd.DataFrame(), 
            mock_df1,
            mock_df_abone_raw,
            mock_df_gsm_raw 
        ]
        
        dummy_pdf_path = os.path.join(TEST_UPLOAD_FOLDER, "dummy_aranma.pdf")
        with open(dummy_pdf_path, 'w') as f:
            f.write("dummy pdf content")

        result = process_pdf_to_dict(dummy_pdf_path)

        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "PDF başarıyla işlendi ve CSV'ye dönüştürüldü.")
        self.assertTrue(os.path.exists(result["data"]["csv_path"]))
        self.assertEqual(result["data"]["record_count"], 2)

        if result["success"]:
            df_csv = pd.read_csv(result["data"]["csv_path"])
            self.assertEqual(len(df_csv), 2)
            # After swapping, 'NUMARA' column should have data from original 'DİĞER NUMARA'
            self.assertEqual(df_csv.iloc[0]["NUMARA"], 5551234567) 
            self.assertEqual(df_csv.iloc[0]["DİĞER NUMARA"], 5000000000) # original 'NUMARA'
            os.remove(result["data"]["csv_path"])
        os.remove(dummy_pdf_path)


    @patch('pdf_processor.read_pdf', side_effect=Exception("Tabula failed"))
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_tabula_read_pdf_failure(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF'ten tablolar okunurken bir sorun oluştu. Dosya bozuk veya desteklenmeyen bir formatta olabilir. Detay: Tabula failed")

    @patch('pdf_processor.read_pdf', return_value=[pd.DataFrame()]) # Returns only one table
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_insufficient_tables(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF formatı uygun değil. Beklenen temel tablolar bulunamadı. Lütfen BTK'nın standart formatını kullandığınızdan emin olun.")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_invalid_df1_structure(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), pd.DataFrame()] # df[1] is empty
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF yapısı bozuk: Sorgulanan bilgiler tablosu (df[1]) eksik veya hatalı.")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_df1_iloc_index_error(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        # df[1] is not empty but too small, causing iloc[-1,-1] to fail
        mock_df1_malformed = pd.DataFrame([[1,2]]) 
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1_malformed]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF yapısı bozuk: Sorgulanan bilgiler tablosundaki (df[1]) PDF tipi bilgisine ulaşılamadı.")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_unsupported_pdf_type(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1_wrong_type = self._get_mock_df1_sorgulanan_bilgiler("Unsupported Type")
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1_wrong_type]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF formatı desteklenmiyor. Sadece İletişim Tespiti (Arama-Aranma veya Aranma-Arama) formatı desteklenmektedir.")
        
    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_missing_df2_for_abone(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler()
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1] # Only two tables, df[2] will be out of bounds for lambda
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF yapısı bozuk: Abone bilgileri için yeterli tablo bulunamadı (df[2] eksik).")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_empty_abone_bilgiler_dataframe(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler()
        # Configure tablo_all_kullanici to result in an empty list for pd.concat, or mock pd.concat itself
        # Simpler: provide an empty df[2] which then becomes abone_bilgiler
        mock_read_pdf_tabula.return_value = [
            pd.DataFrame(), 
            mock_df1, 
            pd.DataFrame(), # Empty df[2] -> empty abone_bilgiler after processing attempt
            self._get_mock_df_gsm_raw() # Provide gsm so it doesn't fail earlier
        ]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Abone bilgileri tablosu boş veya geçersiz yapıda.")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_missing_critical_column_numara(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler()
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        mock_df_gsm_missing_col = pd.DataFrame([
            ["header_junk1", "header_junk1", "header_junk1"],
            ["SIRA NO", "TİP", "TARİH"], # Missing NUMARA
            ["1", "Giden Arama", "01.01.2023 10:00"]
        ])
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1, mock_df_abone_raw, mock_df_gsm_missing_col]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF'ten 'NUMARA' sütunu okunamadı. Dosya formatı eksik veya hatalı.")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_tarih_conversion_failure(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler()
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        mock_df_gsm_bad_date = pd.DataFrame([
            ["header_junk1", "header_junk1", "header_junk1", "header_junk1"],
            ["SIRA NO", "NUMARA", "TİP", "TARİH"],
            ["1", "5551234567", "Giden Arama", "INVALID_DATE_FORMAT"] 
        ])
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1, mock_df_abone_raw, mock_df_gsm_bad_date]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "TARİH sütunundaki değerler geçerli bir tarih formatına dönüştürülemedi. Lütfen tarih formatını kontrol edin (örn: DD.MM.YYYY).")

    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    def test_missing_diger_numara_for_aranma_type(self, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler("İletişimin Tespiti (Aranma - Arama - Mesaj Alma - Mesaj Atma)")
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        mock_df_gsm_no_diger_numara = pd.DataFrame([ # Missing DİĞER NUMARA for Aranma type
            ["header_junk1", "header_junk1", "header_junk1", "header_junk1"],
            ["SIRA NO", "NUMARA", "TİP", "TARİH"], # Should have DİĞER NUMARA for this type
            ["1", "5551234567", "Gelen Arama", "01.01.2023 10:00"]
        ])
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1, mock_df_abone_raw, mock_df_gsm_no_diger_numara]
        result = process_pdf_to_dict("dummy_path.pdf")
        self.assertFalse(result["success"])
        # This error happens because 'DİĞER NUMARA' is expected for swapping.
        # The check for required_columns already covers 'NUMARA', 'TİP', 'TARİH'.
        # The specific check for 'DİĞER NUMARA' in the "Aranma" block is what we're testing.
        self.assertEqual(result["message"], "Aranma tipi PDF'te 'DİĞER NUMARA' sütunu bulunamadı. Sütun değişimi yapılamıyor.")

    # This test aims to simulate a failure when fitz.open is called within read_pdf_until_second_match
    @patch('pdf_processor.fitz.open', side_effect=Exception("Fitz: Simulated file open error"))
    def test_fitz_open_failure_in_helper(self, mock_fitz_open_actual):
        # read_pdf_until_second_match calls fitz.open. If it fails,
        # the exception should be caught by the main try-catch in process_pdf_to_dict.
        # The call to tabula.read_pdf might not even happen or might receive invalid pages arg.
        # The error message should be the generic one from process_pdf_to_dict's main try-catch.

        # We don't need to mock tabula.read_pdf here because the failure happens before it in read_pdf_until_second_match
        result = process_pdf_to_dict("any_pdf_path.pdf")
        
        self.assertFalse(result["success"])
        # The error is caught by the outermost try-except in process_pdf_to_dict
        self.assertTrue("PDF işlenirken beklenmedik bir hata oluştu" in result["message"])
        self.assertTrue("Fitz: Simulated file open error" in result["message"])


    @patch('pdf_processor.read_pdf')
    @patch('pdf_processor.read_pdf_until_second_match', return_value="1-5")
    @patch('pandas.DataFrame.to_csv', side_effect=Exception("Failed to write CSV"))
    def test_general_exception_on_to_csv(self, mock_to_csv, mock_read_pdf_pages, mock_read_pdf_tabula):
        mock_df1 = self._get_mock_df1_sorgulanan_bilgiler()
        mock_df_abone_raw = self._get_mock_df_abone_bilgiler_raw()
        mock_df_gsm_raw = self._get_mock_df_gsm_raw()
        
        mock_read_pdf_tabula.return_value = [pd.DataFrame(), mock_df1, mock_df_abone_raw, mock_df_gsm_raw]
        
        dummy_pdf_path = os.path.join(TEST_UPLOAD_FOLDER, "dummy_general_fail.pdf")
        with open(dummy_pdf_path, 'w') as f: f.write("dummy")

        result = process_pdf_to_dict(dummy_pdf_path)
        
        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "PDF işlenirken beklenmedik bir hata oluştu. Lütfen sistem yöneticisi ile iletişime geçin. Hata: Failed to write CSV")
        os.remove(dummy_pdf_path)

if __name__ == '__main__':
    unittest.main()
