const express = require('express');
const nationalExamController = require('../controllers/nationalExamController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'teacher', 'student'), nationalExamController.listExams);
router.post('/', authenticate, authorize('admin', 'teacher'), nationalExamController.createExam);
router.get('/resources', authenticate, authorize('admin', 'teacher', 'student'), nationalExamController.listResources);
router.post('/resources', authenticate, authorize('admin', 'teacher'), nationalExamController.createResource);
router.delete('/resources/:resourceId', authenticate, authorize('admin', 'teacher'), nationalExamController.deleteResource);
router.get('/question-bank', authenticate, authorize('admin', 'teacher'), nationalExamController.listQuestionBank);
router.post('/question-bank', authenticate, authorize('admin', 'teacher'), nationalExamController.createBankQuestion);
router.put('/question-bank/:questionId', authenticate, authorize('admin', 'teacher'), nationalExamController.updateBankQuestion);
router.delete('/question-bank/:questionId', authenticate, authorize('admin', 'teacher'), nationalExamController.deleteBankQuestion);
router.patch('/:examId/status', authenticate, authorize('admin', 'teacher'), nationalExamController.updateStatus);
router.delete('/:examId', authenticate, authorize('admin', 'teacher'), nationalExamController.deleteExam);
router.get('/:examId', authenticate, authorize('student'), nationalExamController.getExamForStudent);
router.post('/:examId/start', authenticate, authorize('student'), nationalExamController.startAttempt);
router.get('/attempts/:attemptId', authenticate, authorize('student'), nationalExamController.getAttempt);
router.put('/attempts/:attemptId/answers', authenticate, authorize('student'), nationalExamController.saveAnswers);
router.post('/attempts/:attemptId/submit', authenticate, authorize('student'), nationalExamController.submitAttempt);

module.exports = router;