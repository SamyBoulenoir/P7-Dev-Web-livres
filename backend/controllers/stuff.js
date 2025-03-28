const Thing = require('../models/thing');
const fs = require('fs');

exports.createThing = (req, res, next) => {
  const thingObject = JSON.parse(req.body.book);

  if (!thingObject.year && (!Number.isInteger(thingObject.year) || thingObject.year < 0)) {
    console.log(req.filePath);
    if (req.filePath) {
      fs.unlink(req.filePath, (err) => {
          if (err) console.error("Erreur, suppression de l'image :", err);
      });
  }
    return res.status(400).json({ error: 'La date fournie est invalide. Elle doit être un nombre positif.' });
  }

  thingObject.ratings.forEach(rating => {
    if (rating.rating) {
      rating.grade = rating.rating;
      delete rating.rating;
    }
  });

  delete thingObject._id;
  delete thingObject._userId;

  const thing = new Thing({
    ...thingObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  thing.save()
    .then(() => res.status(201).json({ message: 'Objet enregistré !' }))
    .catch(error => res.status(400).json({ error }));
};

exports.getOneThing = (req, res, next) => {
  Thing.findOne({ _id: req.params.id })
    .then(thing => {
      if (!thing) return res.status(404).json({ error: "Not found" });
      res.status(200).json(thing);
    })
    .catch(error => res.status(404).json({ error }));
};

exports.modifyThing = (req, res) => {
  const thingObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/${req.filePath}`
  } : { ...req.body };

  if (thingObject.date && (!Number.isInteger(thingObject.date) || thingObject.date < 0)) {
    if (req.filePath) {
      fs.unlink(req.filePath, (err) => {
        if (err) console.error("Erreur lors de la suppression du fichier :", err);
      });
    }
    return res.status(400).json({ error: 'La date fournie est invalide. Elle doit être un nombre positif.' });
  }

  delete thingObject._userId;

  Thing.findOne({ _id: req.params.id })
    .then(thing => {
      if (!thing) {
        if (req.filePath) {
          fs.unlink(req.filePath, (err) => {
            if (err) console.error("Erreur lors de la suppression du fichier :", err);
          });
        }
        throw new Error('Objet non trouvé.');
      }
      if (thing.userId != req.auth.userId) {
        if (req.filePath) {
          fs.unlink(req.filePath, (err) => {
            if (err) console.error("Erreur lors de la suppression du fichier :", err);
          });
        }
        return res.status(401).json({ message: 'Not authorized' });
      }

      Thing.updateOne({ _id: req.params.id }, { ...thingObject, _id: req.params.id })
        .then(() => {
          if (req.filePath) {
            const oldFilename = thing.imageUrl.split('/images/')[1];
            fs.unlink(`images/${oldFilename}`, () => {});
          }
          res.status(200).json({ message: 'Objet modifié!' });
        })
        .catch(error => {
          if (req.filePath) {
            fs.unlink(req.filePath, (err) => {
              if (err) console.error("Erreur lors de la suppression du fichier :", err);
            });
          }
          res.status(401).json({ error });
        });
    })
    .catch(error => {
      if (req.filePath) {
        fs.unlink(req.filePath, (err) => {
          if (err) console.error("Erreur lors de la suppression du fichier :", err);
        });
      }
      res.status(400).json({ error: error.message });
    });
};

exports.deleteThing = (req, res, next) => {
  Thing.findOne({ _id: req.params.id })
    .then(thing => {
      if (thing.userId != req.auth.userId) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      const filename = thing.imageUrl.split('/images/')[1];
      fs.unlink(`images/${filename}`, () => {
        Thing.deleteOne({ _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Objet supprimé !' }))
          .catch(error => res.status(401).json({ error }));
      });
    })
    .catch(error => res.status(500).json({ error }));
};

exports.getAllThings = (req, res, next) => {
  Thing.find()
    .then(things => res.status(200).json(things))
    .catch(error => res.status(400).json({ error }));
};

exports.getBestRating = async (req, res, next) => {
  try {
    const bestThings = await Thing.find().sort({ averageRating: -1 }).limit(3);
    if (bestThings.length === 0) {
      return res.status(404).json({ message: "Aucun objet trouvé." });
    }
    res.status(200).json(bestThings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des objets." });
  }
};

exports.addRating = async (req, res, next) => {
  const { userId, rating } = req.body;

  if (!userId || rating === undefined) {
    return res.status(400).json({ message: "Le userId et la rating sont requis." });
  }

  if (rating < 0 || rating > 5 || isNaN(rating)) {
    return res.status(400).json({ message: "La note doit être un nombre compris entre 0 et 5." });
  }

  try {
    const thing = await Thing.findById(req.params.id);
    if (!thing) {
      return res.status(404).json({ message: "Objet non trouvé." });
    }
    const existingRating = thing.ratings.find(rating => rating.userId === userId);
    if (existingRating) {
      return res.status(400).json({ message: "L'utilisateur a déjà noté cet objet." });
    }
    thing.ratings.push({ userId, grade: rating });
    const totalRatings = thing.ratings.reduce((sum, r) => sum + r.grade, 0);
    thing.averageRating = totalRatings / thing.ratings.length;
    await thing.save();
    res.status(200).json(thing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la note." });
  }
};