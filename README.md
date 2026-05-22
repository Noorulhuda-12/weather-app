# Aurora Weather Dashboard

A full-stack weather dashboard application built with **Flask**, **Vue.js**, and **SQLite**.  
This project provides:

- Live weather search
- Forecast retrieval
- CRUD operations for saved weather records
- CSV export functionality
- Google Maps and YouTube integrations

---

## Features

### Frontend
- Modern responsive UI
- Search weather by:
  - City
  - Zip code
  - Landmark
- Current location support
- Weather visualization
- Live API integration
- Loading and error states

### Backend
- RESTful CRUD API
- SQLite database storage
- Export weather data to CSV
- External API integrations:
  - Open-Meteo
  - OpenStreetMap Nominatim
  - Google Maps
  - YouTube

---

# Project Structure

```bash
weather app/
│
├── backend/
│   ├── app.py
│   └── weather.db
│
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

---

# Technologies Used

## Frontend
- HTML5
- CSS3
- Vue.js 3
- Axios

## Backend
- Python
- Flask
- Flask-CORS
- SQLite3
- Requests

---

# API Endpoints

## Base URL
```bash
http://localhost:5000/api
```

## Create Weather Record
```http
POST /weather
```

### Request Body
```json
{
  "location": "London",
  "start_date": "2026-05-01",
  "end_date": "2026-05-05"
}
```

---

## Get All Weather Records
```http
GET /weather
```

---

## Update Weather Record
```http
PUT /weather/:id
```

---

## Delete Weather Record
```http
DELETE /weather/:id
```

---

## Export CSV
```http
GET /weather/:id/export
```

---

# Installation Guide

## 1. Clone Repository

```bash
git clone <your-repository-url>
cd weather-app
```

---

## 2. Backend Setup

### Create Virtual Environment
```bash
python -m venv venv
```

### Activate Virtual Environment

#### Windows
```bash
venv\Scripts\activate
```

#### macOS/Linux
```bash
source venv/bin/activate
```

### Install Dependencies
```bash
pip install flask flask-cors requests
```

### Run Backend Server
```bash
cd backend
python app.py
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 3. Frontend Setup

Open:

```bash
frontend/index.html
```

in your browser.

You can also use VS Code Live Server extension.

---

# Database

The application uses SQLite.

Database file:

```bash
backend/weather.db
```

Table:

```sql
weather_requests
```

Stores:
- Location
- Start date
- End date
- Temperature data
- Google Maps URL
- YouTube URL
- Timestamp

---

# External APIs

## Open-Meteo
Used for weather forecast data.

urlOpen-Meteo APIhttps://open-meteo.com/

## OpenStreetMap Nominatim
Used for location geocoding.

urlNominatim APIhttps://nominatim.openstreetmap.org/

---

# Example Workflow

1. User searches a city
2. Backend validates location
3. Weather data is fetched
4. Record saved into SQLite
5. Frontend displays forecast
6. User can:
   - Update record
   - Delete record
   - Export CSV

---

# Future Improvements

- User authentication
- Weather charts
- Dark/light mode
- Docker support
- Deployment setup
- Search history
- Hourly forecasts

---

# Author

Developed as a Full Stack Weather Dashboard assessment project.

  
