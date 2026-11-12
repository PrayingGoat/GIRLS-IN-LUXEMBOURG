// Anonymous community feedback. Identity fields are optional and only kept when the person fills them in.
const groups = { girlsclub:'GirlsClub', bookclub:'BookClub', momsclub:"Moms'Club", walkhike:'Walk/HikeClub', fitclub:'FitClub', careerclub:'CareerClub', craft:'Craft Corner', language:'Language Exchange', travelclub:'TravelClub' };
const ratings = { 1:'Not great', 2:'Could be better', 3:'Good', 4:'Very good', 5:'Excellent' };
const text = (value, max) => typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n').slice(0, max + 1) : '';
const bad = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
function validateFeedback(input) {
  const errors = {};
  const rating = Number(input.rating);
  if (!Object.hasOwn(ratings, rating)) errors.rating = 'Please choose how your experience has been.';
  const list = Array.isArray(input.groups) ? input.groups : input.groups ? [input.groups] : [];
  const chosen = [...new Set(list.filter(g => typeof g === 'string'))];
  if (chosen.length > 9 || chosen.some(g => !Object.hasOwn(groups, g))) errors.groups = 'Please choose groups from the list.';
  const working = text(input.working, 3000), better = text(input.better, 3000);
  if (working.length > 3000 || bad.test(working)) errors.working = 'Please keep this answer under 3,000 characters.';
  if (better.length > 3000 || bad.test(better)) errors.better = 'Please keep this answer under 3,000 characters.';
  const testimony = input.testimony === 'yes' ? 'yes' : 'no';
  const name = text(input.name, 100).replace(/\s+/g, ' ');
  if (name.length > 100 || /[<>\u0000-\u001f]/.test(name)) errors.name = 'Please enter a name of up to 100 characters.';
  if (testimony === 'yes' && !name) errors.name = 'Please add your name so we can credit your testimony.';
  const phone = text(input.phone, 30);
  if (phone && !/^\+?[0-9 ()./-]{6,30}$/.test(phone)) errors.phone = 'Please enter a valid phone number, or leave it empty.';
  const email = text(input.email, 254).toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))) errors.email = 'Please enter a valid email address, or leave it empty.';
  return { errors, data: { rating, groups: chosen, working, better, testimony, name, phone, email } };
}
module.exports = { validateFeedback, groups, ratings };
