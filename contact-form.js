const form = document.getElementById('contact-form');
// Wake the server as soon as the visitor starts the form, so sending is fast.
form.addEventListener('focusin', () => { fetch('/api/contact?warm=1', { cache: 'no-store' }).catch(() => {}); }, { once: true });
const submit = form.querySelector('[type="submit"]');
const status = document.getElementById('contact-status');
const reason = new URLSearchParams(location.search).get('reason');
if (reason && form.elements.reason.querySelector(`option[value="${CSS.escape(reason)}"]`)) form.elements.reason.value = reason;
submit.disabled = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  status.textContent = 'Sending your message…';
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response, result;
    try {
      response = await fetch('/api/contact', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(Object.fromEntries(new FormData(form))), signal:controller.signal });
      result = await response.json();
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      for (const [key, message] of Object.entries(result.errors || {})) {
        const field = form.elements.namedItem(key), error = document.getElementById(`contact-${key}-error`);
        if (field && error) { field.setAttribute('aria-invalid', 'true'); error.textContent = message; }
      }
      status.textContent = result.message || 'Your message could not be sent. Please try again.';
      (form.querySelector('[aria-invalid]') || status).focus();
      return;
    }
    form.reset();
    form.hidden = true;
    const success = document.getElementById('contact-success');
    success.hidden = false;
    success.focus();
  } catch {
    status.textContent = 'We could not confirm that your message was sent. Check your connection and try again, or email hello@girlsinlu.com.';
    status.focus();
  } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
});
