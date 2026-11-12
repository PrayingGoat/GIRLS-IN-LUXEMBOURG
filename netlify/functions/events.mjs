import handler from '../../api/events.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/events' };
