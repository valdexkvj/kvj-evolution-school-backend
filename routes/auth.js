const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Générer JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}

// =============================================
// POST /api/auth/register
// =============================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont obligatoires.'
            })
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email ou nom d\'utilisateur déjà utilisé.'
            })
        }

        const user = await User.create({ username, email, password })
        const token = generateToken(user)

        res.status(201).json({
            success: true,
            message: 'Inscription réussie.',
            data: { user, token }
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// =============================================
// POST /api/auth/login
// =============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe obligatoires.'
            })
        }

        const user = await User.findOne({ email }).select('+password')

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect.'
            })
        }

        const token = generateToken(user)

        res.json({
            success: true,
            message: 'Connexion réussie.',
            data: { user, token }
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

module.exports = router
