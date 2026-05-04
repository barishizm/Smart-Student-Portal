(function () {
    'use strict';

    // FR3: client-side validation for student forms.
    // Required fields, email format, and Student ID pattern (3-20 alphanumeric chars).
    const STUDENT_ID_PATTERN = /^[A-Za-z0-9]{3,20}$/;
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const showError = (form, message) => {
        let bar = form.querySelector('.client-validation-error');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'alert alert-danger client-validation-error';
            form.insertBefore(bar, form.firstChild);
        }
        bar.textContent = message;
    };

    const clearError = (form) => {
        const bar = form.querySelector('.client-validation-error');
        if (bar) bar.remove();
    };

    const getValue = (form, name) => {
        const el = form.querySelector(`[name="${name}"]`);
        return el ? String(el.value || '').trim() : '';
    };

    const validate = (form) => {
        const studentId = getValue(form, 'student_id');
        const fullName = getValue(form, 'full_name');
        const email = getValue(form, 'email');
        const program = getValue(form, 'program_department');
        const yearRaw = getValue(form, 'year_of_study');

        if (!studentId || !fullName || !email || !program || !yearRaw) {
            return 'Please fill all required fields.';
        }
        if (!STUDENT_ID_PATTERN.test(studentId)) {
            return 'Student ID must be 3-20 alphanumeric characters.';
        }
        if (!EMAIL_PATTERN.test(email)) {
            return 'Please enter a valid email address.';
        }
        const year = parseInt(yearRaw, 10);
        if (Number.isNaN(year) || year < 1 || year > 12) {
            return 'Year of study must be a number between 1 and 12.';
        }
        return null;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const forms = document.querySelectorAll('form[data-student-form]');
        forms.forEach((form) => {
            form.addEventListener('submit', (event) => {
                const error = validate(form);
                if (error) {
                    event.preventDefault();
                    showError(form, error);
                    return;
                }
                clearError(form);
            });
        });
    });
})();
