import handler from '../../api/admin.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/admin' };
