import handler from '../../api/feedback.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/feedback' };
