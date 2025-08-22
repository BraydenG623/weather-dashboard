
import "../App.css"
import { useState, useEffect } from 'react'

export default function Header() {

    return (
        <header className="header1">
            <img className="headerImg" src="/weather-icon.png" alt="weather-icon" />
            <h1 className="headerInfo">WeatherYou</h1>
        </header>
        
    )
}