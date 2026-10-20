(function(){const h=document.getElementById('qs');
Q.forEach((x,i)=>{const b=document.createElement('div');b.className='q';const p=document.createElement('p');p.textContent=(i+1)+'. '+x[0];b.append(p);
x[1].forEach((o,j)=>{const l=document.createElement('label');const r=document.createElement('input');r.type='radio';r.name='q'+i;r.value=j;l.append(r,' '+o);b.append(l)});
const f=document.createElement('div');f.hidden=true;b.append(f);h.append(b)});
document.getElementById('qf').onsubmit=e=>{e.preventDefault();let s=0;[...h.children].forEach((b,i)=>{const c=b.querySelector('input:checked'),f=b.lastChild,x=Q[i];f.hidden=false;
if(c&&+c.value===x[2]){s++;f.className='fb ok';f.textContent='Right. '+x[3]}else{f.className='fb no';f.textContent='Not quite. The answer is '+x[1][x[2]]+'. '+x[3]}});
document.querySelector('#sc b').textContent='You got '+s+' out of '+Q.length+'.'};
document.getElementById('rs').onclick=()=>{document.getElementById('qf').reset();[...h.children].forEach(b=>b.lastChild.hidden=true);document.querySelector('#sc b').textContent=''};})();
