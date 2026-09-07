export type VisionResult={labels:{label:string;confidence:number}[];suggestedMaterial:string|null};

const materialHints:{material:string;words:string[]}[]=[
  {material:"Mobile Phone",words:["cellular telephone","mobile phone","hand-held computer"]},
  {material:"Computer",words:["desktop computer","computer keyboard","monitor"]},
  {material:"Laptop",words:["notebook","laptop"]},
  {material:"Cable",words:["electric cord","cable","wire"]},
  {material:"Battery",words:["battery"]},
  {material:"LCD/Display",words:["screen","television","monitor"]},
  {material:"Motor",words:["electric motor","motor"]},
];

export async function classifyImage(file:File):Promise<VisionResult>{
  const [{load}]=await Promise.all([import("@tensorflow-models/mobilenet"),import("@tensorflow/tfjs")]);
  const model=await load({version:2,alpha:0.5});
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const raw=await model.classify(img,5);
    const labels=raw.map(x=>({label:x.className,confidence:Math.round(x.probability*100)}));
    const text=labels.map(x=>x.label.toLowerCase()).join(" ");
    const suggestedMaterial=materialHints.find(x=>x.words.some(w=>text.includes(w)))?.material||null;
    return {labels,suggestedMaterial};
  }finally{URL.revokeObjectURL(url);}
}
