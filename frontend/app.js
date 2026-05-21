const { createApp, ref, reactive, onMounted } = Vue;

const API_BASE = 'http://localhost:5000/api/weather';

const app = createApp({
    setup() {
        const activeTab = ref('frontend');

        // ================= FRONTEND STATE =================
        const frontendQuery = ref('');
        const frontendWeather = ref(null);
        const frontendLoading = ref(false);
        const frontendError = ref(null);

        // ================= BACKEND STATE =================
        const records = ref([]);
        const recordsLoading = ref(false);
        const form = reactive({
            location: '',
            start_date: '',
            end_date: ''
        });
        const editingId = ref(null);
        const formLoading = ref(false);
        const formError = ref(null);
        const formSuccess = ref(null);

        // ================= UTILITIES =================
        const getWeatherIcon = (code) => {
            if (code === 0 || code === 1) return '☀️';
            if (code === 2 || code === 3) return '☁️';
            if (code >= 51 && code <= 67) return '🌧️';
            if (code >= 80 && code <= 82) return '🌦️';
            if (code >= 71 && code <= 86) return '❄️';
            if (code >= 95 && code <= 99) return '⛈️';
            return '🌥️';
        };

        const getWeatherDesc = (code) => {
            if (code === 0 || code === 1) return 'Clear';
            if (code === 2 || code === 3) return 'Cloudy';
            if (code >= 51 && code <= 67) return 'Rain';
            if (code >= 80 && code <= 82) return 'Rain Showers';
            if (code >= 71 && code <= 86) return 'Snow';
            if (code >= 95 && code <= 99) return 'Thunderstorm';
            return 'Unknown';
        };

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        };

        // ================= FRONTEND LOGIC =================
        const fetchFrontendWeather = async (lat, lon, locationName) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
                
                const response = await axios.get(url);
                const data = response.data;
                
                if (!data.current || !data.daily) {
                    throw new Error("Invalid weather data received.");
                }

                frontendWeather.value = {
                    location: locationName,
                    current: {
                        temp: Math.round(data.current.temperature_2m),
                        feelsLike: Math.round(data.current.apparent_temperature),
                        humidity: data.current.relative_humidity_2m,
                        windSpeed: data.current.wind_speed_10m,
                        code: data.current.weather_code
                    },
                    forecast: data.daily.time.slice(1, 6).map((time, index) => ({
                        date: time,
                        max: Math.round(data.daily.temperature_2m_max[index + 1]),
                        min: Math.round(data.daily.temperature_2m_min[index + 1]),
                        code: data.daily.weather_code[index + 1]
                    }))
                };
                frontendError.value = null;
            } catch (err) {
                frontendError.value = "Could not fetch weather data. Please try again later.";
            } finally {
                frontendLoading.value = false;
            }
        };

        const handleFrontendSearch = async () => {
            if (!frontendQuery.value.trim()) return;
            frontendLoading.value = true;
            frontendError.value = null;

            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(frontendQuery.value)}&limit=1`);
                if (!geoRes.data || geoRes.data.length === 0) {
                    frontendError.value = `City or location "${frontendQuery.value}" was not found. Please check spelling and try again.`;
                    frontendLoading.value = false;
                    return;
                }
                const { lat, lon, display_name } = geoRes.data[0];
                const shortName = display_name.split(',')[0];
                await fetchFrontendWeather(lat, lon, shortName);
            } catch (err) {
                frontendError.value = "Network error while searching for location.";
                frontendLoading.value = false;
            }
        };

        const useCurrentLocation = () => {
            if (!navigator.geolocation) {
                frontendError.value = "Geolocation is not supported by your browser.";
                return;
            }
            frontendLoading.value = true;
            frontendError.value = null;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const city = geoRes.data?.address?.city || geoRes.data?.address?.town || "Current Location";
                        await fetchFrontendWeather(latitude, longitude, city);
                    } catch (err) {
                        await fetchFrontendWeather(latitude, longitude, "Current Location");
                    }
                },
                (err) => {
                    frontendError.value = "Unable to retrieve your location. Please ensure location permissions are granted.";
                    frontendLoading.value = false;
                }
            );
        };

        // ================= BACKEND LOGIC =================
        const initDates = () => {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 5);
            form.start_date = today.toISOString().split('T')[0];
            form.end_date = nextWeek.toISOString().split('T')[0];
        };

        const resetForm = () => {
            form.location = '';
            initDates();
            editingId.value = null;
            formError.value = null;
            formSuccess.value = null;
        };

        const fetchRecords = async () => {
            recordsLoading.value = true;
            try {
                const response = await axios.get(API_BASE);
                records.value = response.data;
            } catch (err) {
                console.error("Failed to fetch records", err);
                formError.value = "Could not connect to the backend server. Make sure `python app.py` is running!";
            } finally {
                recordsLoading.value = false;
            }
        };

        const handleSubmit = async () => {
            formLoading.value = true;
            formError.value = null;
            formSuccess.value = null;

            try {
                const payload = {
                    location: form.location,
                    start_date: form.start_date,
                    end_date: form.end_date
                };

                if (editingId.value) {
                    await axios.put(`${API_BASE}/${editingId.value}`, payload);
                    formSuccess.value = "Record updated successfully!";
                } else {
                    await axios.post(API_BASE, payload);
                    formSuccess.value = "Record created successfully!";
                }

                await fetchRecords();
                setTimeout(() => {
                    if (!formError.value) resetForm();
                }, 1500);
            } catch (err) {
                formError.value = err.response?.data?.error || err.message;
            } finally {
                formLoading.value = false;
            }
        };

        const editRecord = (record) => {
            editingId.value = record.id;
            form.location = record.location;
            form.start_date = record.start_date;
            form.end_date = record.end_date;
            formError.value = null;
            formSuccess.value = null;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const deleteRecord = async (id) => {
            if (!confirm("Are you sure you want to delete this record?")) return;
            try {
                await axios.delete(`${API_BASE}/${id}`);
                await fetchRecords();
            } catch (err) {
                alert("Failed to delete record.");
            }
        };

        const exportRecord = (id) => {
            window.location.href = `${API_BASE}/${id}/export`;
        };

        // Init
        onMounted(() => {
            useCurrentLocation();
            initDates();
            fetchRecords();
        });

        return {
            activeTab,
            // Frontend
            frontendQuery,
            frontendWeather,
            frontendLoading,
            frontendError,
            handleFrontendSearch,
            useCurrentLocation,
            // Backend
            records,
            recordsLoading,
            form,
            editingId,
            formLoading,
            formError,
            formSuccess,
            resetForm,
            fetchRecords,
            handleSubmit,
            editRecord,
            deleteRecord,
            exportRecord,
            // Utils
            getWeatherIcon,
            getWeatherDesc,
            formatDate
        };
    }
});

app.mount('#app');
