const express = require('express');
const userController = require('../controllers/usercontroller');

const router = express.Router();

router.get('/users', userController.listUsers);
router.post('/users', userController.addUser);
router.get('/users/:email', userController.getUserByEmail);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;