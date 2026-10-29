// Runtime validation coverage for the teacher's assignment overview.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TeacherOverview from './TeacherOverview';
import TeacherDirectory from './TeacherDirectory';

describe('TeacherOverview', () => {
  it('renders the signed-in teacher summary and assigned class information', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TeacherOverview, {
        teacher: { name: 'Mulugeta Haile' },
        overview: {
          teacherStatus: 'Active',
          stats: {
            totalStudents: 31,
            periodsPerWeek: 24,
            attendancePercentage: 96,
            attendanceRecords: 120,
          },
          assignments: [{
            classId: 'class-1',
            subjectId: 'subject-1',
            subjectName: 'Mathematics',
            subjectCode: 'MATH',
            classLabel: 'Grade 7 - A',
            studentCount: 31,
            periodsPerWeek: 24,
            attendancePercentage: 96,
          }],
        },
        error: '',
        onOpenTab: () => {},
      })
    );

    expect(markup).toContain('Welcome, Mulugeta Haile');
    expect(markup).toContain('Mathematics');
    expect(markup).toContain('Grade 7 - A');
    expect(markup).toContain('31');
    expect(markup).toContain('96%');
  });

  it('shows an honest empty state when no assignments have been configured', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TeacherOverview, {
        teacher: { name: 'Teacher' },
        overview: { assignments: [], stats: {}, teacherStatus: 'Active' },
        error: '',
        onOpenTab: () => {},
      })
    );

    expect(markup).toContain('No teaching assignments yet');
    expect(markup).toContain('—');
  });

  it('renders real teacher directory assignments and schedule workload without inventing attendance', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TeacherDirectory, {
        teachers: [{
          _id: 'teacher-1',
          name: 'Tigist Alemayehu',
          email: 'tigist@example.test',
          isActive: true,
          subjectClassAssignments: [{
            subjectId: { _id: 'subject-1', name: 'English' },
            classId: { _id: 'class-1', standard: '5', division: 'A' },
          }],
        }],
        subjects: [{ _id: 'subject-1', name: 'English', assignedTeachers: ['teacher-1'] }],
        classes: [{ _id: 'class-1', standard: '5', division: 'A' }],
        timetables: [{
          isActive: true,
          slots: [
            { teacherId: 'teacher-1', subjectId: 'subject-1', isBreak: false },
            { teacherId: 'teacher-1', subjectId: 'subject-1', isBreak: false },
            { teacherId: 'teacher-1', isBreak: true },
          ],
        }],
        onAddTeacher: () => {},
        onEditTeacher: () => {},
        onDeleteTeacher: () => {},
      })
    );

    expect(markup).toContain('Tigist Alemayehu');
    expect(markup).toContain('English');
    expect(markup).toContain('Grade 5 - A');
    expect(markup).toContain('Not tracked');
    expect(markup).toContain('2');
  });
});
