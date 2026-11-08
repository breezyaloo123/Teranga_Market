const express = require('express');
const catalogController = require('../controllers/catalogcontroller');

const router = express.Router();

router.get('/products', catalogController.listProducts);
router.get('/products/:productId', catalogController.readProduct);
router.post('/createproducts', catalogController.addProduct);
router.put('/products/:productId', catalogController.updateProduct);
router.delete('/products/:productId', catalogController.deleteProduct);

module.exports = router;
