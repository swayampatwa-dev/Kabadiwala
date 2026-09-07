import {Pool} from "pg";
import {hydrateData,snapshotData} from "./data.js";

let pool:Pool|null=null;
let saving=Promise.resolve();

export async function initializePersistence(){
  const url=process.env.DATABASE_URL;
  if(!url){console.log("DATABASE_URL not set; deterministic memory store active");return;}
  pool=new Pool({connectionString:url,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined});
  await pool.query("CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const result=await pool.query("SELECT payload FROM app_state WHERE id='primary'");
  if(result.rows[0]?.payload)hydrateData(result.rows[0].payload);
  else await saveNow();
  console.log("PostgreSQL persistence connected");
}

async function saveNow(){
  if(!pool)return;
  await pool.query("INSERT INTO app_state(id,payload,updated_at) VALUES('primary',$1::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",[JSON.stringify(snapshotData())]);
}

export function scheduleSave(){saving=saving.then(saveNow).catch(e=>console.error("Persistence save failed",e));}
