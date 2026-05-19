const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB Atlas connecté')
    } catch (error) {
        console.error('❌ Erreur MongoDB:', error.message)
        process.exit(1)
    }
}

module.exports = connectDB
