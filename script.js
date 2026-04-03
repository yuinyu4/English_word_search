let pdfDoc=null;
let selectedColor=null;

document.getElementById('tolerance').addEventListener('input',e=>{
 document.getElementById('tolVal').innerText=e.target.value;
});

document.getElementById('pdfInput').addEventListener('change',function(e){
 const file=e.target.files[0];
 const reader=new FileReader();
 reader.onload=function(){
  const typed=new Uint8Array(this.result);
  pdfjsLib.getDocument(typed).promise.then(pdf=>{pdfDoc=pdf;alert("PDF 로드 완료");});
 };
 reader.readAsArrayBuffer(file);
});

document.getElementById('pdfCanvas').addEventListener('click',function(e){
 const rect=this.getBoundingClientRect();
 const x=e.clientX-rect.left;
 const y=e.clientY-rect.top;
 const ctx=this.getContext('2d');
 const pixel=ctx.getImageData(x,y,1,1).data;
 selectedColor={r:pixel[0],g:pixel[1],b:pixel[2]};
 document.getElementById('colorPreview').style.background=`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
});

function isSimilar(r,g,b){
 if(!selectedColor) return false;
 const tol=parseInt(document.getElementById('tolerance').value);
 return Math.abs(r-selectedColor.r)<tol &&
        Math.abs(g-selectedColor.g)<tol &&
        Math.abs(b-selectedColor.b)<tol;
}

async function processPDF(){
 const canvas=document.getElementById('pdfCanvas');
 const ctx=canvas.getContext('2d');
 const list=document.getElementById('wordList');
 list.innerHTML="";

 for(let i=1;i<=pdfDoc.numPages;i++){
  const page=await pdfDoc.getPage(i);
  const viewport=page.getViewport({scale:1.5});
  canvas.height=viewport.height;
  canvas.width=viewport.width;

  await page.render({canvasContext:ctx,viewport}).promise;

  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  detect(img,ctx);

  const text=await page.getTextContent();
  text.items.forEach(item=>{
   if(/^[a-zA-Z]{3,}$/.test(item.str)){
    addWord(item.str);
   }
  });
 }
}

function detect(img,ctx){
 const d=img.data;
 for(let i=0;i<d.length;i+=4){
  if(isSimilar(d[i],d[i+1],d[i+2])){
   d[i]=255;d[i+1]=0;d[i+2]=0;
  }
 }
 ctx.putImageData(img,0,0);
}

function addWord(word){
 const li=document.createElement('li');
 li.innerText=word+" 불러오는 중...";
 document.getElementById('wordList').appendChild(li);

 Promise.all([
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`).then(r=>r.json()),
  fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|ko`).then(r=>r.json())
 ])
 .then(([eng,kor])=>{
  let example="예문 없음";
  let trans="번역 없음";
  if(eng[0]){
   example=eng[0].meanings[0].definitions[0].example||"예문 없음";
  }
  if(kor.responseData){
   trans=kor.responseData.translatedText;
  }
  li.innerText=`${word} - ${trans}\n${example}`;
 });
}

function exportWords(){
 let text="";
 document.querySelectorAll('#wordList li').forEach(li=>{
  text+=li.innerText+"\n\n";
 });
 const blob=new Blob([text],{type:'text/plain'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download="words.txt";
 a.click();
}
