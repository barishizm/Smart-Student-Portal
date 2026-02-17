const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async function onSubmit(e) {
        e.preventDefault();

        const requiredMessage = this.dataset.requiredMsg || 'All fields are required.';
        const successMessage = this.dataset.successMsg || 'Message sent successfully.';
        const invalidEmailMessage = this.dataset.invalidEmailMsg || 'Please enter a valid email address.';
        const failedMessage = this.dataset.failedMsg || 'Could not send message right now.';

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!name || !email || !message) {
            alert(requiredMessage);
            return;
        }

        if (!emailRegex.test(email)) {
            alert(invalidEmailMessage);
            return;
        }

        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({ name, email, message })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.success) {
                alert(payload.error || failedMessage);
                return;
            }

            alert(successMessage);
            this.reset();
        } catch (err) {
            alert(failedMessage);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}
