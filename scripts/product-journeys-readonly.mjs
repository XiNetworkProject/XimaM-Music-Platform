// Canonical local SSH tunnel. No secret or listener identity is printed/saved.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import pg from 'pg';
import {analyticsPeriod} from '../lib/creatorAnalytics/model.ts';
import {creatorAnalyticsStatement} from '../lib/creatorAnalytics/query.ts';
let client;
try {
 const raw=execFileSync('ssh',['-i',path.join(os.homedir(),'.ssh/id_ed25519_weyra'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','synaura@192.168.1.43',"sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000});
 const url=new URL(dotenv.parse(raw).DATABASE_URL);
 if(process.argv.includes('--target')) {console.log(JSON.stringify({host:url.hostname,port:url.port||'5432'}));process.exit(0);}
 url.hostname='127.0.0.1';url.port='15433';
 client=new pg.Client({connectionString:url.toString(),application_name:'product-journeys-readonly',connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=1000'});
 await client.connect();await client.query('BEGIN READ ONLY');
 const role=await client.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user');if(role.rows[0]?.rolsuper!==false)throw new Error('unexpected-role');
 const owner=(await client.query("SELECT id FROM profiles WHERE lower(username)='ximamoff' LIMIT 1")).rows[0]?.id;
 if(!owner)throw new Error('missing-owner');
 const results=[];
 for(const days of [7,28,90]){
   const period=analyticsPeriod(new URLSearchParams(`range=${days}d`));
   const sql=creatorAnalyticsStatement(owner,period,'all',null),start=performance.now();
   const report=(await client.query(sql.text,sql.values)).rows[0].report;
   results.push({days,ms:Math.round(performance.now()-start),tracks:report.trackCount,plays:report.current.plays,listeners:report.current.listeners,measuredPlays:report.evidence.retention.plays,exposureSources:report.evidence.exposure.length});
 }
 const sql=creatorAnalyticsStatement(owner,analyticsPeriod(new URLSearchParams('range=28d')),'all',null);
 const plan=(await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql.text,sql.values)).rows[0]['QUERY PLAN'][0];
 await client.query('ROLLBACK');
 console.log(JSON.stringify({readOnly:true,results,planningMs:plan['Planning Time'],executionMs:plan['Execution Time'],sharedHitBlocks:plan.Plan['Shared Hit Blocks'],sharedReadBlocks:plan.Plan['Shared Read Blocks']},null,2));
}catch(e){console.error(JSON.stringify({readOnly:true,status:'unavailable',code:typeof e?.code==='string'?e.code:'CHECK_FAILED'}));process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
