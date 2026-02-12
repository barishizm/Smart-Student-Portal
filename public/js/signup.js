class SignupForm {
  constructor() {
    this.form = document.getElementById('signupForm');
    this.submitBtn = this.form.querySelector('.login-btn');
    this.successMessage = document.getElementById('successMessage');

    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');

    this.passwordToggle = document.getElementById('passwordToggle');
    this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

    this.isSubmitting = false;
    this.submittedOnce = false;

    this.validators = {
      fullName: this.validateFullName,
      email: (v) => FormUtils.validateEmail(v),
      password: (v) => FormUtils.validatePassword(v),
      confirmPassword: this.validateConfirmPassword,
      terms: this.validateTerms
    };

    this.init();
  }

  init() {
    this.addEventListeners();
    FormUtils.setupFloatingLabels(this.form);

    FormUtils.setupPasswordToggle(this.passwordInput, this.passwordToggle);
    FormUtils.setupPasswordToggle(this.confirmPasswordInput, this.confirmPasswordToggle);

    FormUtils.addSharedAnimations();
    const card = document.querySelector('.login-card');
    FormUtils.addEntranceAnimation(card);
  }

  addEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    Object.keys(this.validators).forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (!field) return;

      field.addEventListener('blur', () => { if (this.submittedOnce) this.validateField(fieldName); });
      field.addEventListener('input', () => {
        // confirmPassword, password değişince birlikte kontrol edilsin
        FormUtils.clearError(fieldName);
        if (fieldName === 'password' || fieldName === 'confirmPassword') {
          FormUtils.clearError('confirmPassword');
        }
      });

      // checkbox için change daha mantıklı
      if (field.type === 'checkbox') {
        field.addEventListener('change', () => { if (this.submittedOnce) this.validateField(fieldName); });
      }
    });
  }

  validateFullName(value) {
    if (!value || value.trim().length < 3) {
      return { isValid: false, message: 'Full name is required' };
    }
    return { isValid: true };
  }

  validateConfirmPassword(value) {
    if (!value) return { isValid: false, message: 'Confirm password is required' };
    if (value !== this.passwordInput.value) {
      return { isValid: false, message: 'Passwords do not match' };
    }
    return { isValid: true };
  }

  validateTerms(value, field) {
    if (!field.checked) {
      return { isValid: false, message: 'You must agree to Terms' };
    }
    return { isValid: true };
  }

  handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    this.submittedOnce = true;

    const isValid = this.validateForm();
    if (!isValid) {
      this.shakeForm();
      return;
    }

    this.submitForm();
  }

  validateForm() {
    let ok = true;
    Object.keys(this.validators).forEach((fieldName) => {
      if (!this.validateField(fieldName)) ok = false;
    });
    return ok;
  }

  validateField(fieldName) {
    const field = document.getElementById(fieldName);
    const validator = this.validators[fieldName];
    if (!field || !validator) return true;

    const rawValue = field.type === 'checkbox' ? '' : field.value.trim();
    const result = validator.call(this, rawValue, field);

    if (result.isValid) {
      FormUtils.clearError(fieldName);
      FormUtils.showSuccess(fieldName);
    } else {
      FormUtils.showError(fieldName, result.message);
    }
    return result.isValid;
  }

  shakeForm() {
    this.form.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => (this.form.style.animation = ''), 500);
  }

  async submitForm() {
    this.isSubmitting = true;
    this.submitBtn.classList.add('loading');

    try {
      // demo: network simülasyonu
      await new Promise((res) => setTimeout(res, 1200));

      this.showSuccessMessage();
    } catch (err) {
      FormUtils.showNotification('Sign up failed. Please try again.', 'error', this.form);
    } finally {
      this.isSubmitting = false;
      this.submitBtn.classList.remove('loading');
    }
  }

  showSuccessMessage() {
    this.form.style.opacity = '0';
    this.form.style.transform = 'translateY(-20px)';

    setTimeout(() => {
      this.form.style.display = 'none';
      this.successMessage.classList.add('show');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1800);
    }, 250);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SignupForm();
});
