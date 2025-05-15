import os
import json
import csv
import uuid
import logging
from werkzeug.utils import secure_filename
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash

# PDF işleme modülünü içe aktar
from pdf_processor import process_pdf_to_dict, get_uploaded_pdfs

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Dosya yükleme yapılandırması
UPLOAD_FOLDER = 'uploads/pdf'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB max upload

def allowed_file(filename):
    """Dosya uzantısının izin verilen tipte olup olmadığını kontrol eder."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load the data from CSV file
def load_data(csv_path=None):
    try:
        # Eğer belirli bir CSV dosyası belirtilmişse onu kullan, yoksa varsayılan dosyayı kullan
        data_path = csv_path if csv_path and os.path.exists(csv_path) else 'static/data/call_records.csv'
        items = []
        
        with open(data_path, 'r', encoding='utf-8-sig') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert numeric fields
                if row.get('salt_sure'):
                    row['salt_sure'] = int(row['salt_sure'])
                if row.get('SIRA NO'):
                    row['SIRA NO'] = int(row['SIRA NO'])
                items.append(row)
        
        logging.debug(f"Loaded {len(items)} records from CSV: {data_path}")
        return {"items": items}
    except Exception as e:
        logging.error(f"Error loading data from {csv_path}: {e}")
        import traceback
        logging.error(traceback.format_exc())
        return {"items": []}

@app.route('/')
def index():
    """Ana sayfayı göster."""
    csv_path = request.args.get('csv_path')
    return render_template('index.html', csv_path=csv_path)

@app.route('/api/data')
def get_data():
    """API endpoint to get the call records data."""
    csv_path = request.args.get('csv_path')
    data = load_data(csv_path)
    return jsonify(data)

@app.route('/pdf-upload', methods=['GET', 'POST'])
def pdf_upload():
    """PDF yükleme ve işleme sayfası."""
    if request.method == 'POST':
        # Dosya yükleme kontrolü
        if 'pdf_file' not in request.files:
            flash('Dosya seçilmedi', 'danger')
            return redirect(request.url)
        
        file = request.files['pdf_file']
        
        # Dosya adı kontrolü
        if file.filename == '':
            flash('Dosya seçilmedi', 'danger')
            return redirect(request.url)
        
        # Dosya türü kontrolü ve kaydetme
        if file and allowed_file(file.filename):
            # Güvenli ve benzersiz dosya adı oluştur
            original_filename = secure_filename(file.filename)
            filename = f"{uuid.uuid4().hex}_{original_filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Dosyayı kaydet
            file.save(file_path)
            logging.debug(f"PDF saved to {file_path}")
            
            # PDF'i işleme fonksiyonu
            result = process_pdf_to_dict(file_path)
            
            if result["success"]:
                flash(f"PDF başarıyla işlendi: {result['message']}", 'success')
                # İşlenen CSV dosyasının yolunu ana sayfaya parametre olarak gönder
                return redirect(url_for('index', csv_path=result["data"]["csv_path"]))
            else:
                flash(f"PDF işleme hatası: {result['message']}", 'danger')
                return redirect(request.url)
        else:
            flash('İzin verilen dosya formatı: PDF', 'danger')
            return redirect(request.url)
    
    # GET isteği - PDF yükleme sayfasını göster
    uploaded_pdfs = get_uploaded_pdfs()
    return render_template('pdf_upload.html', uploaded_pdfs=uploaded_pdfs)

@app.route('/use-pdf/<path:pdf_path>')
def use_pdf(pdf_path):
    """
    İşlenmiş PDF dosyasını kullanmak için yönlendirir
    """
    # CSV dosya yolunu oluştur
    csv_path = pdf_path.replace('.pdf', '.csv')
    
    # Eğer CSV dosyası varsa, ana sayfaya yönlendir
    if os.path.exists(csv_path):
        return redirect(url_for('index', csv_path=csv_path))
    else:
        # Eğer CSV yoksa, PDF'i tekrar işle
        result = process_pdf_to_dict(pdf_path)
        
        if result["success"]:
            flash(f"PDF başarıyla işlendi: {result['message']}", 'success')
            return redirect(url_for('index', csv_path=result["data"]["csv_path"]))
        else:
            flash(f"PDF işleme hatası: {result['message']}", 'danger')
            return redirect(url_for('pdf_upload'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
