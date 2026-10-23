const form = document.getElementById('membership-form');
const submit = form.querySelector('[type="submit"]');
const status = document.getElementById('form-status');
submit.disabled = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(el=>el.textContent='');
  status.textContent = 'Sending your request…';
  submit.disabled = true;
  form.setAttribute('aria-busy','true');
  const values = Object.fromEntries(new FormData(form));
  values.consent = form.elements.consent.checked;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),20000);
    let response, result;
    try {
      response = await fetch('/api/membership',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:controller.signal});
      result = await response.json();
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      if (result.errors) {
        for (const [key,message] of Object.entries(result.errors)) {
          const field = form.elements.namedItem(key);
          const error = document.getElementById(`${key}-error`);
          if (field && error) { field.setAttribute('aria-invalid','true'); error.textContent = message; }
        }
      }
      status.textContent = result.message || 'Your request could not be saved. Please try again.';
      (form.querySelector('[aria-invalid]') || status).focus();
      return;
    }
    form.reset();
    form.hidden = true;
    const success = document.getElementById('membership-success');
    success.hidden = false;
    success.focus();
  } catch {
    status.textContent = 'We could not confirm that your request was saved. Check your connection and try again. Sending it again will not create a duplicate for the same email.';
    status.focus();
  } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
});
