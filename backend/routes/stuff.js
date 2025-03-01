const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const { multerUpload, convertImageToWebP } = require('../middleware/multer-config');


const stuffCtrl = require('../controllers/stuff');

router.get('/', stuffCtrl.getAllThings);
router.get('/bestrating', stuffCtrl.getBestRating)
router.get('/:id', stuffCtrl.getOneThing);
router.post('/', auth, multerUpload, convertImageToWebP, stuffCtrl.createThing);
router.put('/:id', auth, multerUpload, convertImageToWebP, stuffCtrl.modifyThing);
router.delete('/:id', auth, stuffCtrl.deleteThing);
router.post('/:id/rating', auth, stuffCtrl.addRating);


module.exports = router;