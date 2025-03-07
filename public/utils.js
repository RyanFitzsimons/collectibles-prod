// collectibles-prod/public/utils.js
export function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.style.display = section.id === sectionId ? 'block' : 'none';
    });
  }
  
  export async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
  
  export function showAlert(title, text, icon) {
    return Swal.fire(title, text, icon);
  }
  
  export function getFormData(form) {
    return Object.fromEntries(new FormData(form));
  }