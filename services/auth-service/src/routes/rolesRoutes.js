const express = require('express');
const rolesController = require('../controllers/rolescontroller');

const router = express.Router();

router.get('/roles', rolesController.listRoles);
router.post('/roles', rolesController.addRole);
router.delete('/roles/:id', rolesController.removeRole);

module.exports = router;