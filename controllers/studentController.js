const db = require('../models/db');
const bcrypt = require('bcrypt');

const dbGet = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

const dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });

const dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });

// List Students
exports.listStudents = (req, res) => {
    const query = `
      SELECT s.*, u.username, u.role
      FROM students s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.render('students/list', { students: rows });
    });
};

// Add Student Form
exports.newStudentForm = (req, res) => {
    res.render('students/add');
};

// Create Student
exports.createStudent = async (req, res) => {
    const name = (req.body.name || '').trim();
    const surname = (req.body.surname || '').trim();
    const student_id = (req.body.student_id || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const group_name = (req.body.group_name || '').trim();

    try {
        let linkedUser = null;
        if (email) {
            linkedUser = await dbGet('SELECT id, role FROM users WHERE lower(email) = lower(?) LIMIT 1', [email]);
        }

        await dbRun(
            'INSERT INTO students (name, surname, student_id, email, user_id, group_name) VALUES (?, ?, ?, ?, ?, ?)',
            [name, surname, student_id, email || null, linkedUser?.id || null, group_name || null]
        );

        if (linkedUser && linkedUser.role !== 'admin') {
            await dbRun(
                'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
                [name, surname, email, linkedUser.id]
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
            `SELECT s.*, u.username, u.role
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
    const name = (req.body.name || '').trim();
    const surname = (req.body.surname || '').trim();
    const student_id = (req.body.student_id || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const group_name = (req.body.group_name || '').trim();
    const username = (req.body.username || '').trim();
    const newPassword = req.body.new_password || '';
    const confirmPassword = req.body.confirm_password || '';

    try {
        const student = await dbGet('SELECT * FROM students WHERE id = ?', [id]);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        let linkedUser = null;
        if (student.user_id) {
            linkedUser = await dbGet('SELECT * FROM users WHERE id = ?', [student.user_id]);
        }

        if (!linkedUser && email) {
            linkedUser = await dbGet('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1', [email]);
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
            'UPDATE students SET name = ?, surname = ?, student_id = ?, email = ?, user_id = ?, group_name = ? WHERE id = ?',
            [name, surname, student_id, email || null, linkedUser?.id || null, group_name || null, id]
        );

        if (linkedUser) {
            const nextUsername = username || linkedUser.username;
            await dbRun(
                'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ? WHERE id = ?',
                [name, surname, nextUsername, email || null, linkedUser.id]
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
            xml += `    <id>${student.id}</id>\n`;
            xml += `    <name>${student.name}</name>\n`;
            xml += `    <surname>${student.surname}</surname>\n`;
            xml += `    <student_id>${student.student_id}</student_id>\n`;
            xml += `    <email>${student.email}</email>\n`;
            xml += `    <group>${student.group_name}</group>\n`;
            xml += '  </student>\n';
        });
        xml += '</students>';

        res.set('Content-Type', 'text/xml');
        res.send(xml);
    });
};
