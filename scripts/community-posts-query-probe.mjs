// Real PostgreSQL, read-only transaction; executes original/candidate GET sources.
// Business SQL count excludes authentication middleware; HTTP timings are separate.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
import assert from 'node:assert/strict';
import { createDatabaseClient } from '../lib/database.ts';
import { loadCommunityModules } from './lib/community-posts-harness.mjs';
const line = execFileSync('ssh', ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', 'synaura@192.168.1.43', "sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const url = new URL(dotenv.parse(line).DATABASE_URL); url.hostname='127.0.0.1'; url.port='15433';
const client = new pg.Client({ connectionString:url.toString(), application_name:'community-posts-query-probe', statement_timeout:10000 });
const result={at:new Date().toISOString(), scope:'business GET queries on production data in BEGIN READ ONLY; session resolution excluded', runs:[], checks:[]};
const before=execFileSync('git',['show','f71bd509e9de9eecb1817f87bbc6b58fb23f517f:app/api/community/posts/route.ts'],{encoding:'utf8'});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  for(const [variant,source] of [['before',before],['after',undefined]]) for(const category of ['feedback','collab','remix','ai','ai_prompt','question','suggestion','all']) {
    const calls=[];
    const db=createDatabaseClient({query:async(sql,values=[])=>{const start=performance.now(); const r=await client.query(sql,values);calls.push({sql,parameterCount:values.length,rows:r.rowCount,ms:performance.now()-start});return r;}});
    const {route,errors}=loadCommunityModules(db,null,source);
    const start=performance.now();const response=await route.GET(new Request(`http://localhost/api/community/posts?category=${category}&limit=30&sort=recent`));
    const json=await response.json(); const posts=json.posts||[];
    result.runs.push({variant,category,status:response.status,ms:performance.now()-start,posts:posts.length,authors:new Set(posts.map(p=>p.user_id)).size,queryCount:calls.length,calls,errors});
    if(variant==='before') assert.equal(response.status,500);
    else {
      assert.equal(response.status,200);
      for(const p of posts) { assert.equal(p.author?.id,p.user_id); assert.equal(Object.keys(p.author).sort().join(','),'avatar,id,name,username'); }
      assert.equal(new Set(posts.map(p=>p.id)).size,posts.length);
    }
  }
  // Compare paginated API results against a single canonical DB ordering.
  const db=createDatabaseClient({query:(sql,values=[])=>client.query(sql,values)});
  const {route}=loadCommunityModules(db);
  for(const [sort,column]of [['recent','created_at'],['popular','likes_count'],['most_replied','replies_count']]) {
    const expected=(await client.query(`SELECT id FROM public.forum_posts ORDER BY ${column} DESC,id DESC`)).rows.map(p=>p.id);
    const actual=[];
    for(let page=1;page<=Math.ceil(expected.length/3);page++) {const res=await route.GET(new Request(`http://localhost/api/community/posts?category=all&limit=3&page=${page}&sort=${sort}`));assert.equal(res.status,200);const json=await res.json();assert.ok(json.posts.length<=3);actual.push(...json.posts.map(p=>p.id));}
    assert.deepEqual(actual,expected);result.checks.push({sort,pages:Math.ceil(expected.length/3),rows:actual.length,duplicates:actual.length-new Set(actual).size,ok:true});
  }
  result.scoreTies=(await client.query('SELECT likes_count,replies_count,count(*) AS posts FROM public.forum_posts GROUP BY likes_count,replies_count HAVING count(*)>1')).rows;
  result.status='PASS';
  await client.query('ROLLBACK');
} finally {await client.end();}
await fs.mkdir('artifacts/community-posts-fix',{recursive:true});
await fs.writeFile('artifacts/community-posts-fix/query-probe.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,runs:result.runs.map(({calls,errors,...r})=>r),checks:result.checks,scoreTies:result.scoreTies},null,2));
