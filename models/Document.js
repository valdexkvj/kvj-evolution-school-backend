const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: null
    },
    file: {
        originalName: String,
        storedName: String,
        path: String,
        size: Number,
        mimeType: {
            type: String,
            default: 'application/pdf'
        }
    },
    category: {
        type: String,
        enum: ['Cours', 'Examens', 'TD', 'TP', 'Livres', 'Autres'],
        default: 'Autres'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

module.exports = mongoose.model('Document', documentSchema)
