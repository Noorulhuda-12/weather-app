import sqlite3
import requests
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

DB_FILE = 'weather.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS weather_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            temperature_data TEXT NOT NULL,
            maps_url TEXT,
            youtube_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/weather', methods=['POST'])
def create_weather():
    data = request.json
    location = data.get('location')
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    if not location or not start_date or not end_date:
        return jsonify({"error": "Missing required fields: location, start_date, end_date"}), 400

    if start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date"}), 400

    # API 1: Validate Location (Nominatim)
    try:
        geo_res = requests.get(
            f"https://nominatim.openstreetmap.org/search?format=json&q={location}&limit=1",
            headers={"User-Agent": "WeatherAppBackendDemo/1.0"}
        )
        geo_data = geo_res.json()
        if not geo_data:
            return jsonify({"error": f"Location '{location}' not found."}), 404
        
        lat = geo_data[0]['lat']
        lon = geo_data[0]['lon']
        display_name = geo_data[0]['display_name']
    except Exception as e:
        return jsonify({"error": "Failed to validate location"}), 500

    # API 2: Fetch Weather Data (Open-Meteo)
    try:
        weather_res = requests.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto"
        )
        weather_data = weather_res.json()
        if 'daily' not in weather_data:
             return jsonify({"error": "Could not retrieve weather for that date range."}), 400
    except Exception as e:
        return jsonify({"error": "Failed to fetch weather data"}), 500

    # API 3: Google Maps and Youtube Integration URLs
    city_name = display_name.split(',')[0]
    maps_url = f"https://maps.google.com/maps?q={lat},{lon}&z=12&output=embed"
    youtube_url = f"https://www.youtube.com/embed?listType=search&list={city_name.replace(' ', '+')}+city+tour"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO weather_requests (location, start_date, end_date, temperature_data, maps_url, youtube_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (display_name, start_date, end_date, json.dumps(weather_data['daily']), maps_url, youtube_url))
    
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Successfully created record", "id": new_id}), 201

@app.route('/api/weather', methods=['GET'])
def get_weather():
    conn = get_db_connection()
    records = conn.execute('SELECT * FROM weather_requests ORDER BY id DESC').fetchall()
    conn.close()
    
    result = []
    for r in records:
        result.append({
            "id": r["id"],
            "location": r["location"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "temperature_data": json.loads(r["temperature_data"]),
            "maps_url": r["maps_url"],
            "youtube_url": r["youtube_url"],
            "created_at": r["created_at"]
        })
    return jsonify(result), 200

@app.route('/api/weather/<int:id>', methods=['PUT'])
def update_weather(id):
    data = request.json
    location = data.get('location')
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    if not location or not start_date or not end_date:
        return jsonify({"error": "Missing required fields"}), 400

    if start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date"}), 400

    # Fetch new data
    try:
        geo_res = requests.get(f"https://nominatim.openstreetmap.org/search?format=json&q={location}&limit=1", headers={"User-Agent": "WeatherAppBackendDemo/1.0"})
        geo_data = geo_res.json()
        if not geo_data: return jsonify({"error": f"Location '{location}' not found."}), 404
        lat, lon, display_name = geo_data[0]['lat'], geo_data[0]['lon'], geo_data[0]['display_name']
        
        weather_res = requests.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto")
        weather_data = weather_res.json()
        if 'daily' not in weather_data: return jsonify({"error": "Could not retrieve weather."}), 400
    except Exception as e:
        return jsonify({"error": "Failed to update API data"}), 500

    city_name = display_name.split(',')[0]
    maps_url = f"https://maps.google.com/maps?q={lat},{lon}&z=12&output=embed"
    youtube_url = f"https://www.youtube.com/embed?listType=search&list={city_name.replace(' ', '+')}+city+tour"

    conn = get_db_connection()
    conn.execute('''
        UPDATE weather_requests 
        SET location = ?, start_date = ?, end_date = ?, temperature_data = ?, maps_url = ?, youtube_url = ?
        WHERE id = ?
    ''', (display_name, start_date, end_date, json.dumps(weather_data['daily']), maps_url, youtube_url, id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Successfully updated record"}), 200

@app.route('/api/weather/<int:id>', methods=['DELETE'])
def delete_weather(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM weather_requests WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Successfully deleted record"}), 200

@app.route('/api/weather/<int:id>/export', methods=['GET'])
def export_weather(id):
    conn = get_db_connection()
    record = conn.execute('SELECT * FROM weather_requests WHERE id = ?', (id,)).fetchone()
    conn.close()

    if not record:
        return jsonify({"error": "Record not found"}), 404

    temp_data = json.loads(record["temperature_data"])
    location = record["location"]
    
    csv_lines = ["Location,Date,Max Temp (C),Min Temp (C)"]
    for i in range(len(temp_data['time'])):
        date = temp_data['time'][i]
        tmax = temp_data['temperature_2m_max'][i]
        tmin = temp_data['temperature_2m_min'][i]
        csv_lines.append(f'"{location}",{date},{tmax},{tmin}')

    csv_content = "\\n".join(csv_lines)
    
    response = make_response(csv_content)
    response.headers["Content-Disposition"] = f"attachment; filename=weather_export_{id}.csv"
    response.headers["Content-type"] = "text/csv"
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5000)
