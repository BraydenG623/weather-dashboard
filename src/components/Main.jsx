import "../App.css";
import { useState, useEffect } from "react";

const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

export default function Main() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forecastDays, setForecastDays] = useState([]);
  const [unit, setUnit] = useState("C");

  useEffect(() => {
    const last = localStorage.getItem("lastCity");
    if (last) {
      setQuery(last);
      fetchWeather(last);
    }
  }, []);

  // Helper for turning 3 hour into 5 day forecast
  function toDailyHighsLows(forecastJson) {
    const byDay = {};
    for (const item of forecastJson.list) {
      const day = new Date(item.dt * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
      const t = item.main.temp;
      const icon = item.weather?.[0]?.icon;
      if (!byDay[day]) byDay[day] = { date: day, min: t, max: t, icon };
      else {
        byDay[day].min = Math.min(byDay[day].min, t);
        byDay[day].max = Math.max(byDay[day].max, t);
      }
    }
    // Get the first 5 distinct days
    return Object.values(byDay).slice(0, 5);
  }

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  async function fetchWeather(city) {
    if (!API_KEY) {
      setError("Missing REACT_APP_WEATHER_API_KEY in .env");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setWeather(null);
      setForecastDays([]);

      // Fetch current + forecast concurrently
      const [resCur, resFc] = await Promise.all([
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            city
          )}&appid=${API_KEY}&units=metric`
        ),
        fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
            city
          )}&appid=${API_KEY}&units=metric`
        ),
      ]);

      if (!resCur.ok || !resFc.ok) {
        throw new Error("City not found. Try another search.");
      }

      const [curJson, fcJson] = await Promise.all([
        resCur.json(),
        resFc.json(),
      ]);
      setWeather(curJson);
      setForecastDays(toDailyHighsLows(fcJson));
      localStorage.setItem("lastCity", city);
    } catch (e) {
      setError(e.message || "Failed to fetch weather.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const city = (form.get("search") || "").toString().trim();
    if (!city) {
      setError("Please enter a city.");
      return;
    }
    await fetchWeather(city);
  }

  return (
    <main>
      <form onSubmit={handleSubmit} className="searchWeatherForm">
        <h1 className="searchTextHeader">Search Weather Here</h1>

        <div className="searchRow">
          <input
            type="text"
            name="search"
            placeholder="e.g. Arlington VA"
            aria-label="Search City"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="submitButton" type="submit" disabled={loading}>
            {loading ? "Loading..." : "Submit"}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="errorBanner">
          {error}
        </div>
      )}

      {weather && !loading && (
        <section className="card weatherCard weatherCardGrid">
          <h2 className="weatherTitle">
            {weather.name}
            {weather.sys?.country ? `, ${weather.sys.country}` : ""}
          </h2>

          <div className="unitToggle">
            <button
              className={unit === "C" ? "active" : ""}
              onClick={() => setUnit("C")}
            >
              °C
            </button>
            <button
              className={unit === "F" ? "active" : ""}
              onClick={() => setUnit("F")}
            >
              °F
            </button>
          </div>

          {/* Left: current */}
          <div className="currentCol">
            <div className="weatherContent">
              <img
                alt={weather.weather?.[0]?.description || "icon"}
                src={
                  weather.weather?.[0]?.icon
                    ? `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`
                    : undefined
                }
              />
              <div>
                <div className="weatherTemp">
                  {unit === "C"
                    ? Math.round(weather.main?.temp) + "°C"
                    : Math.round(cToF(weather.main?.temp)) + "°F"}
                </div>
                <div className="weatherDesc">
                  {weather.weather?.[0]?.description}
                </div>
                <div>Humidity: {weather.main?.humidity}%</div>
                <div>
                  Wind: {Math.round((weather.wind?.speed || 0) * 3.6)} km/h
                </div>
              </div>
            </div>
          </div>

          {/* Right: 5-day */}
          <div className="forecastCol">
            <h3 className="forecastTitle">5-Day Forecast</h3>
            <div className="forecastGrid">
              {forecastDays.map((d) => {
                const label = new Date(d.date + "T12:00:00").toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" }
                );
                return (
                  <div className="forecastItem" key={d.date}>
                    <div className="forecastLabel">{label}</div>
                    <img
                      alt="forecast icon"
                      src={
                        d.icon
                          ? `https://openweathermap.org/img/wn/${d.icon}.png`
                          : undefined
                      }
                      width="40"
                      height="40"
                    />
                    <div className="forecastTemp">
                      {unit === "C"
                        ? `${Math.round(d.max)}° / ${Math.round(d.min)}°`
                        : `${Math.round(cToF(d.max))}° / ${Math.round(
                            cToF(d.min)
                          )}°`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
