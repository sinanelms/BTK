import os
import json
import csv
import logging
from flask import Flask, render_template, jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Load the data from CSV file
def load_data():
    try:
        data_path = 'static/data/call_records.csv'
        items = []
        
        with open(data_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert numeric fields
                if row.get('salt_sure'):
                    row['salt_sure'] = int(row['salt_sure'])
                if row.get('SIRA NO'):
                    row['SIRA NO'] = int(row['SIRA NO'])
                items.append(row)
        return {"items": items}
    except Exception as e:
        logging.error(f"Error loading data: {e}")
        return {"items": []}

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    """API endpoint to get the product data."""
    data = load_data()
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
