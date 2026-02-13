document.getElementById("contactForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const requiredMessage = this.dataset.requiredMsg || "All fields are required.";
    const successMessage = this.dataset.successMsg || "Message sent successfully (UI only).";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
        alert(requiredMessage);
        return;
    }

    alert(successMessage);
    this.reset();
});
