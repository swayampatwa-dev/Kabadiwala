import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "./api";
import {NavLink} from "react-router-dom";
import {ArrowLeft,MapPin} from "lucide-react";
import "./location-settings.css";
export const sellingMaterials=["Mobile Phone","Laptop","Computer","Battery","Cable","Copper","Aluminium","PCB","LCD","CRT","Motor","Mixed plastics","Other E-Waste"];
export default function LocationSettings({recycler=false}:{recycler?:boolean}){
 const q=useQuery({queryKey:["location-settings"],queryFn:()=>api("/account/location")});
 const [form,setForm]=useState({address:"",pincode:"",servicePincodes:"",buyingRates:{} as Record<string,number>});
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{if(q.data)setForm({...q.data,servicePincodes:q.data.servicePincodes.join(", ")})},[q.data]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage("");try{await api("/account/location",{method:"PUT",body:JSON.stringify({...form,servicePincodes:form.servicePincodes.split(",").map(s=>s.trim()).filter(Boolean)})});setMessage("Saved successfully");}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
 if(q.isLoading)return <p>Loading saved details…</p>;
 if(q.error)return <div className="notice">Unable to load details. <button onClick={()=>q.refetch()}>Retry</button></div>;
 return <div className="location-page"><header className="pagehead"><div><div className="eyebrow">{recycler?"Recycler preferences":"Pickup preferences"}</div><h1>{recycler?"Service area & buying rates":"My pickup address"}</h1></div><NavLink className="btn outline" to={recycler?"/recycler/dashboard":"/customer/dashboard"}><ArrowLeft size={17}/> Back</NavLink></header><section className="card location-card"><div className="sell-section-heading"><span><MapPin size={23}/></span><div><h2>{recycler?"Your facility & coverage":"Where should we collect?"}</h2><p>{recycler?"Set your service area and material rates.":"Keep your pickup details ready for your next order."}</p></div></div><form className="form location-form" onSubmit={save}>
 <label>Address<textarea required minLength={5} maxLength={500} value={form.address} placeholder="Building, street, locality and city" onChange={e=>setForm({...form,address:e.target.value})}/></label>
 <label>Pincode<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="Six-digit pincode" value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value.replace(/\D/g,"")})}/></label>
 {recycler&&<><label>Additional service pincodes<input placeholder="411001, 411038" value={form.servicePincodes} onChange={e=>setForm({...form,servicePincodes:e.target.value})}/></label><h2>Buying rates · ₹ / kg</h2><div className="sell-field-pair">{sellingMaterials.map(material=><label key={material}>{material}<input type="number" min="0.01" step="0.01" placeholder="Not accepted" value={form.buyingRates[material]??""} onChange={e=>{const rates={...form.buyingRates};if(e.target.value)rates[material]=Number(e.target.value);else delete rates[material];setForm({...form,buyingRates:rates})}}/></label>)}</div></>}
 {message&&<p role="status" className={message==="Saved successfully"?"success":"notice"}>{message}</p>}<div className="location-actions"><NavLink className="btn secondary" to={recycler?"/recycler/orders":"/customer/sell"}>{recycler?"View orders":"Continue selling"}</NavLink><button className="btn" disabled={busy}>{busy?"Saving…":"Save details"}</button></div></form></section></div>
}
