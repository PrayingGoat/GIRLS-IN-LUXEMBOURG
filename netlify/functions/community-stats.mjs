import handler from '../../api/community-stats.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/community-stats' };
