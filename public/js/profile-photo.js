document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('profilePhotoInput');
  const cropArea = document.getElementById('profileCropArea');
  const cropImage = document.getElementById('profileCropImage');
  const uploadBtn = document.getElementById('uploadCroppedPhotoBtn');

  if (!fileInput || !cropArea || !cropImage || !uploadBtn) {
    return;
  }

  let cropper = null;
  let objectUrl = '';
  let selectedFile = null;

  const resetCropper = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }
  };

  const uploadFile = async (fileOrBlob, fileName = 'avatar.webp') => {
    const formData = new FormData();
    formData.append('profile_photo', fileOrBlob, fileName);

    const response = await fetch('/auth/profile-photo', {
      method: 'POST',
      body: formData
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    window.location.reload();
  };

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only jpg, png, or webp images are allowed.');
      fileInput.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be 2MB or less.');
      fileInput.value = '';
      return;
    }

    selectedFile = file;

    resetCropper();
    objectUrl = URL.createObjectURL(file);
    cropImage.src = objectUrl;

    if (typeof Cropper === 'undefined') {
      cropArea.hidden = true;
      uploadBtn.textContent = 'Upload Photo';
      return;
    }

    cropArea.hidden = false;

    cropImage.onload = () => {
      cropper = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        dragMode: 'move',
        background: false,
        responsive: true,
        guides: true
      });
      uploadBtn.textContent = 'Upload Cropped Photo';
    };
  });

  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      fileInput.click();
      return;
    }

    uploadBtn.disabled = true;

    try {
      if (!cropper) {
        await uploadFile(selectedFile, selectedFile.name || 'avatar.jpg');
        return;
      }

      cropper
        .getCroppedCanvas({
          width: 512,
          height: 512,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        })
        .toBlob(async (blob) => {
          if (!blob) {
            uploadBtn.disabled = false;
            alert('Could not process image.');
            return;
          }

          try {
            await uploadFile(blob, 'avatar.webp');
          } catch (_err) {
            uploadBtn.disabled = false;
            alert('Upload failed. Please try again.');
          }
        }, 'image/webp', 0.9);
    } catch (_err) {
      uploadBtn.disabled = false;
      alert('Upload failed. Please try again.');
    }
  });
});
