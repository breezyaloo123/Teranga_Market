// Les routes relient une adresse, les rôles autorisés (matrice des droits) et un contrôleur.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();
const READERS = ['admin', 'analyst', 'logistics', 'service_account'];

router.get('/', requireRole(...READERS), orderController.listOrders);
router.get('/:orderId', requireRole(...READERS), orderController.getOrder);

module.exports = router;