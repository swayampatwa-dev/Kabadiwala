import {Pool} from "pg";
import mongoose from "mongoose";
import {hydrateData,snapshotData} from "./data.js";

let pool:Pool|null=null;
let mongoReady=false;
let saving=Promise.resolve();

const stateSchema=new mongoose.Schema({
  _id:{type:String,default:"primary"},
  payload:{type:mongoose.Schema.Types.Mixed,required:true},
  updatedAt:{type:Date,default:Date.now}
},{versionKey:false});
const State=mongoose.models.AppState||mongoose.model("AppState",stateSchema);

export async function initializePersistence(){
  const mongoUrl=process.env.MONGODB_URI;
  if(mongoUrl){
    await mongoose.connect(mongoUrl,{dbName:process.env.MONGODB_DB||"chakrasetu"});
    mongoReady=true;
    const state=await State.findById("primary").lean();
    if((state as any)?.payload)hydrateData((state as any).payload); else await saveNow();
    console.log("MongoDB persistence connected");
    return;
  }
  const url=process.env.DATABASE_URL;
  if(!url){console.log("MONGODB_URI/DATABASE_URL not set; deterministic memory store active");return;}
  pool=new Pool({connectionString:url,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined});
  await pool.query("CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const result=await pool.query("SELECT payload FROM app_state WHERE id='primary'");
  if(result.rows[0]?.payload)hydrateData(result.rows[0].payload);
  else await saveNow();
  console.log("PostgreSQL persistence connected");
}

async function saveNow(){
  if(mongoReady){
    await State.findByIdAndUpdate("primary",{payload:snapshotData(),updatedAt:new Date()},{upsert:true});
    return;
  }
  if(!pool)return;
  await pool.query("INSERT INTO app_state(id,payload,updated_at) VALUES('primary',$1::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",[JSON.stringify(snapshotData())]);
}

export function scheduleSave(){saving=saving.then(saveNow).catch(e=>console.error("Persistence save failed",e));}
