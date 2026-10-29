const {initializeDatabase}=require('../lib/mongo-schema.cjs');
const {closeDatabase}=require('../lib/database.cjs');
(async()=>{try{await initializeDatabase();console.log('MongoDB collections and indexes ready.')}finally{await closeDatabase()}})().catch(()=>{console.error('MongoDB initialization failed. Check connection and permissions.');process.exitCode=1});
