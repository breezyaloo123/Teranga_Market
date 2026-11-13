const {getAllRoles, createRole} = require('../models/roles');

const listRoles = async (_req, res) => {
    try {
        const roles = await getAllRoles();
        return res.json(roles);
    } catch (error) {
        console.error('Erreur lors de la récupération des rôles :', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération des rôles' });
    }
};


const addRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        const role = await createRole(name, description);
        return res.status(201).json(role);
    } catch (error) {
        console.error('Erreur lors de la création du rôle :', error);
        return res.status(500).json({ message: 'Erreur lors de la création du rôle' });
    }
};

module.exports = {
    listRoles,
    addRole
};