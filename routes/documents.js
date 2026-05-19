const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const Document = require('../models/Document')

// =============================================
// CONFIGURATION MULTER
// =============================================
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true)
        } else {
            cb(new Error('Seuls les PDF sont acceptés.'), false)
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10 Mo
})

// =============================================
// MIDDLEWARE AUTH
// =============================================
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token manquant.'
        })
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch {
        res.status(403).json({
            success: false,
            message: 'Token invalide.'
        })
    }
}

// =============================================
// GET /api/documents - Liste tous les documents
// =============================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search } = req.query
        const filter = { isPublic: true }

        if (category) filter.category = category
        if (search) filter.title = { $regex: search, $options: 'i' }

        const documents = await Document.find(filter)
            .populate('uploadedBy', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))

        const total = await Document.countDocuments(filter)

        res.json({
            success: true,
            data: documents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})

// =============================================
// GET /api/documents/:id - Un document
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('uploadedBy', 'username')

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé.'
            })
        }

        res.json({ success: true, data: document })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})

// =============================================
// GET /api/documents/:id/download - Télécharger
// =============================================
router.get('/:id/download', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé.'
            })
        }

        const filePath = path.join(__dirname, '..', 'uploads', document.file.path)

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Fichier introuvable.'
            })
        }

        document.downloadCount += 1
        await document.save()

        res.download(filePath, document.file.originalName)

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})

// =============================================
// POST /api/documents - Ajouter un document
// =============================================
router.post('/', authenticate, upload.single('pdf'), async (req, res) => {
    try {
        const { title, description, category } = req.body
        const file = req.file

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Fichier PDF obligatoire.'
            })
        }

        if (!title) {
            fs.unlinkSync(file.path)
            return res.status(400).json({
                success: false,
                message: 'Le titre est obligatoire.'
            })
        }

        const document = await Document.create({
            title,
            description,
            file: {
                originalName: file.originalname,
                storedName: file.filename,
                path: file.filename,
                size: file.size,
                mimeType: file.mimetype
            },
            category: category || 'Autres',
            uploadedBy: req.user.id
        })

        res.status(201).json({
            success: true,
            message: 'Document ajouté.',
            data: document
        })

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path)
        res.status(500).json({ success: false, message: error.message })
    }
})

// =============================================
// DELETE /api/documents/:id - Supprimer
// =============================================
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé.'
            })
        }

        if (document.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Action non autorisée.'
            })
        }

        const filePath = path.join(__dirname, '..', 'uploads', document.file.path)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

        await document.deleteOne()

        res.json({ success: true, message: 'Document supprimé.' })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})

module.exports = router
