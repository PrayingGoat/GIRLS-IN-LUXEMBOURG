// Declared here so Netlify ships these installed packages with the function
// (the handler's own require() calls are not traced when the function is bundled).
import 'mongodb';
import 'sharp';
import handler from '../../api/site-images.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/site-images' };
