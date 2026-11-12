const reasons = { general: 'General Question', partnership: 'Partnership', volunteering: 'Volunteering' };
function validateContact(input) {
  const errors = {};
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 100 || /[<>\u0000-\u001f]/.test(name)) errors.name = 'Please enter a name of 1 to 100 characters.';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  const reason = typeof input.reason === 'string' ? input.reason : '';
  if (!Object.hasOwn(reasons, reason)) errors.reason = 'Please choose a reason for contacting us.';
  const message = typeof input.message === 'string' ? input.message.trim().replace(/\r\n?/g, '\n') : '';
  if (message.length < 10 || message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(message)) errors.message = 'Please write a message of 10 to 5,000 characters.';
  return { errors, data: { name, email, reason, message } };
}
module.exports = { validateContact, reasons };
