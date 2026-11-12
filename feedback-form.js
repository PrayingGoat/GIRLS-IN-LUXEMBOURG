const form = document.getElementById('feedback-form');
// Wake the server as soon as the visitor starts the form, so sending is fast.
form.addEventListener('focusin', () => { fetch('/api/feedback?warm=1', { cache: 'no-store' }).catch(() => {}); }, { once: true });
const submit = form.querySelector('[type="submit"]');
const status = document.getElementById('feedback-status');
submit.disabled = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  const data = new FormData(form);
  const body = Object.fromEntries(data);
  body.groups = data.getAll('groups');
  status.textContent = 'Sending your feedback…';
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response, result;
    try {
      response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      result = await response.json();
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      for (const [key, message] of Object.entries(result.errors || {})) {
        const error = document.getElementById(`feedback-${key}-error`);
        const field = form.querySelector(`[name="${key}"]`);
        if (error) error.textContent = message;
        if (field) (field.closest('fieldset') || field).setAttribute('aria-invalid', 'true');
      }
      status.textContent = result.message || 'Your feedback could not be sent. Please try again.';
      const first = form.querySelector('[aria-invalid]');
      const target = first && (first.matches('fieldset') ? first.querySelector('input') : first);
      (target || status).focus();
      return;
    }
    form.reset();
    form.hidden = true;
    const success = document.getElementById('feedback-success');
    success.hidden = false;
    success.focus();
  } catch {
    status.textContent = 'We could not confirm that your feedback was sent. Check your connection and try again.';
    status.focus();
  } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
});
