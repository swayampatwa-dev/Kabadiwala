import {describe,it,expect} from "vitest";
import request from "supertest";
import app from "./app.js";
import {localOffers} from "./local-offers.js";
describe("pincode offers",()=>{
 it("ranks complete offers and excludes unapproved, outside-area and partial buyers",()=>{
  const base={role:"RECYCLER",status:"APPROVED",servicePincodes:["411001"],buyingRates:{PCB:200,Cable:100}};
  const users=[{...base,id:"a",name:"A"},{...base,id:"b",name:"B",buyingRates:{PCB:300,Cable:120}},{...base,id:"c",name:"C",status:"PENDING"},{...base,id:"d",name:"D",servicePincodes:["411038"]},{...base,id:"e",name:"E",buyingRates:{PCB:999}}];
  expect(localOffers(users,"411001",[{category:"PCB",estimatedWeight:2},{category:"Cable",estimatedWeight:1}]).map(x=>[x.recyclerId,x.total])).toEqual([["b",720],["a",500]]);
 });
 it("saves own settings, compares and locks the selected offer on order placement",async()=>{
  const login=async(phone:string,otp:string)=>(await request(app).post("/api/auth/verify-otp").send({phone,otp})).body.data.token;
  const recycler=await login("9876543211","123456"),customer=await login("5555555555","123456");
  expect((await request(app).put("/api/account/location").auth(recycler,{type:"bearer"}).send({address:"Demo facility, Pune",pincode:"411001",servicePincodes:["411038"],buyingRates:{PCB:420}})).status).toBe(200);
  expect((await request(app).put("/api/account/location").auth(customer,{type:"bearer"}).send({address:"Demo house, Pune",pincode:"123"})).status).toBe(400);
  const items=[{name:"Circuit board",category:"PCB",estimatedWeight:2,quantity:1,condition:"USED"}];
  const comparison=await request(app).post("/api/marketplace/compare").auth(customer,{type:"bearer"}).send({pincode:"411038",items});
  expect(comparison.body.data[0].total).toBe(840);
  const payload={items,address:"Demo house, Pune",pincode:"411038",selectedRecyclerId:"u-recycler",expectedTotal:840};
  expect((await request(app).post("/api/marketplace/orders").auth(customer,{type:"bearer"}).send({...payload,expectedTotal:900})).status).toBe(409);
  const created=await request(app).post("/api/marketplace/orders").auth(customer,{type:"bearer"}).send(payload);
  expect(created.status).toBe(201);
  expect(created.body.data.selectedOffer.total).toBe(840);
  const accepted=await request(app).post(`/api/marketplace/orders/${created.body.data.orderId}/recycler-accept`).auth(recycler,{type:"bearer"}).send({amount:1});
  expect(accepted.body.data.recyclerOffer).toBe(840);
 });
});
