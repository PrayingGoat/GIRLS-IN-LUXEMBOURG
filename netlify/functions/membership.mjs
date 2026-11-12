import handler from '../../api/membership.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/membership' };
