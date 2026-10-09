const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me', authenticate, authorize('family'), familyController.getMyFamily);
router.get('/me/children/:studentId/attendance', authenticate, authorize('family'), familyController.getChildAttendance);
router.get('/me/children/:studentId/fees', authenticate, authorize('family'), familyController.getChildFeeHistory);
router.get('/', authenticate, authorize('admin'), familyController.getAllFamilies);
router.get('/:id', authenticate, authorize('admin', 'family'), familyController.getFamilyById);
router.post('/', authenticate, authorize('admin'), familyController.createFamily);
router.put('/:id', authenticate, authorize('admin', 'family'), familyController.updateFamily);
router.delete('/:id', authenticate, authorize('admin'), familyController.deleteFamily);
router.post('/:id/link-student', authenticate, authorize('admin', 'family'), familyController.linkStudent);
router.delete('/:id/link-student/:studentId', authenticate, authorize('admin', 'family'), familyController.unlinkStudent);

module.exports = router;
