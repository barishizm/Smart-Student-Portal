const db = require('../models/db');

// List Students
exports.listStudents = (req, res) => {
    const query = "SELECT * FROM students";
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
exports.createStudent = (req, res) => {
    const { name, surname, student_id, email, group_name } = req.body;
    const query = "INSERT INTO students (name, surname, student_id, email, group_name) VALUES (?, ?, ?, ?, ?)";
    
    db.run(query, [name, surname, student_id, email, group_name], function(err) {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Error adding student (ID might be duplicate)');
            return res.redirect('/admin/students/new');
        }
        req.flash('success_msg', 'Student added successfully');
        res.redirect('/admin/students');
    });
};

// Edit Student Form
exports.editStudentForm = (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM students WHERE id = ?", [id], (err, row) => {
        if (err || !row) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }
        res.render('students/edit', { student: row });
    });
};

// Update Student
exports.updateStudent = (req, res) => {
    const id = req.params.id;
    const { name, surname, student_id, email, group_name } = req.body;
    const query = "UPDATE students SET name = ?, surname = ?, student_id = ?, email = ?, group_name = ? WHERE id = ?";
    
    db.run(query, [name, surname, student_id, email, group_name, id], function(err) {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Error updating student');
            return res.redirect(`/admin/students/${id}/edit`);
        }
        req.flash('success_msg', 'Student updated successfully');
        res.redirect('/admin/students');
    });
};

// Delete Student
exports.deleteStudent = (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM students WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Error deleting student');
        } else {
            req.flash('success_msg', 'Student deleted successfully');
        }
        res.redirect('/admin/students');
    });
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
