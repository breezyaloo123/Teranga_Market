const {
    getAllUsers, createUser, getUserByEmail: findUserByEmail, updateUser: updateUserModel, deleteUser: deleteUserModel
} = require('../models/user');

const listUsers = async (_req, res) => {
    try {
        const users = await getAllUsers();
        return res.json(users);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs :', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
    }
};

const addUser = async (req, res) => {
    try {
        const { email, password, is_active } = req.body;
        const user = await createUser(email, password, is_active);
        return res.status(201).json(user);
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur :', error);
        return res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        return res.json(user);
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur :', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, is_active } = req.body;
        const user = await updateUserModel(id, { email, password, is_active });
        return res.json(user);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await deleteUserModel(id);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        return res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur :', error);
        return res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
    }
};

module.exports = {
    listUsers,
    addUser,
    getUserByEmail,
    updateUser,
    deleteUser
};