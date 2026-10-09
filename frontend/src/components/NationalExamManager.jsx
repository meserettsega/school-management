import React, { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink, FileText, Plus, Save, Send, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { downloadProxiedFile, openProxiedFile } from '../utils/fileProxy';

const makeQuestion = () => ({
  prompt: '',
  options: ['', '', '', ''],
  correctOption: 0,
  explanation: '',
  points: 1,
});

const initialForm = () => ({
  title: '',
  description: '',
  grade: '8',
  subject: 'Mathematics',
  durationMinutes: 90,
  attemptsAllowed: 0,
  questions: [makeQuestion()],
  resources: [],
});

const NationalExamManager = () => {
  const [exams, setExams] = useState([]);
  const [libraryResources, setLibraryResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState('exams');
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankGrade, setBankGrade] = useState('all');
  const [bankSubject, setBankSubject] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankForm, setBankForm] = useState({ grade: '8', subject: 'Mathematics', topic: '', difficulty: 'Standard', prompt: '', options: ['', '', '', ''], correctOption: 0, explanation: '', points: 1 });
  const [editingBankQuestionId, setEditingBankQuestionId] = useState(null);
  const [savingBankQuestion, setSavingBankQuestion] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '', grade: '8', subject: 'Mathematics', topic: '', type: 'study-guide' });
  const [resourceSearch, setResourceSearch] = useState('');

  const loadExams = async () => {
    try {
      const response = await apiClient.get('/national-exams');
      setExams(response.data.exams || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load practice exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const loadQuestionBank = async () => {
    try {
      setBankLoading(true);
      const params = {};
      if (bankGrade !== 'all') params.grade = bankGrade;
      if (bankSubject.trim()) params.subject = bankSubject.trim();
      if (bankSearch.trim()) params.search = bankSearch.trim();
      const response = await apiClient.get('/national-exams/question-bank', { params });
      setBankQuestions(response.data.questions || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load the school question bank.');
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'bank' || showBankPicker) loadQuestionBank();
  }, [mode, showBankPicker, bankGrade, bankSubject, bankSearch]);

  const loadLibraryResources = async () => {
    try {
      const response = await apiClient.get('/national-exams/resources');
      setLibraryResources(response.data.resources || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load school resources.');
    }
  };

  useEffect(() => {
    if (mode === 'resources') loadLibraryResources();
  }, [mode]);

  const updateQuestion = (questionIndex, updates) => {
    setForm(previous => ({
      ...previous,
      questions: previous.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...updates } : question
      ),
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => index === optionIndex ? value : option),
    });
  };

  const addOption = (questionIndex) => {
    const question = form.questions[questionIndex];
    if (question.options.length >= 6) return;
    updateQuestion(questionIndex, { options: [...question.options, ''] });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const question = form.questions[questionIndex];
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, index) => index !== optionIndex);
    const correctOption = question.correctOption === optionIndex
      ? 0
      : question.correctOption > optionIndex ? question.correctOption - 1 : question.correctOption;
    updateQuestion(questionIndex, { options, correctOption });
  };

  const persistResource = async (file, metadata) => {
    const data = new FormData();
    data.append('file', file);
    const uploadResponse = await apiClient.post('/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const title = metadata.title?.trim() || file.name.replace(/\.[^.]+$/, '');
    const response = await apiClient.post('/national-exams/resources', {
      ...metadata,
      title,
      fileName: file.name,
      url: uploadResponse.data.url,
    });
    return response.data.resource;
  };

  const uploadResource = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const resource = await persistResource(file, {
        title: file.name.replace(/\.[^.]+$/, ''),
        grade: form.grade,
        subject: form.subject,
        type: file.type.includes('pdf') ? 'question-paper' : 'study-guide',
      });
      setForm(previous => ({
        ...previous,
        resources: [...previous.resources, {
          title: resource.title,
          url: resource.url,
          type: resource.type,
        }],
      }));
      toast.success('Resource saved to the school library and attached to this exam.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Resource upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const uploadLibraryResource = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!resourceForm.title.trim() || !resourceForm.subject.trim()) {
      toast.error('Enter a resource title and subject before uploading.');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const resource = await persistResource(file, resourceForm);
      setLibraryResources(previous => [resource, ...previous]);
      setResourceForm(previous => ({ ...previous, title: '', description: '', topic: '' }));
      toast.success('Resource saved and will remain available after sign-out.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Resource upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const deleteLibraryResource = async (resource) => {
    if (!window.confirm(`Remove "${resource.title}" from the student library?`)) return;
    try {
      await apiClient.delete(`/national-exams/resources/${resource._id}`);
      setLibraryResources(previous => previous.filter(item => item._id !== resource._id));
      toast.success('Resource removed from the library.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove this resource.');
    }
  };

  const saveExam = async (event, status) => {
    event.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) {
      toast.error('Add an exam title and subject.');
      return;
    }
    if (form.questions.some(question => !question.prompt.trim() || question.options.some(option => !option.trim()))) {
      toast.error('Complete each question and its answer choices.');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/national-exams', {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        attemptsAllowed: Number(form.attemptsAllowed),
        status,
      });
      toast.success(status === 'published' ? 'Practice exam published.' : 'Draft saved.');
      setForm(initialForm());
      await loadExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save this practice exam.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (exam, status) => {
    try {
      await apiClient.patch(`/national-exams/${exam._id}/status`, { status });
      setExams(previous => previous.map(item => item._id === exam._id ? { ...item, status } : item));
      toast.success(status === 'published' ? 'Exam is now available to students.' : 'Exam returned to drafts.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update exam status.');
    }
  };

  const deleteExam = async (exam) => {
    if (!window.confirm(`Delete "${exam.title}" and all its attempts?`)) return;
    try {
      await apiClient.delete(`/national-exams/${exam._id}`);
      setExams(previous => previous.filter(item => item._id !== exam._id));
      toast.success('Practice exam deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete this practice exam.');
    }
  };

  const resetBankForm = () => {
    setEditingBankQuestionId(null);
    setBankForm({ grade: form.grade, subject: form.subject, topic: '', difficulty: 'Standard', prompt: '', options: ['', '', '', ''], correctOption: 0, explanation: '', points: 1 });
  };

  const saveBankQuestion = async (event) => {
    event.preventDefault();
    if (!bankForm.prompt.trim() || !bankForm.subject.trim() || bankForm.options.some(option => !option.trim())) {
      toast.error('Complete the question, subject, and every answer choice.');
      return;
    }
    try {
      setSavingBankQuestion(true);
      const payload = { ...bankForm, grade: String(bankForm.grade), points: Number(bankForm.points), correctOption: Number(bankForm.correctOption) };
      if (editingBankQuestionId) {
        await apiClient.put(`/national-exams/question-bank/${editingBankQuestionId}`, payload);
        toast.success('Question updated in the school bank.');
      } else {
        await apiClient.post('/national-exams/question-bank', payload);
        toast.success('Question saved to the school bank.');
      }
      resetBankForm();
      await loadQuestionBank();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save this bank question.');
    } finally {
      setSavingBankQuestion(false);
    }
  };

  const editBankQuestion = (question) => {
    setEditingBankQuestionId(question._id);
    setBankForm({
      grade: question.grade,
      subject: question.subject,
      topic: question.topic || '',
      difficulty: question.difficulty || 'Standard',
      prompt: question.prompt,
      options: [...question.options],
      correctOption: question.correctOption,
      explanation: question.explanation || '',
      points: question.points || 1,
    });
    document.getElementById('national-question-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteBankQuestion = async (question) => {
    if (!window.confirm('Remove this question from the school question bank? Existing exams will keep their own copy.')) return;
    try {
      await apiClient.delete(`/national-exams/question-bank/${question._id}`);
      setBankQuestions(previous => previous.filter(item => item._id !== question._id));
      toast.success('Question removed from the bank.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove this question.');
    }
  };

  const addSelectedBankQuestions = () => {
    setForm(previous => ({
      ...previous,
      questions: [
        ...previous.questions.filter(question => question.prompt.trim() || question.options.some(option => option.trim())),
        ...selectedBankQuestions.map(question => ({
          prompt: question.prompt,
          options: [...question.options],
          correctOption: question.correctOption,
          explanation: question.explanation || '',
          points: question.points || 1,
        })),
      ],
    }));
    const count = selectedBankQuestions.length;
    setSelectedBankQuestions([]);
    setShowBankPicker(false);
    setMode('exams');
    toast.success(`${count} question(s) added to this exam.`);
  };

  const saveToBank = async (question) => {
    try {
      await apiClient.post('/national-exams/question-bank', {
        grade: form.grade,
        subject: form.subject,
        topic: '',
        difficulty: 'Standard',
        ...question,
      });
      toast.success('Question saved to the school bank.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save this question to the bank.');
    }
  };

  const updateBankOption = (index, value) => {
    setBankForm(previous => ({ ...previous, options: previous.options.map((option, optionIndex) => optionIndex === index ? value : option) }));
  };

  const updateExamQuestionOption = (questionIndex, optionIndex, value) => {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, { options: question.options.map((option, index) => index === optionIndex ? value : option) });
  };

  const addBankOption = () => {
    if (bankForm.options.length < 6) setBankForm(previous => ({ ...previous, options: [...previous.options, ''] }));
  };

  const removeBankOption = (optionIndex) => {
    if (bankForm.options.length <= 2) return;
    setBankForm(previous => ({
      ...previous,
      options: previous.options.filter((_, index) => index !== optionIndex),
      correctOption: previous.correctOption === optionIndex ? 0 : previous.correctOption > optionIndex ? previous.correctOption - 1 : previous.correctOption,
    }));
  };

  if (mode === 'resources') {
    const visibleResources = libraryResources.filter(resource =>
      `${resource.title} ${resource.subject} ${resource.topic || ''} ${resource.description || ''}`
        .toLowerCase()
        .includes(resourceSearch.toLowerCase())
    );

    return (
      <div className="space-y-6 text-[#172536]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8e2e8] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#168c91]">Persistent school library</p>
            <h2 className="mt-1 text-2xl font-black">Study resources</h2>
            <p className="mt-1 text-sm text-[#627586]">Files are saved independently of exam drafts and remain available after sign-out.</p>
          </div>
          <button type="button" onClick={() => setMode('exams')} className="rounded-lg border border-[#cbd7df] px-4 py-2.5 text-xs font-bold text-[#44576b] hover:bg-white">Back to exam builder</button>
        </header>

        <form className="grid gap-4 rounded-2xl border border-[#d7e1e8] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end" onSubmit={event => event.preventDefault()}>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Resource title<input required value={resourceForm.title} onChange={event => setResourceForm(previous => ({ ...previous, title: event.target.value }))} placeholder="Grade 8 revision guide" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Grade<select value={resourceForm.grade} onChange={event => setResourceForm(previous => ({ ...previous, grade: event.target.value }))} className="mt-1 block w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]"><option value="6">Grade 6</option><option value="8">Grade 8</option><option value="12">Grade 12</option></select></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Subject<input required value={resourceForm.subject} onChange={event => setResourceForm(previous => ({ ...previous, subject: event.target.value }))} placeholder="Mathematics" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Material type<select value={resourceForm.type} onChange={event => setResourceForm(previous => ({ ...previous, type: event.target.value }))} className="mt-1 block w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]"><option value="study-guide">Study guide</option><option value="question-paper">Past question paper</option><option value="reference">Reference material</option><option value="other">Other</option></select></label>
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#173752] px-4 py-3 text-xs font-black text-white hover:bg-[#214b6c] ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload file'}
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={uploadLibraryResource} className="sr-only" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b] lg:col-span-5">Description (optional)<textarea rows={2} value={resourceForm.description} onChange={event => setResourceForm(previous => ({ ...previous, description: event.target.value }))} placeholder="What this resource covers" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b] lg:col-span-2">Topic (optional)<input value={resourceForm.topic} onChange={event => setResourceForm(previous => ({ ...previous, topic: event.target.value }))} placeholder="Algebra" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
        </form>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-black">Library materials <span className="ml-1 rounded-full bg-[#e8f6f4] px-2 py-1 text-xs text-[#147c81]">{libraryResources.length}</span></h3>
            <div className="flex gap-2">
              <input value={resourceSearch} onChange={event => setResourceSearch(event.target.value)} placeholder="Search library" className="rounded-lg border border-[#cfdae3] bg-white px-3 py-2 text-sm outline-none focus:border-[#168c91]" />
              <button type="button" onClick={loadLibraryResources} className="rounded-lg border border-[#cbd7df] bg-white px-3 py-2 text-xs font-bold text-[#44576b]">Refresh</button>
            </div>
          </div>
          {visibleResources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#c8d5dd] bg-white p-8 text-center text-sm text-[#718191]">No saved resources match this search.</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleResources.map(resource => (
                <article key={resource._id} className="flex flex-col justify-between gap-4 rounded-xl border border-[#d7e1e8] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2f5f3] text-[#147c81]"><FileText className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-black">{resource.title}</h4>
                      <p className="mt-1 text-xs text-[#718191]">Grade {resource.grade} · {resource.subject}{resource.topic ? ` · ${resource.topic}` : ''}</p>
                      {resource.description && <p className="mt-1 line-clamp-2 text-xs text-[#718191]">{resource.description}</p>}
                      <span className="mt-2 inline-block rounded-full bg-[#f0f4f7] px-2 py-1 text-[9px] font-bold uppercase text-[#536679]">{resource.type.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => openProxiedFile(resource.url)} title="Open material" className="inline-flex items-center gap-1 rounded-lg border border-[#d9e3e9] px-2.5 py-2 text-[10px] font-bold text-[#147c81] hover:bg-[#e9f7f5]"><ExternalLink className="h-3.5 w-3.5" />Open</button>
                    <button type="button" onClick={() => downloadProxiedFile(resource.url, resource.fileName || resource.title)} title="Download material" className="inline-flex items-center gap-1 rounded-lg border border-[#d9e3e9] px-2.5 py-2 text-[10px] font-bold text-[#147c81] hover:bg-[#e9f7f5]"><Download className="h-3.5 w-3.5" />Download</button>
                    {resource.canManage && <button type="button" onClick={() => deleteLibraryResource(resource)} title="Remove material" className="rounded-lg p-2 text-[#a34f5c] hover:bg-[#faebed]"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (mode === 'bank') {
    return (
      <div className="space-y-6 text-[#172536]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8e2e8] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#168c91]">School-wide content library</p>
            <h2 className="mt-1 text-2xl font-black">Question bank</h2>
            <p className="mt-1 text-sm text-[#627586]">Create, organize, search, and reuse verified questions across practice exams.</p>
          </div>
          <button type="button" onClick={() => setMode('exams')} className="rounded-lg border border-[#cbd7df] px-4 py-2.5 text-xs font-bold text-[#44576b] hover:bg-white">Back to exam builder</button>
        </header>

        <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
          <section className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-[#d7e1e8] bg-white p-4 sm:grid-cols-[1fr_11rem_12rem]">
              <input value={bankSearch} onChange={event => setBankSearch(event.target.value)} placeholder="Search question, topic, subject" className="rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm outline-none focus:border-[#168c91]" />
              <select value={bankGrade} onChange={event => setBankGrade(event.target.value)} className="rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168c91]">
                <option value="all">All grades</option><option value="6">Grade 6</option><option value="8">Grade 8</option><option value="12">Grade 12</option>
              </select>
              <input value={bankSubject} onChange={event => setBankSubject(event.target.value)} placeholder="Filter by subject" className="rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm outline-none focus:border-[#168c91]" />
            </div>

            {bankLoading ? <div className="rounded-xl border border-[#d7e1e8] bg-white p-8 text-center text-sm text-[#718191]">Searching the question bank...</div> : bankQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#c8d5dd] bg-white p-8 text-center text-sm text-[#718191]">No questions match these filters. Add the first question using the form.</div>
            ) : bankQuestions.map(question => (
              <article key={question._id} className="space-y-3 rounded-xl border border-[#d7e1e8] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-wide">
                    <span className="rounded-full bg-[#e2f5f3] px-2 py-1 text-[#147c81]">Grade {question.grade}</span>
                    <span className="rounded-full bg-[#edf1f5] px-2 py-1 text-[#52677b]">{question.subject}</span>
                    {question.topic && <span className="rounded-full bg-[#f1edfa] px-2 py-1 text-[#69599a]">{question.topic}</span>}
                    <span className="rounded-full bg-[#fff4dc] px-2 py-1 text-[#8b6410]">{question.difficulty}</span>
                  </div>
                  {question.canManage && <div className="flex gap-1">
                    <button type="button" onClick={() => editBankQuestion(question)} title="Edit question" className="rounded-md px-2 py-1 text-xs font-bold text-[#147c81] hover:bg-[#e9f7f5]">Edit</button>
                    <button type="button" onClick={() => deleteBankQuestion(question)} title="Delete question" className="rounded-md p-1.5 text-[#a34f5c] hover:bg-[#faebed]"><Trash2 className="h-4 w-4" /></button>
                  </div>}
                </div>
                <p className="text-sm font-bold leading-relaxed text-[#172536]">{question.prompt}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, index) => (
                    <div key={index} className={`rounded-lg border px-3 py-2 text-xs ${index === question.correctOption ? 'border-[#69bdb6] bg-[#eaf8f6] font-bold text-[#147c81]' : 'border-[#e0e7ec] bg-[#fafcfd] text-[#5c6f80]'}`}>
                      <span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{option}{index === question.correctOption && <span className="ml-2 text-[9px] uppercase">Correct</span>}
                    </div>
                  ))}
                </div>
                {question.explanation && <p className="border-t border-[#edf1f4] pt-2 text-xs leading-relaxed text-[#718191]">{question.explanation}</p>}
              </article>
            ))}
          </section>

          <form id="national-question-form" onSubmit={saveBankQuestion} className="space-y-4 rounded-2xl border border-[#d7e1e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e7edf1] pb-3">
              <div><h3 className="font-black">{editingBankQuestionId ? 'Edit question' : 'Add to question bank'}</h3><p className="mt-1 text-xs text-[#718191]">Correct answers remain visible to authorized staff only.</p></div>
              {editingBankQuestionId && <button type="button" onClick={resetBankForm} className="text-xs font-bold text-[#147c81] hover:underline">Cancel edit</button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Grade<select value={bankForm.grade} onChange={event => setBankForm(previous => ({ ...previous, grade: event.target.value }))} className="mt-1 block w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]"><option value="6">Grade 6</option><option value="8">Grade 8</option><option value="12">Grade 12</option></select></label>
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Subject<input required value={bankForm.subject} onChange={event => setBankForm(previous => ({ ...previous, subject: event.target.value }))} placeholder="Biology" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Topic<input value={bankForm.topic} onChange={event => setBankForm(previous => ({ ...previous, topic: event.target.value }))} placeholder="Cell structure" className="mt-1 block w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]" /></label>
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8b]">Difficulty<select value={bankForm.difficulty} onChange={event => setBankForm(previous => ({ ...previous, difficulty: event.target.value }))} className="mt-1 block w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm font-medium normal-case text-[#172536] outline-none focus:border-[#168c91]"><option>Foundation</option><option>Standard</option><option>Advanced</option></select></label>
            </div>
            <textarea required rows={3} value={bankForm.prompt} onChange={event => setBankForm(previous => ({ ...previous, prompt: event.target.value }))} placeholder="Write the question" className="w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm outline-none focus:border-[#168c91]" />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wide text-[#6b7c8b]">Answer choices</p>{bankForm.options.length < 6 && <button type="button" onClick={addBankOption} className="text-xs font-bold text-[#147c81]">+ Add choice</button>}</div>
              {bankForm.options.map((option, index) => (
                <div key={index} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${bankForm.correctOption === index ? 'border-[#69bdb6] bg-[#eaf8f6]' : 'border-[#dfe7ec]'}`}>
                  <input type="radio" name="bank-correct-answer" checked={bankForm.correctOption === index} onChange={() => setBankForm(previous => ({ ...previous, correctOption: index }))} className="accent-[#139395]" aria-label={`Mark choice ${String.fromCharCode(65 + index)} as correct`} />
                  <span className="w-5 text-center text-[10px] font-black text-[#52677b]">{String.fromCharCode(65 + index)}</span>
                  <input required value={option} onChange={event => updateBankOption(index, event.target.value)} placeholder={`Choice ${String.fromCharCode(65 + index)}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                  {bankForm.options.length > 2 && <button type="button" onClick={() => removeBankOption(index)} aria-label="Remove answer choice" className="p-1 text-[#8b99a5]"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              ))}
            </div>
            <textarea rows={2} value={bankForm.explanation} onChange={event => setBankForm(previous => ({ ...previous, explanation: event.target.value }))} placeholder="Explanation for feedback after submission" className="w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm outline-none focus:border-[#168c91]" />
            <button type="submit" disabled={savingBankQuestion} className="w-full rounded-lg bg-[#173752] px-4 py-3 text-xs font-black text-white hover:bg-[#214b6c] disabled:opacity-50">{savingBankQuestion ? 'Saving...' : editingBankQuestionId ? 'Save question changes' : 'Save to question bank'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#172536]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8e2e8] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#168c91]">Ethiopian national exam practice</p>
          <h2 className="mt-1 text-2xl font-black">Practice exam studio</h2>
          <p className="mt-1 text-sm text-[#627586]">Build timed multiple-choice practice for Grades 6, 8, and 12.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setResourceForm(previous => ({ ...previous, grade: form.grade, subject: form.subject })); setMode('resources'); }} className="rounded-lg border border-[#cbd7df] bg-white px-3 py-2.5 text-xs font-bold text-[#44576b] hover:bg-[#f4f7f9]">Resource library</button>
          <button type="button" onClick={() => setMode('bank')} className="rounded-lg border border-[#cbd7df] bg-white px-3 py-2.5 text-xs font-bold text-[#44576b] hover:bg-[#f4f7f9]">Question bank</button>
          <span className="rounded-full bg-[#e0f4f2] px-3 py-1.5 text-xs font-bold text-[#147c81]">{exams.filter(exam => exam.status === 'published').length} published</span>
          <span className="rounded-full bg-[#edf1f5] px-3 py-1.5 text-xs font-bold text-[#536679]">{exams.filter(exam => exam.status === 'draft').length} drafts</span>
        </div>
      </header>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <form className="space-y-5 rounded-2xl border border-[#d7e1e8] bg-white p-5 shadow-sm" onSubmit={event => saveExam(event, 'published')}>
          <div className="flex items-center gap-3 border-b border-[#e7edf1] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2f5f3] text-[#137e83]"><BookOpen className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black">New practice exam</h3>
              <p className="text-xs text-[#718191]">Answer keys stay private until a student submits.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-[#536679] sm:col-span-2">
              Exam title
              <input value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} placeholder="Regional mock exam 1" className="mt-1.5 w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium text-[#172536] outline-none focus:border-[#168c91]" required />
            </label>
            <label className="text-xs font-bold text-[#536679]">
              Grade
              <select value={form.grade} onChange={event => setForm(previous => ({ ...previous, grade: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm text-[#172536] outline-none focus:border-[#168c91]">
                <option value="6">Grade 6</option><option value="8">Grade 8</option><option value="12">Grade 12</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#536679]">
              Subject
              <input value={form.subject} onChange={event => setForm(previous => ({ ...previous, subject: event.target.value }))} placeholder="Mathematics" className="mt-1.5 w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium text-[#172536] outline-none focus:border-[#168c91]" required />
            </label>
            <label className="text-xs font-bold text-[#536679]">
              Time limit (min)
              <input type="number" min="1" max="240" value={form.durationMinutes} onChange={event => setForm(previous => ({ ...previous, durationMinutes: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm text-[#172536] outline-none focus:border-[#168c91]" required />
            </label>
            <label className="text-xs font-bold text-[#536679]">
              Attempts
              <select value={form.attemptsAllowed} onChange={event => setForm(previous => ({ ...previous, attemptsAllowed: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm text-[#172536] outline-none focus:border-[#168c91]">
                <option value="0">Unlimited practice</option><option value="1">1 attempt</option><option value="2">2 attempts</option><option value="3">3 attempts</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#536679] sm:col-span-2 lg:col-span-2">
              Instructions
              <input value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Read each question carefully. Choose one answer." className="mt-1.5 w-full rounded-lg border border-[#cfdae3] px-3 py-2.5 text-sm font-medium text-[#172536] outline-none focus:border-[#168c91]" />
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black">Questions <span className="ml-1 text-[#8797a5]">{form.questions.length}</span></h4>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setBankGrade(form.grade); setBankSubject(form.subject); setSelectedBankQuestions([]); setShowBankPicker(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd7df] px-3 py-2 text-xs font-bold text-[#44576b] hover:bg-[#f4f7f9]">Add from bank</button>
                <button type="button" onClick={() => setForm(previous => ({ ...previous, questions: [...previous.questions, makeQuestion()] }))} className="inline-flex items-center gap-1.5 rounded-lg border border-[#168c91]/30 px-3 py-2 text-xs font-bold text-[#147c81] hover:bg-[#e9f7f5]">
                  <Plus className="h-4 w-4" /> Add question
                </button>
              </div>
            </div>

            {form.questions.map((question, questionIndex) => (
              <article key={questionIndex} className="space-y-3 rounded-xl border border-[#d9e3e9] bg-[#f9fbfc] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-[#168c91]">Question {questionIndex + 1}</span>
                  {form.questions.length > 1 && (
                    <button type="button" onClick={() => setForm(previous => ({ ...previous, questions: previous.questions.filter((_, index) => index !== questionIndex) }))} aria-label={`Remove question ${questionIndex + 1}`} title="Remove question" className="rounded-md p-1.5 text-[#9a5460] hover:bg-[#f9e9eb]"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <textarea value={question.prompt} onChange={event => updateQuestion(questionIndex, { prompt: event.target.value })} rows={2} placeholder="Type the question" className="w-full resize-y rounded-lg border border-[#cfdae3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168c91]" required />
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className={`flex items-center gap-2 rounded-lg border p-2 ${question.correctOption === optionIndex ? 'border-[#18a2a0] bg-[#eaf8f6]' : 'border-[#d9e3e9] bg-white'}`}>
                      <input type="radio" name={`correct-${questionIndex}`} checked={question.correctOption === optionIndex} onChange={() => updateQuestion(questionIndex, { correctOption: optionIndex })} aria-label={`Mark option ${String.fromCharCode(65 + optionIndex)} correct`} className="accent-[#139395]" />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf2f6] text-[10px] font-black text-[#44576b]">{String.fromCharCode(65 + optionIndex)}</span>
                      <input value={option} onChange={event => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Answer ${String.fromCharCode(65 + optionIndex)}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" required />
                      {question.options.length > 2 && <button type="button" onClick={() => removeOption(questionIndex, optionIndex)} aria-label="Remove answer choice" className="rounded p-1 text-[#8b99a5] hover:bg-[#edf2f6]"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {question.options.length < 6 && <button type="button" onClick={() => addOption(questionIndex)} className="text-xs font-bold text-[#147c81] hover:underline">+ Add answer choice</button>}
                  <div className="flex min-w-[14rem] flex-1 gap-2">
                    <input value={question.explanation} onChange={event => updateQuestion(questionIndex, { explanation: event.target.value })} placeholder="Answer explanation (optional)" className="min-w-0 flex-1 rounded-lg border border-[#cfdae3] bg-white px-3 py-2 text-xs outline-none focus:border-[#168c91]" />
                    <button type="button" onClick={() => saveToBank(question)} title="Save this question to the school question bank" className="shrink-0 rounded-lg border border-[#168c91]/30 px-2.5 text-[10px] font-bold text-[#147c81] hover:bg-[#e9f7f5]">Save to bank</button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-dashed border-[#b9c9d4] bg-[#fbfcfd] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#168c91]" />
                <div><h4 className="text-sm font-black">Study resources</h4><p className="text-[11px] text-[#718191]">Upload past papers, revision notes, or guides.</p></div>
              </div>
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#173752] px-3 py-2 text-xs font-bold text-white hover:bg-[#214b6c] ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload resource'}
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={uploadResource} className="sr-only" />
              </label>
            </div>
            {form.resources.length > 0 && <div className="space-y-2">
              {form.resources.map((resource, index) => (
                <div key={`${resource.url}-${index}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-[#168c91]" />
                  <input value={resource.title} onChange={event => setForm(previous => ({ ...previous, resources: previous.resources.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} className="min-w-28 flex-1 bg-transparent text-xs font-semibold outline-none" />
                  <select value={resource.type} onChange={event => setForm(previous => ({ ...previous, resources: previous.resources.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item) }))} className="rounded border border-[#d9e3e9] bg-white px-2 py-1 text-[10px]">
                    <option value="study-guide">Study guide</option><option value="question-paper">Question paper</option><option value="reference">Reference</option><option value="other">Other</option>
                  </select>
                  <button type="button" onClick={() => setForm(previous => ({ ...previous, resources: previous.resources.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Remove resource" className="rounded p-1 text-[#9a5460] hover:bg-[#f9e9eb]"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>}
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#e7edf1] pt-4">
            <button type="button" disabled={saving || uploading} onClick={event => saveExam(event, 'draft')} className="inline-flex items-center gap-2 rounded-lg border border-[#cbd7df] px-4 py-2.5 text-xs font-bold text-[#44576b] hover:bg-[#f4f7f9] disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button>
            <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-[#f2c343] px-4 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e9b92c] disabled:opacity-50"><Send className="h-4 w-4" /> {saving ? 'Saving...' : 'Publish to students'}</button>
          </div>
        </form>

        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black">Published & draft exams</h3>
            <button type="button" onClick={loadExams} className="text-xs font-bold text-[#147c81] hover:underline">Refresh</button>
          </div>
          {loading ? <div className="rounded-xl border border-[#d7e1e8] bg-white p-6 text-center text-sm text-[#718191]">Loading practice exams...</div> : exams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#c8d5dd] bg-white p-6 text-center text-sm text-[#718191]">No practice exams created yet.</div>
          ) : exams.map(exam => (
            <article key={exam._id} className="space-y-3 rounded-xl border border-[#d7e1e8] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-black text-[#172536]">{exam.title}</h4>
                  <p className="mt-1 text-xs text-[#718191]">Grade {exam.grade} · {exam.subject} · {exam.durationMinutes} min</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${exam.status === 'published' ? 'bg-[#e0f4f2] text-[#147c81]' : 'bg-[#eef1f4] text-[#5f7182]'}`}>{exam.status}</span>
              </div>
              <p className="text-[11px] text-[#718191]">{exam.questionCount ?? exam.questions?.length ?? 0} questions · {exam.resources?.length || 0} resources</p>
              <div className="flex items-center justify-between border-t border-[#edf1f4] pt-2">
                <button type="button" onClick={() => updateStatus(exam, exam.status === 'published' ? 'draft' : 'published')} className="text-xs font-bold text-[#147c81] hover:underline">
                  {exam.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" onClick={() => deleteExam(exam)} title="Delete exam" className="rounded-md p-1.5 text-[#a34f5c] hover:bg-[#faebed]"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </aside>
      </div>

      {showBankPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#102131]/65 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="question-bank-picker-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d7e1e8] bg-[#f7fafb] shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-[#dce5ea] bg-white px-5 py-4">
              <div><h2 id="question-bank-picker-title" className="font-black">Add questions from bank</h2><p className="mt-1 text-xs text-[#718191]">Questions matching this exam’s grade and subject are shown first.</p></div>
              <button type="button" onClick={() => setShowBankPicker(false)} aria-label="Close question bank" className="rounded-lg p-2 text-[#52677b] hover:bg-[#f0f4f7]"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid gap-2 border-b border-[#dce5ea] bg-white px-5 py-3 sm:grid-cols-2">
              <input value={bankSearch} onChange={event => setBankSearch(event.target.value)} placeholder="Search by question or topic" className="rounded-lg border border-[#cfdae3] px-3 py-2 text-sm outline-none focus:border-[#168c91]" />
              <input value={bankSubject} onChange={event => setBankSubject(event.target.value)} placeholder="Subject" className="rounded-lg border border-[#cfdae3] px-3 py-2 text-sm outline-none focus:border-[#168c91]" />
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {bankLoading ? <p className="p-6 text-center text-sm text-[#718191]">Loading questions...</p> : bankQuestions.length === 0 ? <p className="p-6 text-center text-sm text-[#718191]">No matching bank questions. You can create one in the Question bank workspace.</p> : bankQuestions.map(question => {
                const selected = selectedBankQuestions.some(item => item._id === question._id);
                return (
                  <button key={question._id} type="button" onClick={() => setSelectedBankQuestions(previous => selected ? previous.filter(item => item._id !== question._id) : [...previous, question])} className={`block w-full rounded-xl border p-3 text-left ${selected ? 'border-[#168c91] bg-[#eaf8f6]' : 'border-[#d7e1e8] bg-white hover:border-[#168c91]/50'}`}>
                    <span className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#168c91] bg-[#168c91] text-white' : 'border-[#bdcbd4] text-transparent'}`}><Plus className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-[#172536]">{question.prompt}</span>
                        <span className="mt-1 block text-[10px] text-[#718191]">Grade {question.grade} · {question.subject}{question.topic ? ` · ${question.topic}` : ''} · {question.difficulty}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-[#dce5ea] bg-white px-5 py-3">
              <p className="text-xs text-[#718191]">{selectedBankQuestions.length} selected</p>
              <div className="flex gap-2"><button type="button" onClick={() => setShowBankPicker(false)} className="rounded-lg border border-[#cbd7df] px-3 py-2 text-xs font-bold text-[#52677b]">Cancel</button><button type="button" disabled={selectedBankQuestions.length === 0} onClick={addSelectedBankQuestions} className="rounded-lg bg-[#173752] px-4 py-2 text-xs font-black text-white disabled:opacity-40">Add selected</button></div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default NationalExamManager;