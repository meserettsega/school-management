const Class = require('../models/Class');
const NationalExam = require('../models/NationalExam');
const NationalExamAttempt = require('../models/NationalExamAttempt');
const NationalQuestion = require('../models/NationalQuestion');
const NationalResource = require('../models/NationalResource');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const publicQuestion = (question, index) => ({
  _id: question._id,
  index,
  prompt: question.prompt,
  options: question.options,
  points: question.points,
});

const publicExam = exam => ({
  _id: exam._id,
  title: exam.title,
  description: exam.description,
  grade: exam.grade,
  subject: exam.subject,
  durationMinutes: exam.durationMinutes,
  attemptsAllowed: exam.attemptsAllowed,
  availableFrom: exam.availableFrom,
  availableUntil: exam.availableUntil,
  resources: exam.resources,
  questions: exam.questions.map(publicQuestion),
});

const canTeachGrade = async (teacherId, schoolId, grade) => {
  const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
  if (!teacher) return false;

  if (teacher.assignedSubjectStandards?.some(assignment =>
    assignment.standards?.some(standard => String(standard) === String(grade))
  )) return true;

  const assignedClassIds = [
    ...(teacher.classIds || []),
    ...(teacher.subjectClassAssignments || []).map(assignment => assignment.classId),
    teacher.classTeacherOf,
  ].filter(Boolean);

  return Class.exists({ schoolId, standard: String(grade), _id: { $in: assignedClassIds } });
};

const verifyManager = async (req, exam) => {
  if (!exam || exam.schoolId.toString() !== req.user.schoolId.toString()) return false;
  if (req.user.role === 'admin') return true;
  return exam.createdByModel === 'Teacher' && exam.createdBy.toString() === req.user.userId.toString();
};

const normalizeAnswers = (answers, questions) => {
  if (!Array.isArray(answers)) return null;
  const normalized = new Map();

  for (const answer of answers) {
    const questionIndex = Number(answer.questionIndex);
    const selectedOption = answer.selectedOption === null || answer.selectedOption === ''
      ? null
      : Number(answer.selectedOption);

    if (
      !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length ||
      normalized.has(questionIndex) ||
      (selectedOption !== null && (
        !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= questions[questionIndex].options.length
      ))
    ) return null;

    normalized.set(questionIndex, {
      questionIndex,
      selectedOption,
      flagged: Boolean(answer.flagged),
    });
  }

  return Array.from(normalized.values());
};

const gradeAttempt = (exam, answers) => {
  const answerMap = new Map(answers.map(answer => [answer.questionIndex, answer.selectedOption]));
  let score = 0;
  let maxScore = 0;

  const review = exam.questions.map((question, index) => {
    maxScore += question.points;
    const selectedOption = answerMap.get(index) ?? null;
    const isCorrect = selectedOption === question.correctOption;
    if (isCorrect) score += question.points;
    return {
      questionIndex: index,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      explanation: question.explanation,
    };
  });

  return { score, maxScore, review };
};

const getStudentExam = async (req, examId) => {
  const student = await Student.findOne({ _id: req.user.userId, schoolId: req.user.schoolId })
    .populate('classId', 'standard');
  if (!student) return { error: { status: 404, message: 'Student not found' } };

  const exam = await NationalExam.findOne({ _id: examId, schoolId: req.user.schoolId, status: 'published' });
  if (!exam) return { error: { status: 404, message: 'Practice exam not found' } };
  if (String(student.classId?.standard) !== String(exam.grade)) {
    return { error: { status: 403, message: 'This practice exam is not assigned to your grade' } };
  }

  return { student, exam };
};

exports.listExams = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.user.role === 'student') {
      const student = await Student.findOne({ _id: req.user.userId, schoolId: req.user.schoolId }).populate('classId', 'standard');
      if (!student) return res.status(404).json({ message: 'Student not found' });
      query.status = 'published';
      query.grade = String(student.classId?.standard || '');
    } else if (req.query.grade) {
      query.grade = String(req.query.grade);
    }

    const exams = await NationalExam.find(query).sort({ createdAt: -1 }).lean();
    if (req.user.role !== 'student') {
      return res.json({ exams: exams.map(({ questions, ...exam }) => ({ ...exam, questionCount: questions.length })) });
    }

    const examIds = exams.map(exam => exam._id);
    const attempts = await NationalExamAttempt.find({
      schoolId: req.user.schoolId,
      studentId: req.user.userId,
      examId: { $in: examIds },
    }).sort({ createdAt: -1 }).lean();
    const latestAttemptByExam = new Map();
    const attemptCountByExam = new Map();
    for (const attempt of attempts) {
      const examId = attempt.examId.toString();
      attemptCountByExam.set(examId, (attemptCountByExam.get(examId) || 0) + (attempt.status === 'submitted' ? 1 : 0));
      if (!latestAttemptByExam.has(examId)) latestAttemptByExam.set(examId, attempt);
    }

    res.json({
      exams: exams.map(({ questions, ...exam }) => {
        const latestAttempt = latestAttemptByExam.get(exam._id.toString());
        return {
          ...exam,
          questionCount: questions.length,
          attemptCount: attemptCountByExam.get(exam._id.toString()) || 0,
          latestAttempt: latestAttempt ? {
            _id: latestAttempt._id,
            status: latestAttempt.status,
            score: latestAttempt.score,
            maxScore: latestAttempt.maxScore,
            startedAt: latestAttempt.startedAt,
            submittedAt: latestAttempt.submittedAt,
          } : null,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createExam = async (req, res) => {
  try {
    const {
      title,
      description = '',
      grade,
      subject,
      durationMinutes,
      attemptsAllowed = 0,
      availableFrom,
      availableUntil,
      questions,
      resources = [],
      status = 'draft',
    } = req.body;

    if (!['6', '8', '12'].includes(String(grade))) {
      return res.status(400).json({ message: 'Choose Grade 6, 8, or 12' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Add at least one multiple-choice question' });
    }
    if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1 || Number(durationMinutes) > 240) {
      return res.status(400).json({ message: 'Duration must be between 1 and 240 minutes' });
    }

    for (const [index, question] of questions.entries()) {
      if (
        !question.prompt?.trim() || !Array.isArray(question.options) || question.options.length < 2 ||
        question.options.length > 6 || question.options.some(option => !String(option).trim()) ||
        !Number.isInteger(Number(question.correctOption)) ||
        Number(question.correctOption) < 0 || Number(question.correctOption) >= question.options.length
      ) {
        return res.status(400).json({ message: `Question ${index + 1} needs a prompt, 2-6 options, and a valid answer` });
      }
    }

    if (req.user.role === 'teacher' && !(await canTeachGrade(req.user.userId, req.user.schoolId, grade))) {
      return res.status(403).json({ message: 'You can only publish practice exams for grades assigned to you' });
    }

    const exam = await NationalExam.create({
      schoolId: req.user.schoolId,
      title: title?.trim(),
      description,
      grade: String(grade),
      subject: subject?.trim(),
      durationMinutes: Number(durationMinutes),
      attemptsAllowed: Math.max(0, Number(attemptsAllowed) || 0),
      availableFrom: availableFrom || undefined,
      availableUntil: availableUntil || undefined,
      questions: questions.map(question => ({
        ...question,
        options: question.options.map(option => String(option).trim()),
        correctOption: Number(question.correctOption),
        points: Math.max(1, Number(question.points) || 1),
      })),
      resources: resources.map(resource => ({
        title: String(resource.title || '').trim(),
        url: String(resource.url || '').trim(),
        type: resource.type || 'other',
      })),
      status: status === 'published' ? 'published' : 'draft',
      createdBy: req.user.userId,
      createdByModel: req.user.role === 'admin' ? 'User' : 'Teacher',
    });

    res.status(201).json({ exam: { ...exam.toObject(), questionCount: exam.questions.length } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const exam = await NationalExam.findOne({ _id: req.params.examId, schoolId: req.user.schoolId });
    if (!(await verifyManager(req, exam))) return res.status(404).json({ message: 'Practice exam not found' });
    if (!['draft', 'published'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Status must be draft or published' });
    }

    exam.status = req.body.status;
    await exam.save();
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await NationalExam.findOne({ _id: req.params.examId, schoolId: req.user.schoolId });
    if (!(await verifyManager(req, exam))) return res.status(404).json({ message: 'Practice exam not found' });
    await Promise.all([
      NationalExam.deleteOne({ _id: exam._id }),
      NationalExamAttempt.deleteMany({ schoolId: req.user.schoolId, examId: exam._id }),
    ]);
    res.json({ message: 'Practice exam and attempts deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamForStudent = async (req, res) => {
  try {
    const { error, exam } = await getStudentExam(req, req.params.examId);
    if (error) return res.status(error.status).json({ message: error.message });
    res.json({ exam: publicExam(exam) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startAttempt = async (req, res) => {
  try {
    const { error, exam, student } = await getStudentExam(req, req.params.examId);
    if (error) return res.status(error.status).json({ message: error.message });

    const now = new Date();
    if (exam.availableFrom && now < exam.availableFrom) return res.status(403).json({ message: 'This practice exam is not open yet' });
    if (exam.availableUntil && now > exam.availableUntil) return res.status(403).json({ message: 'This practice exam has closed' });

    if (exam.attemptsAllowed > 0) {
      const attemptCount = await NationalExamAttempt.countDocuments({
        schoolId: req.user.schoolId,
        examId: exam._id,
        studentId: student._id,
        status: 'submitted',
      });
      if (attemptCount >= exam.attemptsAllowed) return res.status(403).json({ message: 'You have used all allowed attempts' });
    }

    const attempt = await NationalExamAttempt.create({
      schoolId: req.user.schoolId,
      examId: exam._id,
      studentId: student._id,
      expiresAt: new Date(now.getTime() + exam.durationMinutes * 60 * 1000),
    });

    res.status(201).json({ attempt, exam: publicExam(exam) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttempt = async (req, res) => {
  try {
    const attempt = await NationalExamAttempt.findOne({
      _id: req.params.attemptId,
      studentId: req.user.userId,
      schoolId: req.user.schoolId,
    });
    if (!attempt) return res.status(404).json({ message: 'Exam attempt not found' });

    const exam = await NationalExam.findOne({ _id: attempt.examId, schoolId: req.user.schoolId });
    if (!exam) return res.status(404).json({ message: 'Practice exam not found' });

    const response = { attempt, exam: publicExam(exam) };
    if (attempt.status === 'submitted') {
      response.review = gradeAttempt(exam, attempt.answers);
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveAnswers = async (req, res) => {
  try {
    const attempt = await NationalExamAttempt.findOne({
      _id: req.params.attemptId,
      studentId: req.user.userId,
      schoolId: req.user.schoolId,
      status: 'in-progress',
    });
    if (!attempt) return res.status(404).json({ message: 'Active exam attempt not found' });
    if (new Date() >= attempt.expiresAt) return res.status(410).json({ message: 'Time is up. Submit your answers now.' });

    const exam = await NationalExam.findOne({ _id: attempt.examId, schoolId: req.user.schoolId });
    if (!exam) return res.status(404).json({ message: 'Practice exam not found' });
    const answers = normalizeAnswers(req.body.answers, exam.questions);
    if (!answers) return res.status(400).json({ message: 'Answer data is invalid' });

    attempt.answers = answers;
    await attempt.save();
    res.json({ savedAt: new Date(), answers: attempt.answers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitAttempt = async (req, res) => {
  try {
    const attempt = await NationalExamAttempt.findOne({
      _id: req.params.attemptId,
      studentId: req.user.userId,
      schoolId: req.user.schoolId,
      status: 'in-progress',
    });
    if (!attempt) return res.status(404).json({ message: 'Active exam attempt not found' });

    const exam = await NationalExam.findOne({ _id: attempt.examId, schoolId: req.user.schoolId });
    if (!exam) return res.status(404).json({ message: 'Practice exam not found' });

    if (req.body.answers) {
      const answers = normalizeAnswers(req.body.answers, exam.questions);
      if (!answers) return res.status(400).json({ message: 'Answer data is invalid' });
      attempt.answers = answers;
    }

    const result = gradeAttempt(exam, attempt.answers);
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.score = result.score;
    attempt.maxScore = result.maxScore;
    await attempt.save();

    res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        submittedAt: attempt.submittedAt,
      },
      exam: publicExam(exam),
      review: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyQuestionManager = (req, question) => {
  if (!question || question.schoolId.toString() !== req.user.schoolId.toString()) return false;
  if (req.user.role === 'admin') return true;
  return question.createdByModel === 'Teacher' && question.createdBy.toString() === req.user.userId.toString();
};

const validateBankQuestion = question => {
  if (!['6', '8', '12'].includes(String(question.grade))) return 'Choose Grade 6, 8, or 12';
  if (!question.subject?.trim()) return 'Subject is required';
  if (!question.prompt?.trim()) return 'Question text is required';
  if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
    return 'Add between 2 and 6 answer choices';
  }
  if (question.options.some(option => !String(option).trim())) return 'Complete every answer choice';
  if (!Number.isInteger(Number(question.correctOption)) || Number(question.correctOption) < 0 || Number(question.correctOption) >= question.options.length) {
    return 'Choose the correct answer';
  }
  return null;
};

exports.listQuestionBank = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (['6', '8', '12'].includes(String(req.query.grade))) query.grade = String(req.query.grade);
    if (req.query.subject?.trim()) query.subject = req.query.subject.trim();
    if (req.query.search?.trim()) {
      const search = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ prompt: search }, { topic: search }, { subject: search }];
    }

    const questions = await NationalQuestion.find(query).sort({ updatedAt: -1 }).lean();
    res.json({
      questions: questions.map(({ createdBy, createdByModel, ...question }) => ({
        ...question,
        canManage: req.user.role === 'admin' || (
          createdByModel === 'Teacher' && createdBy.toString() === req.user.userId.toString()
        ),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBankQuestion = async (req, res) => {
  try {
    const validationError = validateBankQuestion(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    if (req.user.role === 'teacher' && !(await canTeachGrade(req.user.userId, req.user.schoolId, req.body.grade))) {
      return res.status(403).json({ message: 'You can only add questions for grades assigned to you' });
    }

    const question = await NationalQuestion.create({
      schoolId: req.user.schoolId,
      grade: String(req.body.grade),
      subject: req.body.subject.trim(),
      topic: req.body.topic?.trim() || '',
      difficulty: ['Foundation', 'Standard', 'Advanced'].includes(req.body.difficulty) ? req.body.difficulty : 'Standard',
      prompt: req.body.prompt.trim(),
      options: req.body.options.map(option => String(option).trim()),
      correctOption: Number(req.body.correctOption),
      explanation: req.body.explanation?.trim() || '',
      points: Math.max(1, Number(req.body.points) || 1),
      createdBy: req.user.userId,
      createdByModel: req.user.role === 'admin' ? 'User' : 'Teacher',
    });
    res.status(201).json({ question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBankQuestion = async (req, res) => {
  try {
    const question = await NationalQuestion.findOne({ _id: req.params.questionId, schoolId: req.user.schoolId });
    if (!verifyQuestionManager(req, question)) return res.status(404).json({ message: 'Question not found' });

    const validationError = validateBankQuestion({ ...question.toObject(), ...req.body });
    if (validationError) return res.status(400).json({ message: validationError });
    if (req.user.role === 'teacher' && !(await canTeachGrade(req.user.userId, req.user.schoolId, req.body.grade ?? question.grade))) {
      return res.status(403).json({ message: 'You can only manage questions for grades assigned to you' });
    }

    const fields = ['grade', 'subject', 'topic', 'difficulty', 'prompt', 'options', 'correctOption', 'explanation', 'points'];
    for (const field of fields) {
      if (req.body[field] !== undefined) question[field] = req.body[field];
    }
    question.grade = String(question.grade);
    question.options = question.options.map(option => String(option).trim());
    question.correctOption = Number(question.correctOption);
    question.points = Math.max(1, Number(question.points) || 1);
    await question.save();
    res.json({ question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBankQuestion = async (req, res) => {
  try {
    const question = await NationalQuestion.findOne({ _id: req.params.questionId, schoolId: req.user.schoolId });
    if (!verifyQuestionManager(req, question)) return res.status(404).json({ message: 'Question not found' });
    await question.deleteOne();
    res.json({ message: 'Question removed from the bank' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listResources = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.user.role === 'student') {
      const student = await Student.findOne({ _id: req.user.userId, schoolId: req.user.schoolId }).populate('classId', 'standard');
      if (!student) return res.status(404).json({ message: 'Student not found' });
      query.grade = String(student.classId?.standard || '');
    } else if (['6', '8', '12'].includes(String(req.query.grade))) {
      query.grade = String(req.query.grade);
    }
    if (req.query.subject?.trim()) query.subject = req.query.subject.trim();

    const resources = await NationalResource.find(query).sort({ createdAt: -1 }).lean();
    res.json({ resources: resources.map(({ createdBy, createdByModel, ...resource }) => ({
      ...resource,
      canManage: req.user.role === 'admin' || (
        req.user.role === 'teacher' && createdByModel === 'Teacher' && createdBy.toString() === req.user.userId.toString()
      ),
    })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { title, description = '', grade, subject, topic = '', type = 'other', url, fileName = '' } = req.body;
    if (!title?.trim() || !subject?.trim() || !url?.trim()) {
      return res.status(400).json({ message: 'Title, subject, and uploaded file are required' });
    }
    if (!['6', '8', '12'].includes(String(grade))) return res.status(400).json({ message: 'Choose Grade 6, 8, or 12' });
    if (!['study-guide', 'question-paper', 'reference', 'other'].includes(type)) {
      return res.status(400).json({ message: 'Choose a valid resource type' });
    }
    if (req.user.role === 'teacher' && !(await canTeachGrade(req.user.userId, req.user.schoolId, grade))) {
      return res.status(403).json({ message: 'You can only upload resources for grades assigned to you' });
    }

    const resource = await NationalResource.create({
      schoolId: req.user.schoolId,
      title: title.trim(),
      description,
      grade: String(grade),
      subject: subject.trim(),
      topic: topic.trim(),
      type,
      url: url.trim(),
      fileName,
      createdBy: req.user.userId,
      createdByModel: req.user.role === 'admin' ? 'User' : 'Teacher',
    });
    res.status(201).json({ resource: { ...resource.toObject(), canManage: true } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const resource = await NationalResource.findOne({ _id: req.params.resourceId, schoolId: req.user.schoolId });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    const isOwner = resource.createdByModel === 'Teacher' && resource.createdBy.toString() === req.user.userId.toString();
    if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: 'You cannot remove this resource' });
    await resource.deleteOne();
    res.json({ message: 'Resource removed from the library' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};