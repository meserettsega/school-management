import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Download, ExternalLink, Flag, GraduationCap, Play, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { downloadProxiedFile, openProxiedFile } from '../utils/fileProxy';

const serializeAnswers = answers => Object.entries(answers).map(([questionIndex, answer]) => ({
  questionIndex: Number(questionIndex),
  selectedOption: answer.selectedOption,
  flagged: answer.flagged,
}));

const getAttemptAnswers = answers => Object.fromEntries(
  (answers || []).map(answer => [answer.questionIndex, {
    selectedOption: answer.selectedOption ?? null,
    flagged: Boolean(answer.flagged),
  }])
);

const formatClock = seconds => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
};

const NationalExamCenter = () => {
  const [exams, setExams] = useState([]);
  const [libraryResources, setLibraryResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState('All changes saved');
  const [review, setReview] = useState(null);
  const [examError, setExamError] = useState('');
  const submittingRef = useRef(false);

  const loadExams = async () => {
    try {
      const response = await apiClient.get('/national-exams');
      setExams(response.data.exams || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load national practice exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    apiClient.get('/national-exams/resources')
      .then(response => setLibraryResources(response.data.resources || []))
      .catch(error => toast.error(error.response?.data?.message || 'Could not load study materials.'))
      .finally(() => setResourcesLoading(false));
  }, []);

  const saveAnswersNow = async (attemptId, currentAnswers) => {
    if (!attemptId || submittingRef.current) return;
    setSaveState('Saving answers...');
    try {
      await apiClient.put(`/national-exams/attempts/${attemptId}/answers`, {
        answers: serializeAnswers(currentAnswers),
      });
      setSaveState(`Saved at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`);
    } catch (error) {
      if (error.response?.status === 410) {
        setSaveState('Time limit reached. Submitting your answers...');
      } else if (!submittingRef.current) {
        setSaveState('Could not save. Check your connection.');
      }
    }
  };

  useEffect(() => {
    if (!attempt || attempt.status !== 'in-progress') return undefined;
    const timeoutId = window.setTimeout(() => saveAnswersNow(attempt._id, answers), 500);
    return () => window.clearTimeout(timeoutId);
  }, [answers, attempt?._id, attempt?.status]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in-progress') return undefined;
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [attempt?._id, attempt?.status]);

  const remainingSeconds = attempt?.expiresAt
    ? Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - clockNow) / 1000))
    : 0;

  const submitExam = async (automatic = false) => {
    if (!attempt?._id || attempt.status !== 'in-progress' || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/national-exams/attempts/${attempt._id}/submit`, {
        answers: serializeAnswers(answers),
      });
      setAttempt(response.data.attempt);
      setSelectedExam(response.data.exam);
      setReview(response.data.review);
      setConfirmSubmit(false);
      setSaveState('Submission received');
      await loadExams();
      if (automatic) toast('Time is up. Your answers were submitted.', { icon: '⏱' });
      else toast.success('Practice exam submitted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit the exam.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (attempt?.status === 'in-progress' && remainingSeconds === 0 && !submittingRef.current) {
      submitExam(true);
    }
  }, [attempt?.status, remainingSeconds]);

  const beginAttempt = async (exam) => {
    try {
      setExamError('');
      const response = await apiClient.post(`/national-exams/${exam._id}/start`);
      setSelectedExam(response.data.exam);
      setAttempt(response.data.attempt);
      setAnswers({});
      setQuestionIndex(0);
      setReview(null);
      setClockNow(Date.now());
      setSaveState('All changes saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not start this practice exam.');
    }
  };

  const resumeAttempt = async (attemptId) => {
    try {
      const response = await apiClient.get(`/national-exams/attempts/${attemptId}`);
      setSelectedExam(response.data.exam);
      setAttempt(response.data.attempt);
      setAnswers(getAttemptAnswers(response.data.attempt.answers));
      setQuestionIndex(0);
      setReview(response.data.review || null);
      setClockNow(Date.now());
      setSaveState('All changes saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reopen this attempt.');
    }
  };

  const closeExam = () => {
    if (attempt?.status === 'in-progress' && !window.confirm('Leave this practice exam? Your saved answers will be available when you return.')) return;
    setSelectedExam(null);
    setAttempt(null);
    setReview(null);
    setConfirmSubmit(false);
    loadExams();
  };

  const updateAnswer = (index, updates) => {
    setAnswers(previous => ({
      ...previous,
      [index]: { selectedOption: null, flagged: false, ...previous[index], ...updates },
    }));
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter(answer => answer.selectedOption !== null && answer.selectedOption !== undefined).length,
    [answers]
  );

  const openResourceCount = exams.reduce((total, exam) => total + (exam.resources?.length || 0), 0);

  if (selectedExam && attempt) {
    const currentQuestion = selectedExam.questions[questionIndex];
    const currentAnswer = answers[questionIndex] || { selectedOption: null, flagged: false };
    const progress = selectedExam.questions.length ? Math.round(((questionIndex + 1) / selectedExam.questions.length) * 100) : 0;
    const resultPercent = review?.maxScore ? Math.round((review.score / review.maxScore) * 100) : 0;

    return (
      <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#101d2b] text-[#f4f7fa]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#2c4d73] px-5 py-3 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-black sm:text-base">Grade {selectedExam.grade} {selectedExam.subject}</p>
            <p className="mt-0.5 truncate text-xs text-[#d5e2ee]">{selectedExam.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {attempt.status === 'in-progress' ? (
              <div className="text-right">
                <p className={`rounded-xl bg-white px-3 py-1 font-mono text-xl font-black tabular-nums sm:text-3xl ${remainingSeconds < 300 ? 'text-rose-600' : 'text-[#2c4d73]'}`}>{formatClock(remainingSeconds)}</p>
                <p className="mt-1 hidden text-[10px] font-semibold text-white/80 sm:block">time left · school clock</p>
              </div>
            ) : (
              <button type="button" onClick={closeExam} aria-label="Return to practice exams" title="Return to practice exams" className="rounded-lg p-2 text-white hover:bg-white/10"><X className="h-5 w-5" /></button>
            )}
          </div>
        </header>

        {attempt.status === 'in-progress' && <div className="h-1.5 bg-[#25384a]"><div className="h-full bg-[#f2c343] transition-[width]" style={{ width: `${progress}%` }} /></div>}

        {review ? (
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-5xl space-y-5">
              <section className="rounded-2xl border border-white/10 bg-[#162536] p-6 text-center sm:p-10">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#51c9c2]" />
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#8ea9c0]">Practice complete</p>
                <h1 className="mt-2 text-3xl font-black sm:text-5xl">{review.score} <span className="text-xl text-[#92a7bb]">/ {review.maxScore}</span></h1>
                <p className="mt-2 text-lg font-bold text-[#f2c343]">{resultPercent}%</p>
                <button type="button" onClick={closeExam} className="mt-6 rounded-lg bg-[#f2c343] px-5 py-3 text-sm font-black text-[#172536] hover:bg-[#e8b92f]">Back to practice exams</button>
              </section>
              <div className="space-y-3">
                <h2 className="text-lg font-black">Answer review</h2>
                {selectedExam.questions.map((question, index) => {
                  const questionReview = review.review?.[index];
                  return (
                    <article key={question._id || index} className={`rounded-xl border p-4 ${questionReview?.isCorrect ? 'border-emerald-400/30 bg-emerald-950/30' : 'border-rose-400/30 bg-rose-950/25'}`}>
                      <p className="text-sm font-bold">{index + 1}. {question.prompt}</p>
                      <p className="mt-2 text-xs text-[#b7c5d2]">Your answer: {questionReview?.selectedOption === null ? 'Not answered' : question.options[questionReview?.selectedOption]}</p>
                      <p className="mt-1 text-xs font-bold text-[#64d5cd]">Correct answer: {question.options[questionReview?.correctOption]}</p>
                      {questionReview?.explanation && <p className="mt-2 text-xs leading-relaxed text-[#bdcad6]">{questionReview.explanation}</p>}
                    </article>
                  );
                })}
              </div>
            </div>
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
              <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
                <section className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#b8c8d7]">Question {questionIndex + 1} of {selectedExam.questions.length}</p>
                    {selectedExam.description && <p className="text-xs text-[#91a9bd]">{selectedExam.description}</p>}
                  </div>
                  <h1 className="mt-4 text-lg font-black leading-relaxed sm:text-2xl">{currentQuestion?.prompt}</h1>

                  <div className="mt-5 space-y-2.5">
                    {currentQuestion?.options.map((option, optionIndex) => {
                      const selected = currentAnswer.selectedOption === optionIndex;
                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          disabled={attempt.status !== 'in-progress'}
                          onClick={() => updateAnswer(questionIndex, { selectedOption: optionIndex })}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition sm:px-4 ${selected ? 'border-[#f2c343] bg-[#3a300c] text-white' : 'border-[#2c4054] bg-[#152332] text-[#f2f5f8] hover:border-[#48c2c0]/70 hover:bg-[#192b3d]'}`}
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${selected ? 'bg-[#f2c343] text-[#182536]' : 'bg-[#20344a] text-white'}`}>{String.fromCharCode(65 + optionIndex)}</span>
                          <span className="text-sm font-semibold sm:text-base">{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(index => index - 1)} className="rounded-lg border border-[#31485e] px-4 py-2.5 text-xs font-bold hover:bg-white/5 disabled:opacity-40"><ArrowLeft className="mr-1 inline h-4 w-4" />Previous</button>
                    <button type="button" disabled={attempt.status !== 'in-progress'} onClick={() => updateAnswer(questionIndex, { flagged: !currentAnswer.flagged })} className={`rounded-lg border px-4 py-2.5 text-xs font-bold ${currentAnswer.flagged ? 'border-[#f1a348] bg-[#4a3317] text-[#ffd08a]' : 'border-[#31485e] text-[#dce5ed] hover:bg-white/5'}`}><Flag className="mr-1 inline h-4 w-4" />{currentAnswer.flagged ? 'Flagged' : 'Flag for review'}</button>
                    <button type="button" disabled={questionIndex >= selectedExam.questions.length - 1} onClick={() => setQuestionIndex(index => index + 1)} className="rounded-lg bg-[#f2c343] px-4 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e8b92f] disabled:opacity-40">Next<ArrowRight className="ml-1 inline h-4 w-4" /></button>
                  </div>
                </section>

                <aside className="space-y-4 rounded-xl border border-[#2a4055] bg-[#142334] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-bold text-[#dbe7f0]">Question navigator</h2>
                    <span className="text-[10px] text-[#8ea5b9]">{answeredCount}/{selectedExam.questions.length}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
                    {selectedExam.questions.map((_, index) => {
                      const answer = answers[index];
                      const answered = answer?.selectedOption !== null && answer?.selectedOption !== undefined;
                      return (
                        <button key={index} type="button" onClick={() => setQuestionIndex(index)} aria-label={`Go to question ${index + 1}`} className={`aspect-square rounded-md text-[10px] font-black transition ${index === questionIndex ? 'ring-2 ring-white ring-offset-1 ring-offset-[#142334]' : ''} ${answer?.flagged ? 'bg-[#f1a348] text-[#182536]' : answered ? 'bg-[#48c2c0] text-[#10232a]' : 'bg-[#1d3043] text-[#93a9bd] hover:bg-[#2b4258]'}`}>
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2 border-t border-white/10 pt-3 text-[10px] text-[#c0ced9]">
                    <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#48c2c0]" />Answered</p>
                    <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#f1a348]" />Flagged for review</p>
                    <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#1d3043]" />Not answered</p>
                  </div>
                </aside>
              </div>
            </main>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2b4054] bg-[#142334] px-4 py-3 sm:px-8">
              <p className="flex items-center gap-2 text-xs text-[#9db0c1]"><ShieldCheck className="h-4 w-4 text-[#48c2c0]" />{saveState}</p>
              <button type="button" disabled={submitting} onClick={() => setConfirmSubmit(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#f2c343] px-4 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e8b92f] disabled:opacity-50"><Send className="h-4 w-4" />Submit exam</button>
            </footer>
          </>
        )}

        {confirmSubmit && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/65 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="submit-confirm-title" className="w-full max-w-md rounded-2xl border border-[#2c4054] bg-[#172637] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 id="submit-confirm-title" className="text-lg font-black">Submit this exam?</h2><p className="mt-2 text-sm text-[#b2c0cc]">{selectedExam.questions.length - answeredCount} question(s) are unanswered. You cannot change answers after submission.</p></div>
                <button type="button" onClick={() => setConfirmSubmit(false)} aria-label="Close confirmation" className="rounded-lg p-1.5 text-[#b2c0cc] hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmSubmit(false)} className="rounded-lg border border-[#41576b] px-4 py-2 text-xs font-bold text-white">Keep working</button>
                <button type="button" disabled={submitting} onClick={() => submitExam(false)} className="rounded-lg bg-[#f2c343] px-4 py-2 text-xs font-black text-[#172536] disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit now'}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#172536]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8e2e8] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#168c91]">National assessment preparation</p>
          <h2 className="mt-1 text-2xl font-black">Practice exams</h2>
          <p className="mt-1 text-sm text-[#627586]">Timed mock exams and school-provided study resources for Grades 6, 8, and 12.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#d7e1e8] bg-white px-3 py-2 text-xs font-semibold text-[#506477]">
          <GraduationCap className="h-4 w-4 text-[#168c91]" /> {exams.length} available
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">My study materials</h3>
            <p className="mt-1 text-xs text-[#718191]">Resources saved by your school stay here after you sign out.</p>
          </div>
          <span className="rounded-full bg-[#e2f5f3] px-3 py-1.5 text-[10px] font-bold text-[#147c81]">{libraryResources.length} materials</span>
        </div>
        {resourcesLoading ? (
          <div className="rounded-xl border border-[#d7e1e8] bg-white p-5 text-center text-sm text-[#718191]">Loading school materials...</div>
        ) : libraryResources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c5d3dc] bg-white p-5 text-center text-sm text-[#718191]">Your school has not uploaded study materials for your grade yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {libraryResources.map(resource => (
              <article key={resource._id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#d7e1e8] bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2f5f3] text-[#147c81]"><BookOpen className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black text-[#172536]">{resource.title}</h4>
                  <p className="mt-0.5 truncate text-[10px] text-[#718191]">{resource.subject}{resource.topic ? ` · ${resource.topic}` : ''} · {resource.type.replace('-', ' ')}</p>
                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={() => openProxiedFile(resource.url)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#147c81] hover:underline"><ExternalLink className="h-3 w-3" />Open</button>
                    <button type="button" onClick={() => downloadProxiedFile(resource.url, resource.fileName || resource.title)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#147c81] hover:underline"><Download className="h-3 w-3" />Download</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {examError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{examError}</p>}
      {loading ? <div className="rounded-xl border border-[#d7e1e8] bg-white p-10 text-center text-sm text-[#718191]">Loading your practice center...</div> : exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c5d3dc] bg-white p-10 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-[#8ca2b1]" />
          <h3 className="mt-3 font-black">No practice exams yet</h3>
          <p className="mt-1 text-sm text-[#718191]">Your school will publish Grade 6, 8, or 12 practice exams here.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {exams.map(exam => {
            const inProgress = exam.latestAttempt?.status === 'in-progress';
            const completed = exam.latestAttempt?.status === 'submitted';
            const attemptsRemaining = exam.attemptsAllowed > 0 ? Math.max(0, exam.attemptsAllowed - (exam.attemptCount || 0)) : null;
            const canStart = !inProgress && (attemptsRemaining === null || attemptsRemaining > 0);
            return (
              <article key={exam._id} className="overflow-hidden rounded-2xl border border-[#d7e1e8] bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 bg-[#173752] px-5 py-4 text-white">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#62d0c8]">Grade {exam.grade} · {exam.subject}</p>
                    <h3 className="mt-1 truncate text-lg font-black">{exam.title}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">{exam.questionCount} questions</span>
                </div>
                <div className="space-y-4 p-5">
                  {exam.description && <p className="text-sm leading-relaxed text-[#607385]">{exam.description}</p>}
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-[#506477]">
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#f0f4f7] px-2.5 py-1.5"><Clock3 className="h-3.5 w-3.5" />{exam.durationMinutes} min</span>
                    <span className="rounded-lg bg-[#f0f4f7] px-2.5 py-1.5">{exam.attemptsAllowed > 0 ? `${attemptsRemaining} attempt(s) left` : 'Unlimited practice'}</span>
                    {completed && <span className="rounded-lg bg-[#e4f5ef] px-2.5 py-1.5 text-[#22775a]">Last score: {exam.latestAttempt.score}/{exam.latestAttempt.maxScore}</span>}
                    {inProgress && <span className="rounded-lg bg-[#fff3d2] px-2.5 py-1.5 text-[#8b6410]">Attempt in progress</span>}
                  </div>

                  {exam.resources?.length > 0 && (
                    <div className="border-t border-[#e7edf1] pt-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-[#748797]">Study resources</p>
                      <div className="flex flex-wrap gap-2">
                        {exam.resources.map(resource => (
                          <div key={resource._id || resource.url} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d9e3e9] bg-white px-2.5 py-1.5">
                            <span className="max-w-48 truncate text-xs font-bold text-[#405668]">{resource.title}</span>
                            <button type="button" onClick={() => openProxiedFile(resource.url)} className="text-[10px] font-bold text-[#147c81] hover:underline">Open</button>
                            <button type="button" onClick={() => downloadProxiedFile(resource.url, resource.title)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#147c81] hover:underline"><Download className="h-3 w-3" />Download</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf1] pt-3">
                    <p className="text-[10px] text-[#778998]">{exam.latestAttempt?.submittedAt ? `Last completed ${new Date(exam.latestAttempt.submittedAt).toLocaleDateString()}` : 'Your answers save automatically.'}</p>
                    {inProgress ? (
                      <button type="button" onClick={() => resumeAttempt(exam.latestAttempt._id)} className="inline-flex items-center gap-2 rounded-lg bg-[#f2c343] px-4 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e8b92f]"><RotateCcw className="h-4 w-4" />Resume attempt</button>
                    ) : completed ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => resumeAttempt(exam.latestAttempt._id)} className="rounded-lg border border-[#cbd7df] px-3 py-2.5 text-xs font-bold text-[#44576b] hover:bg-[#f4f7f9]">Review answers</button>
                        {canStart && <button type="button" onClick={() => beginAttempt(exam)} className="inline-flex items-center gap-2 rounded-lg bg-[#f2c343] px-3 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e8b92f]"><Play className="h-4 w-4" />Practice again</button>}
                      </div>
                    ) : canStart ? (
                      <button type="button" onClick={() => beginAttempt(exam)} className="inline-flex items-center gap-2 rounded-lg bg-[#f2c343] px-4 py-2.5 text-xs font-black text-[#172536] hover:bg-[#e8b92f]"><Play className="h-4 w-4" />Start practice</button>
                    ) : <span className="text-xs font-bold text-[#8a5660]">Attempts used</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmSubmit && <span className="sr-only">Submission confirmation open</span>}
    </div>
  );
};

export default NationalExamCenter;