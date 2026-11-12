import handler from '../../api/contact.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/contact' };
