const db = require('../models/db');
const bcrypt = require('bcrypt');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');

const escapeXml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const splitFullName = (fullName = '') => {
    const normalized = String(fullName || '').trim().replace(/\s+/g, ' ');
    if (!normalized) {
        return { firstName: '', lastName: '' };
    }

    const parts = normalized.split(' ');
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');
    return { firstName, lastName };
};

const normalizeStudentPayload = (body = {}) => {
    const fullName = String(body.full_name || '').trim().replace(/\s+/g, ' ');
    const studentId = String(body.student_id || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const programDepartment = String(body.program_department || '').trim();
    const yearRaw = String(body.year_of_study || '').trim();
    const parsedYear = Number.parseInt(yearRaw, 10);
    const statusRaw = String(body.status || '').trim().toLowerCase();
    const status = statusRaw === 'inactive' ? 'Inactive' : 'Active';

    return {
        fullName,
        studentId,
        email,
        programDepartment,
        yearOfStudy: Number.isNaN(parsedYear) ? null : parsedYear,
        status,
    };
};

// List Students
exports.listStudents = async (req, res) => {
    const query = `
            SELECT
                s.*,
                COALESCE(NULLIF(trim(s.full_name), ''), trim(COALESCE(s.name, '') || ' ' || COALESCE(s.surname, ''))) AS display_full_name,
                COALESCE(NULLIF(trim(s.status), ''), 'Active') AS display_status,
                u.username,
                u.role
      FROM students s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `;

    try {
        const [students, deletedEmailLocks] = await Promise.all([
            dbAll(query),
            dbAll(
                `SELECT id, email, deleted_user_id, deleted_at, lock_note
                 FROM account_deletion_locks
                 ORDER BY deleted_at DESC`
            )
        ]);

        return res.render('students/list', {
            students,
            deletedEmailLocks,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Database error');
    }
};

exports.viewStudentDetails = async (req, res) => {
    const id = req.params.id;

    try {
        const row = await dbGet(
            `SELECT
               s.*,
               COALESCE(NULLIF(trim(s.full_name), ''), trim(COALESCE(s.name, '') || ' ' || COALESCE(s.surname, ''))) AS display_full_name,
               COALESCE(NULLIF(trim(s.status), ''), 'Active') AS display_status,
               u.username,
               u.role
             FROM students s
             LEFT JOIN users u ON u.id = s.user_id
             WHERE s.id = ?`,
            [id]
        );

        if (!row) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        return res.render('students/detail', { student: row });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Student not found');
        return res.redirect('/admin/students');
    }
};

exports.unlockDeletedAccountEmail = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
        req.flash('error_msg', 'Please enter an email to unlock');
        return res.redirect('/admin/students');
    }

    try {
        const deleted = await dbRun('DELETE FROM account_deletion_locks WHERE lower(email) = lower(?)', [email]);

        if (!deleted.changes) {
            req.flash('error_msg', 'No locked deleted-account email found for that address');
            return res.redirect('/admin/students');
        }

        req.flash('success_msg', 'Deleted-account email lock removed. This email can register again.');
        return res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Could not unlock deleted-account email');
        return res.redirect('/admin/students');
    }
};

// Add Student Form
exports.newStudentForm = (req, res) => {
    res.render('students/add');
};

// Create Student
exports.createStudent = async (req, res) => {
    const payload = normalizeStudentPayload(req.body);
    const { firstName, lastName } = splitFullName(payload.fullName);

    try {
        if (!payload.fullName || !payload.studentId || !payload.email || !payload.programDepartment || !payload.yearOfStudy) {
            req.flash('error_msg', 'Please fill all required fields');
            return res.redirect('/admin/students/new');
        }

        if (payload.yearOfStudy < 1 || payload.yearOfStudy > 12) {
            req.flash('error_msg', 'Year of study must be between 1 and 12');
            return res.redirect('/admin/students/new');
        }

        let linkedUser = null;
        linkedUser = await dbGet('SELECT id, role FROM users WHERE lower(email) = lower(?) LIMIT 1', [payload.email]);

        await dbRun(
            `INSERT INTO students (full_name, name, surname, student_id, email, user_id, group_name, program_department, year_of_study, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.fullName,
                firstName || payload.fullName,
                lastName || '',
                payload.studentId,
                payload.email,
                linkedUser?.id || null,
                null,
                payload.programDepartment,
                payload.yearOfStudy,
                payload.status,
            ]
        );

        if (linkedUser && linkedUser.role !== 'admin') {
            await dbRun(
                'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
                [firstName || payload.fullName, lastName || null, payload.email, linkedUser.id]
            );
        }

        req.flash('success_msg', 'Student added successfully');
        return res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding student (ID/Email may be duplicate)');
        return res.redirect('/admin/students/new');
    }
};

// Edit Student Form
exports.editStudentForm = async (req, res) => {
    const id = req.params.id;

    try {
        const row = await dbGet(
            `SELECT
               s.*,
               COALESCE(NULLIF(trim(s.full_name), ''), trim(COALESCE(s.name, '') || ' ' || COALESCE(s.surname, ''))) AS display_full_name,
               COALESCE(NULLIF(trim(s.status), ''), 'Active') AS display_status,
               u.username,
               u.role
             FROM students s
             LEFT JOIN users u ON u.id = s.user_id
             WHERE s.id = ?`,
            [id]
        );

        if (!row) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        return res.render('students/edit', { student: row });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Student not found');
        return res.redirect('/admin/students');
    }
};

// Update Student
exports.updateStudent = async (req, res) => {
    const id = req.params.id;
    const payload = normalizeStudentPayload(req.body);
    const { firstName, lastName } = splitFullName(payload.fullName);
    const username = (req.body.username || '').trim();
    const newPassword = req.body.new_password || '';
    const confirmPassword = req.body.confirm_password || '';

    try {
        if (!payload.fullName || !payload.studentId || !payload.email || !payload.programDepartment || !payload.yearOfStudy) {
            req.flash('error_msg', 'Please fill all required fields');
            return res.redirect(`/admin/students/${id}/edit`);
        }

        if (payload.yearOfStudy < 1 || payload.yearOfStudy > 12) {
            req.flash('error_msg', 'Year of study must be between 1 and 12');
            return res.redirect(`/admin/students/${id}/edit`);
        }

        const student = await dbGet('SELECT * FROM students WHERE id = ?', [id]);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        let linkedUser = null;
        if (student.user_id) {
            linkedUser = await dbGet('SELECT * FROM users WHERE id = ?', [student.user_id]);
        }

        if (!linkedUser && payload.email) {
            linkedUser = await dbGet('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1', [payload.email]);
        }

        if (linkedUser && linkedUser.role === 'admin') {
            req.flash('error_msg', 'Admin user cannot be modified from this page');
            return res.redirect(`/admin/students/${id}/edit`);
        }

        if (newPassword || confirmPassword) {
            if (!linkedUser) {
                req.flash('error_msg', 'No linked user account found for password change');
                return res.redirect(`/admin/students/${id}/edit`);
            }

            if (newPassword.length < 6) {
                req.flash('error_msg', 'New password must be at least 6 characters');
                return res.redirect(`/admin/students/${id}/edit`);
            }

            if (newPassword !== confirmPassword) {
                req.flash('error_msg', 'New passwords do not match');
                return res.redirect(`/admin/students/${id}/edit`);
            }
        }

        await dbRun(
            `UPDATE students
             SET full_name = ?,
                 name = ?,
                 surname = ?,
                 student_id = ?,
                 email = ?,
                 user_id = ?,
                 program_department = ?,
                 year_of_study = ?,
                 status = ?
             WHERE id = ?`,
            [
                payload.fullName,
                firstName || payload.fullName,
                lastName || '',
                payload.studentId,
                payload.email,
                linkedUser?.id || null,
                payload.programDepartment,
                payload.yearOfStudy,
                payload.status,
                id,
            ]
        );

        if (linkedUser) {
            const nextUsername = username || linkedUser.username;
            await dbRun(
                'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ? WHERE id = ?',
                [firstName || payload.fullName, lastName || null, nextUsername, payload.email, linkedUser.id]
            );

            if (newPassword) {
                const passwordHash = await bcrypt.hash(newPassword, 10);
                await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, linkedUser.id]);
            }
        }

        req.flash('success_msg', 'Student and linked user updated successfully');
        return res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating student/user (username, email, or student id may be duplicate)');
        return res.redirect(`/admin/students/${id}/edit`);
    }
};

// Delete Student
exports.deleteStudent = async (req, res) => {
    const id = req.params.id;
    const deleteConfirm = (req.body.delete_confirm || '').trim();

    if (deleteConfirm !== 'DELETE') {
        req.flash('error_msg', 'Delete canceled. Confirmation text did not match.');
        return res.redirect('/admin/students');
    }

    try {
        const student = await dbGet(
            `SELECT s.*, u.id as linked_user_id, u.role as linked_user_role
             FROM students s
             LEFT JOIN users u ON u.id = s.user_id
             WHERE s.id = ?`,
            [id]
        );

        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        if (student.linked_user_role === 'admin') {
            req.flash('error_msg', 'Admin user cannot be deleted from students page');
            return res.redirect('/admin/students');
        }

        if (student.linked_user_id) {
            await dbRun('DELETE FROM users WHERE id = ?', [student.linked_user_id]);
        }

        await dbRun('DELETE FROM students WHERE id = ?', [id]);

        req.flash('success_msg', 'Student and linked user deleted from database');
        return res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting student/user');
        return res.redirect('/admin/students');
    }
};

// XML Export
exports.exportXML = (req, res) => {
    const query = "SELECT * FROM students";
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).send("Database error");
        }
        
        // Simple XML construction
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?xml-stylesheet type="text/xsl" href="/xsl/students.xsl"?>\n'; // Link to XSLT
        xml += '<students>\n';
        rows.forEach(student => {
            xml += '  <student>\n';
            xml += `    <id>${escapeXml(student.id)}</id>\n`;
            xml += `    <full_name>${escapeXml(student.full_name || `${student.name || ''} ${student.surname || ''}`.trim())}</full_name>\n`;
            xml += `    <student_id>${escapeXml(student.student_id)}</student_id>\n`;
            xml += `    <email>${escapeXml(student.email)}</email>\n`;
            xml += `    <program_department>${escapeXml(student.program_department)}</program_department>\n`;
            xml += `    <year_of_study>${escapeXml(student.year_of_study)}</year_of_study>\n`;
            xml += `    <status>${escapeXml(student.status || 'Active')}</status>\n`;
            xml += '  </student>\n';
        });
        xml += '</students>';

        res.set('Content-Type', 'text/xml');
        res.send(xml);
    });
};
