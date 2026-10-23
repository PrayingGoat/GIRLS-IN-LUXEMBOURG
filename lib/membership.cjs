const { parsePhoneNumberFromString } = require('libphonenumber-js/max');
function validateMembership(input) {
  const errors = {};
  const cleanName = key => {
    const value = typeof input[key] === 'string' ? input[key].trim().replace(/\s+/g, ' ') : '';
    if (value.length < 1 || value.length > 100 || /[<>\u0000-\u001f]/.test(value)) errors[key] = 'Please enter a name of 1 to 100 characters.';
    return value;
  };
  const firstName = cleanName('firstName'), lastName = cleanName('lastName');
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  const rawPhone = typeof input.whatsapp === 'string' ? input.whatsapp.trim() : '';
  const phone = rawPhone.length <= 40 && rawPhone.startsWith('+') ? parsePhoneNumberFromString(rawPhone) : null;
  if (!phone?.isValid()) errors.whatsapp = 'Enter your WhatsApp number with its country code, for example +352 621 123 456.';
  if (input.consent !== true) errors.consent = 'Please confirm that we may use these details to process your request and contact you on WhatsApp.';
  return { errors, data: { firstName, lastName, email, whatsapp: phone?.number, consentVersion: 'membership-2026-10-23' } };
}
module.exports = { validateMembership };
