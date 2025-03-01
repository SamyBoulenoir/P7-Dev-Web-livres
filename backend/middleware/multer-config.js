const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + '.' + extension);
  }
});

const multerUpload = multer({ storage: storage }).single('image');

// Middleware pour convertir l'image en WebP
const convertImageToWebP = (req, res, next) => {
  if (req.file) {
    const imagePath = req.file.path;
    const webpPath = imagePath.replace(path.extname(imagePath), '.webp');

    sharp(imagePath)
      .webp({ quality: 50 }) // Qualité de l'image WebP (ajuste selon tes besoins)
      .toFile(webpPath, (err, info) => {
        if (err) {
          return res.status(500).json({ message: 'Erreur lors de la conversion de l\'image.', error: err });
        }

        // Supprimer l'image originale si la conversion est réussie
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error('Erreur lors de la suppression de l\'image originale:', err);
          }
        });

        // Modifier le chemin du fichier pour qu'il pointe vers le fichier WebP
        req.file.path = webpPath;
        req.file.filename = path.basename(webpPath);
        next(); // Passer au middleware suivant (enregistrement du fichier dans la base de données)
      });
  } else {
    console.log('pas image')
    next(); // Si aucune image, on passe au prochain middleware
  }
};

module.exports = { multerUpload, convertImageToWebP };
