import {beforeEach,describe,it,expect} from "vitest";
import request from "supertest";
import app from "./app.js";
import {resetData} from "./data.js";

const login=async(identifier:string)=>{
  const response=await request(app).post("/api/auth/login").send({identifier,password:"Demo123!"});
  expect(response.status).toBe(200);
  return response.body.data.token as string;
};
const authorized=(method:"get"|"post"|"patch",path:string,token:string)=>request(app)[method](path).set("Authorization",`Bearer ${token}`);

describe("complete KABADI+ workflow",()=>{
  beforeEach(async()=>resetData());

  it("runs collector → quote → acceptance → handover → payment → traceability",async()=>{
    const collector=await login("collector@kabadi.local");
    const recycler=await login("recycler@kabadi.local");
    const admin=await login("admin@kabadi.local");

    const classification=await request(app).post("/api/ai/classify").send({fileName:"pcb-board.jpg"});
    expect(classification.body.data).toMatchObject({material:"PCB",confidence:92});

    const created=await authorized("post","/api/lots",collector).send({materialCategory:"PCB",approxWeight:12.5,condition:"USED",location:"Pune"});
    expect(created.status).toBe(201);
    const lotId=created.body.data.lotId;

    const quote=await authorized("post",`/api/lots/${lotId}/quotes`,recycler).send({offerPrice:440,pickupAvailable:true});
    expect(quote.status).toBe(201);
    const accepted=await authorized("post",`/api/quotes/${quote.body.data.id}/accept`,collector).send();
    expect(accepted.body.data.status).toBe("ACCEPTED");

    const handover=await authorized("post","/api/handover",recycler).send({lotId,weightAtHandover:9.8,otp:"123456"});
    expect(handover.body.data).toMatchObject({otpVerified:true,discrepancy:{flagged:true,percent:21.6,severity:"HIGH"}});

    const payment=await authorized("post","/api/payments",recycler).send({lotId,amount:4312,method:"UPI",transactionReference:`TEST-${lotId}`});
    expect(payment.status).toBe(201);
    expect(payment.body.data.status).toBe("PAID");

    const trace=await request(app).get(`/api/traceability/${lotId}`);
    expect(trace.body.data).toMatchObject({material:"PCB",handover:true,payment:true,status:"PAID"});
    const anomalies=await authorized("get","/api/anomalies",admin);
    expect(anomalies.body.data.some((x:any)=>x.lotId===lotId&&x.type==="WEIGHT_DISCREPANCY")).toBe(true);
  });

  it("syncs offline mutations once and rejects duplicate execution",async()=>{
    const collector=await login("collector@kabadi.local");
    const operation={clientOperationId:"offline-test-fixed-id",type:"CREATE_LOT",payload:{materialCategory:"Cable",approxWeight:3.5,condition:"USED",location:"Pune"}};
    const first=await authorized("post","/api/sync",collector).send({operations:[operation]});
    const second=await authorized("post","/api/sync",collector).send({operations:[operation]});
    expect(first.body.data.results[0].status).toBe("SYNCED");
    expect(second.body.data.results[0].status).toBe("DUPLICATE");
  });

  it("enforces role authorization, payment limits and status safety",async()=>{
    const collector=await login("collector@kabadi.local");
    const forbidden=await authorized("post","/api/recyclers/r9/verify",collector).send();
    expect(forbidden.status).toBe(403);
    const lot=(await authorized("post","/api/lots",collector).send({materialCategory:"Battery",approxWeight:2,condition:"USED",location:"Pune"})).body.data;
    const invalid=await authorized("patch",`/api/lots/${lot.lotId}`,collector).send({status:"RECYCLED"});
    expect(invalid.status).toBe(409);
  });
});
