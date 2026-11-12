import handler from '../../api/media.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
// Images are static files; this function only answers for an image missing from the deploy,
// serving the copy stored in MongoDB (preferStatic keeps existing files on the CDN).
export const config = { path: ['/api/media', '/assets/*'], preferStatic: true };
