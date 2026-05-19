require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')

const app = express()
const PORT = process.env.PORT || 5000

// Connexion MongoDB
connectDB()

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/documents', require('./routes/documents'))

// Test
app.get('/api', (req, res) => {
    res.json({ success: true, message: ' API opérationnelle' })
})

// 404
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route introuvable.' })
})

app.listen(PORT, () => {
    console.log(` Serveur démarré sur le port ${PORT}`)
})
