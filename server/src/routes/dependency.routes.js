const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const {
  getAllDependencies,
  getDependencyById,
  createDependency,
  updateDependency,
  deleteDependency
} = require('../controllers/dependency.controller');

router.use(authMiddleware);

// Rutas de dependencias
router.get('/', getAllDependencies);
router.get('/:id', getDependencyById);
router.post('/', authorize('admin'), createDependency);
router.put('/:id', authorize('admin'), updateDependency);
router.delete('/:id', authorize('admin'), deleteDependency);

module.exports = router;
