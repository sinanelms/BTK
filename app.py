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

@app.route('/delete-file/<filename>', methods=['POST'])
def delete_file_route(filename):
    """Deletes a PDF and its corresponding CSV file."""
    if request.method == 'POST':
        # Sanitize the filename
        safe_filename = secure_filename(filename)
        if safe_filename != filename: # Check if secure_filename altered the name (e.g. removed path components)
            logging.warning(f"Filename sanitation changed '{filename}' to '{safe_filename}'. Aborting deletion for safety.")
            return jsonify({"success": False, "message": "Invalid filename."}), 400

        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        csv_filename = safe_filename.rsplit('.', 1)[0] + '.csv'
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)

        pdf_deleted = False
        csv_deleted = False
        pdf_existed = False
        csv_existed = False
        messages = []

        try:
            if os.path.exists(pdf_path):
                pdf_existed = True
                os.remove(pdf_path)
                pdf_deleted = True
                messages.append(f"PDF file '{safe_filename}' deleted.")
                logging.info(f"Deleted PDF file: {pdf_path}")
            else:
                messages.append(f"PDF file '{safe_filename}' not found.")
                logging.warning(f"Attempted to delete non-existent PDF: {pdf_path}")

            if os.path.exists(csv_path):
                csv_existed = True
                os.remove(csv_path)
                csv_deleted = True
                messages.append(f"CSV file '{csv_filename}' deleted.")
                logging.info(f"Deleted CSV file: {csv_path}")
            else:
                messages.append(f"CSV file '{csv_filename}' not found.")
                logging.warning(f"Attempted to delete non-existent CSV: {csv_path}")

            if pdf_deleted or csv_deleted:
                return jsonify({"success": True, "message": " ".join(messages)}), 200
            elif not pdf_existed and not csv_existed: # Neither file existed
                 return jsonify({"success": False, "message": f"Files '{safe_filename}' and '{csv_filename}' not found."}), 404
            else: # One or both existed but deletion failed for some other reason (though os.remove would raise error)
                return jsonify({"success": False, "message": "Error during deletion process. Check logs."}), 500

        except Exception as e:
            logging.error(f"Error deleting file '{safe_filename}' or '{csv_filename}': {e}")
            import traceback
            logging.error(traceback.format_exc())
            return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500
    else:
        # Should not happen if route is correctly defined with methods=['POST']
        return jsonify({"success": False, "message": "Method not allowed"}), 405

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
