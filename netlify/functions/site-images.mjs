import handler from '../../api/site-images.js';
import { adapt } from '../adapter.mjs';
export default adapt(handler);
export const config = { path: '/api/site-images' };
