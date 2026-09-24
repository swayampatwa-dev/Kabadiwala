// Explicitly activated local fixtures. Never overwrite an existing recycler's rates.
export function addDemoBuyers(users:any[],pincode:string) {
 const rates:Record<string,number>={"Mobile Phone":180,Laptop:240,Computer:140,Battery:100,Cable:220,Copper:500,Aluminium:110,PCB:320,LCD:85,CRT:25,Motor:190,"Mixed plastics":25,"Other E-Waste":60,"Magnet assembly":120};
 return ["GreenLoop Demo","EcoCollect Demo","RenewHub Demo"].map((name,i)=>{
  const id=`demo-buyer-${i+1}`;
  let user=users.find(u=>u.id===id);
  if(!user){user={id,name,email:`buyer${i+1}@demo.kabadi.local`,phone:`900000000${i+1}`,role:"RECYCLER",status:"APPROVED",preferredLanguage:"en",seededDemoData:true,source:"LOCAL_DEMO_BUYER",address:"Demo facility — not a real business",pincode,servicePincodes:[],buyingRates:Object.fromEntries(Object.entries(rates).map(([k,v])=>[k,Math.round(v*(1+i*.08))])),ratesUpdatedAt:new Date().toISOString()};users.push(user);}
  if(!user.servicePincodes.includes(pincode))user.servicePincodes.push(pincode);
  return user;
 });
}
