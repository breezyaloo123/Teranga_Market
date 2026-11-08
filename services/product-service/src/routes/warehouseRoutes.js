const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehousecontroller');

router.get('/warehouses', warehouseController.listWarehouses);
router.get('/warehouses/:id', warehouseController.readWarehouse);
router.post('/warehouses', warehouseController.addWarehouse);
router.put('/warehouses/:id', warehouseController.updateWarehouse);
router.delete('/warehouses/:id', warehouseController.deleteWarehouse);

module.exports = router;