const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Thing = require('../models/thing');

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_').replace(/\.[^/.]+$/, "");
    callback(null, `${name}_${Date.now()}.webp`);
  }
});

const multerUpload = multer({ storage }).single('image');

const uploadAndConvert = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err) return res.status(500).json({ message: 'Erreur lors du téléchargement.', error: err });

    if (!req.file) return next();

    const imagePath = req.file.path;
    
    sharp(imagePath)
      .webp({ quality: 50 })
      .toBuffer((err, buffer) => {
        if (err) {
          return res.status(500).json({ message: 'Erreur conversion en WebP.', error: err });
        }

        fs.writeFile(imagePath, buffer, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Erreur écriture du fichier WebP.', error: err });
          }

          if (req.params.id) {
            Thing.findOne({ _id: req.params.id })
              .then(thing => {
                if (thing && thing.imageUrl) {
                  const oldFilename = thing.imageUrl.split('/images/')[1];
                  const oldFilePath = path.join('images', oldFilename);

                  fs.unlink(oldFilePath, (err) => {
                    if (err) console.error('Erreur suppression ancienne image:', err);
                  });
                }
                next();
              })
              .catch(error => res.status(500).json({ message: 'Erreur récupération de l\'ancienne image.', error }));
          } else {
            req.filePath = imagePath;
            console.log(req.filePath)
            next();
          }
        });
      });
  });
};

module.exports = { uploadAndConvert };
