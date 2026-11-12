// Declared here so Netlify ships these installed packages with the function
// (the handler's own require() calls are not traced when the function is bundled).
import 'mongodb';
import handler from '../../api/media.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
// Images are static files; this only answers for an image missing from the deploy (MongoDB copy).
export const config = { path: ['/api/media', '/assets/*'], preferStatic: true };
