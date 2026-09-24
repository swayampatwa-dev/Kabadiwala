import { z } from "zod";
export const pin = z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit pincode");
export const offerItems = z.array(z.object({category:z.string().min(2),estimatedWeight:z.number().positive().max(10000)})).min(1).max(50);
export function localOffers(users:any[],pincode:string,items:{category:string;estimatedWeight:number}[]) {
  return users.filter(u=>u.role==="RECYCLER"&&u.status==="APPROVED"&&u.servicePincodes?.includes(pincode))
    .flatMap(u=>{
      const lines=items.map(i=>({category:i.category,weight:i.estimatedWeight,rate:Number(u.buyingRates?.[i.category]||0)}));
      if(lines.some(l=>l.rate<=0))return [];
      return [{recyclerId:u.id,name:u.name,pincode,lines,total:Math.round(lines.reduce((s,l)=>s+l.rate*l.weight,0)*100)/100,updatedAt:u.ratesUpdatedAt}];
    }).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}
