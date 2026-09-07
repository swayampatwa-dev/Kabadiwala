import bcrypt from "bcryptjs";
import { estimatePrice, materialRates, matchScore } from "./domain.js";
export const materials=Object.keys(materialRates).map((name,i)=>({id:`m${i+1}`,name,hi:{PCB:"पीसीबी",Cable:"केबल",Battery:"बैटरी",Copper:"ताँबा"}[name]||name,mr:{PCB:"पीसीबी",Cable:"केबल",Battery:"बॅटरी",Copper:"तांबे"}[name]||name,safety:["Battery","CRT"].includes(name)?"HIGH":"NORMAL",description:`${name} e-waste material`,rate:materialRates[name],seededDemoData:true}));
export const recyclers=Array.from({length:10},(_,i)=>({id:`r${i+1}`,name:["GreenCycle Pune","EcoLoop Recyclers","Bharat E-Recovery","Sahyadri Circular","Urban Mine Works","CleanTech Metals","ReNew E-Waste","Prithvi Recovery","ZeroWaste Systems","ReCircuit India"][i],distance:2+i*1.4,authorized:i!==8,verificationLabel:"Verification simulated for prototype",materials:i%2?["PCB","Cable","Copper"]:["Battery","PCB","Computer"],offer:420+i*4,pickup:i!==7,reliability:96-i,location:"Pune, Maharashtra",status:i===8?"PENDING":"VERIFIED",seededDemoData:true})).map(r=>({...r,matchScore:matchScore({distance:r.distance,price:r.offer,maxPrice:456,authorized:r.authorized,pickup:r.pickup,reliability:r.reliability})})).sort((a,b)=>b.matchScore-a.matchScore);
export const users=[
 {id:"u-collector",name:"Ramesh Kumar",email:"collector@kabadi.local",phone:"9876543210",role:"COLLECTOR"},
 {id:"u-recycler",name:"GreenCycle Pune",email:"recycler@kabadi.local",phone:"9876543211",role:"RECYCLER"},
 {id:"u-admin",name:"Asha Admin",email:"admin@kabadi.local",phone:"9876543212",role:"ADMIN"}
];
export let lots:any[]=[]; export let quotes:any[]=[]; export let payments:any[]=[]; export let handovers:any[]=[]; export let anomalies:any[]=[]; export let audits:any[]=[]; export const synced=new Set<string>();
export async function resetData(){lots=Array.from({length:52},(_,i)=>{const material=materials[i%materials.length].name;const weight=+(2+(i%16)*1.5).toFixed(1);const p=estimatePrice(material,weight);return {id:`lot-${i+1}`,lotId:`KBD-2026-${String(i+101).padStart(6,"0")}`,collectorId:"u-collector",materialCategory:material,approxWeight:weight,condition:"USED",location:"Pune",estimatedValue:p.average*weight,priceRange:{low:p.totalLow,high:p.totalHigh},status:["CREATED","QUOTED","ACCEPTED","PAID","RECYCLED"][i%5],recyclerId:i%3?"r1":null,createdAt:new Date(Date.now()-i*86400000).toISOString(),seededDemoData:true};}); quotes=[];payments=lots.filter(x=>x.status==="PAID"||x.status==="RECYCLED").map((x,i)=>({id:`pay-${i}`,lotId:x.lotId,amount:Math.round(x.estimatedValue),method:i%2?"UPI":"CASH",status:"PAID",paidAt:x.createdAt,seededDemoData:true}));anomalies=Array.from({length:10},(_,i)=>({id:`a${i}`,type:i%2?"PRICE_DEVIATION":"WEIGHT_DISCREPANCY",severity:i<4?"HIGH":"MEDIUM",lotId:lots[i].lotId,status:"OPEN",seededDemoData:true}));audits=[];handovers=[];}
export const passwordHash=await bcrypt.hash("Demo123!",10); await resetData();

export function snapshotData(){return {lots,quotes,payments,handovers,anomalies,audits,synced:[...synced]};}
export function hydrateData(state:any){
  if(!state||typeof state!=="object")return;
  lots=Array.isArray(state.lots)?state.lots:lots;
  quotes=Array.isArray(state.quotes)?state.quotes:quotes;
  payments=Array.isArray(state.payments)?state.payments:payments;
  handovers=Array.isArray(state.handovers)?state.handovers:handovers;
  anomalies=Array.isArray(state.anomalies)?state.anomalies:anomalies;
  audits=Array.isArray(state.audits)?state.audits:audits;
  synced.clear(); for(const id of state.synced||[])synced.add(String(id));
}
