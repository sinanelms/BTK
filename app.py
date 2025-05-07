import os
import json
import logging
from flask import Flask, render_template, jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Load the data from JSON file
def load_data():
    try:
        with open('static/data/graphics_cards.json', 'r', encoding='utf-8') as file:
            return json.load(file)
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
