const express = require('express')
const { spawn } = require('child_process')
const fs   = require('fs')
const path = require('path')

const app    = express()
const IMGDIR = path.join(__dirname, 'images')
const CMP_OUT = path.join(__dirname, 'fp_comparison.png')

if (!fs.existsSync(IMGDIR)) fs.mkdirSync(IMGDIR)

app.use('/images', express.static(IMGDIR))

const HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fingerprint Gallery</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;padding:24px}
h1{text-align:center;font-size:1.4rem;margin-bottom:20px}
.toolbar{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:24px}
.btn{border:none;border-radius:10px;padding:12px 28px;font-size:1rem;cursor:pointer;transition:background .2s}
#btn-scan{background:#2563eb;color:#fff}
#btn-scan:hover{background:#1d4ed8}
#btn-scan:disabled{background:#475569;cursor:not-allowed}
#btn-compare{background:#5b3fa0;color:#fff}
#btn-compare:hover{background:#7b5fc0}
#btn-compare:disabled{background:#2d2d4e;color:#475569;cursor:not-allowed}
#status{text-align:center;font-size:.9rem;color:#8b949e;min-height:20px;margin-bottom:16px}
#sel-info{text-align:center;font-size:.82rem;color:#8b949e;margin-bottom:14px;min-height:18px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.card{background:#161b22;border:2px solid #30363d;border-radius:10px;overflow:hidden;cursor:pointer;transition:border-color .15s}
.card.selected{border-color:#5b3fa0}
.card img{width:100%;display:block;background:#21262d}
.card-info{padding:8px 10px;font-size:.78rem;color:#8b949e;display:flex;justify-content:space-between;align-items:center}
.btn-del{background:transparent;border:1px solid #f85149;color:#f85149;border-radius:6px;padding:3px 8px;font-size:.72rem;cursor:pointer}
.btn-del:hover{background:#f85149;color:#fff}
.sel-badge{font-size:.7rem;background:#5b3fa0;color:#fff;border-radius:4px;padding:1px 6px}
#modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);justify-content:center;align-items:center;z-index:99;flex-direction:column;gap:12px}
#modal.open{display:flex}
#modal img{max-width:95vw;max-height:85vh;border-radius:8px}
#modal-close{background:#333;border:none;color:#fff;border-radius:8px;padding:8px 20px;cursor:pointer;font-size:.9rem}
</style>
</head>
<body>
<h1>🖐 Fingerprint Gallery</h1>
<div class="toolbar">
  <button class="btn" id="btn-scan" onclick="scan()">สแกนนิ้ว</button>
  <button class="btn" id="btn-compare" disabled onclick="compare()">เปรียบเทียบ (0/2)</button>
</div>
<div id="status"></div>
<div id="sel-info"></div>
<div id="gallery" class="gallery"></div>
<div id="modal">
  <img id="modal-img" src="" alt="">
  <button id="modal-close" onclick="closeModal()">ปิด</button>
</div>
<script>
var selected=[]

function updateCompareBtn(){
  var btn=document.getElementById('btn-compare')
  btn.textContent='เปรียบเทียบ ('+selected.length+'/2)'
  btn.disabled=selected.length!==2
  var info=document.getElementById('sel-info')
  if(selected.length===0)info.textContent=''
  else if(selected.length===1)info.textContent='เลือกแล้ว 1 รูป — เลือกอีก 1 รูปเพื่อเปรียบเทียบ'
  else info.textContent='เลือกแล้ว 2 รูป — กด "เปรียบเทียบ" ได้เลย'
}

function toggleSelect(f,cardEl){
  var i=selected.indexOf(f)
  if(i>=0){selected.splice(i,1);cardEl.classList.remove('selected')}
  else if(selected.length<2){selected.push(f);cardEl.classList.add('selected')}
  updateCompareBtn()
}

async function scan(){
  var btn=document.getElementById('btn-scan'),st=document.getElementById('status')
  btn.disabled=true
  st.textContent='กำลังสแกน... วางนิ้ว → ยก → วางอีกครั้งค้างไว้'
  st.style.color='#8b949e'
  try{
    var d=await(await fetch('/scan')).json()
    if(d.ok){st.textContent='สำเร็จ — '+d.filename;st.style.color='#3fb950';loadGallery()}
    else{st.textContent='ไม่สำเร็จ: '+(d.error||'unknown');st.style.color='#f85149'}
  }catch(e){st.textContent='Error: '+e.message;st.style.color='#f85149'}
  btn.disabled=false
}

async function compare(){
  if(selected.length!==2)return
  var btn=document.getElementById('btn-compare'),st=document.getElementById('status')
  btn.disabled=true
  st.textContent='กำลังเปรียบเทียบ...'
  st.style.color='#8b949e'
  try{
    var d=await(await fetch('/compare?a='+encodeURIComponent(selected[0])+'&b='+encodeURIComponent(selected[1]))).json()
    if(d.ok){
      st.textContent='Score: '+d.score+'%  '+( d.match ? 'MATCH' : 'NO MATCH')
      st.style.color=d.match?'#3fb950':'#f85149'
      openModal('/comparison?t='+Date.now())
    }else{
      st.textContent='Error: '+(d.error||'unknown')
      st.style.color='#f85149'
    }
  }catch(e){st.textContent='Error: '+e.message;st.style.color='#f85149'}
  btn.disabled=selected.length!==2
}

async function loadGallery(){
  var files=await(await fetch('/list')).json()
  var el=document.getElementById('gallery')
  el.innerHTML=''
  selected=[];updateCompareBtn()
  if(!files.length){el.innerHTML='<p style="color:#8b949e;text-align:center;grid-column:1/-1">No images yet</p>';return}
  files.forEach(function(f){
    var url='/images/'+f
    var ts=f.replace('fp_','').replace('.png','')
    var date=ts?new Date(parseInt(ts)).toLocaleString('th-TH'):f
    var card=document.createElement('div')
    card.className='card'
    card.addEventListener('click',function(e){
      if(e.target.classList.contains('btn-del'))return
      toggleSelect(f,card)
    })
    var img=document.createElement('img')
    img.src=url;img.alt='fingerprint';img.loading='lazy'
    img.addEventListener('error',function(){this.style.background='#f85149';this.style.height='80px'})
    var info=document.createElement('div')
    info.className='card-info'
    var span=document.createElement('span');span.textContent=date
    var btn=document.createElement('button');btn.className='btn-del';btn.textContent='Delete'
    btn.addEventListener('click',function(){del(f)})
    info.appendChild(span);info.appendChild(btn)
    card.appendChild(img);card.appendChild(info)
    el.appendChild(card)
  })
}

async function del(f){
  if(!confirm('Delete '+f+'?'))return
  await fetch('/images/'+f,{method:'DELETE'})
  loadGallery()
}

function openModal(url){document.getElementById('modal-img').src=url;document.getElementById('modal').classList.add('open')}
function closeModal(){document.getElementById('modal').classList.remove('open')}
document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)closeModal()})
loadGallery()
</script>
</body>
</html>`

app.get('/', (req, res) => res.send(HTML))

let scanning = false

app.get('/scan', (req, res) => {
    if (scanning) return res.json({ ok: false, error: 'กำลังสแกนอยู่ รอสักครู่' })
    scanning = true
    const filename = `fp_${Date.now()}.png`
    const filepath = path.join(IMGDIR, filename)
    const ps = spawn('powershell', [
        '-STA', '-ExecutionPolicy', 'Bypass',
        '-File', path.join(__dirname, 'capture.ps1'),
        filepath
    ])
    let stdout = '', stderr = ''
    ps.stdout.on('data', d => { stdout += d; process.stdout.write(d) })
    ps.stderr.on('data', d => { stderr += d; process.stderr.write(d) })
    ps.on('close', code => {
        scanning = false
        if (code === 0 && fs.existsSync(filepath)) {
            res.json({ ok: true, filename, debug: stderr.trim() })
        } else {
            res.json({ ok: false, error: stdout.trim() || 'exit ' + code, debug: stderr.trim() })
        }
    })
})

app.get('/compare', (req, res) => {
    const a = path.basename(req.query.a || '')
    const b = path.basename(req.query.b || '')
    const pa = path.join(IMGDIR, a)
    const pb = path.join(IMGDIR, b)
    if (!a || !b || !fs.existsSync(pa) || !fs.existsSync(pb))
        return res.json({ ok: false, error: 'invalid files' })

    const py = spawn('py', ['-3.12', path.join(__dirname, 'fp_compare.py'), pa, pb])
    let out = ''
    py.stdout.on('data', d => { out += d; process.stdout.write(d) })
    py.stderr.on('data', d => process.stderr.write(d))
    py.on('close', code => {
        if (code !== 0) return res.json({ ok: false, error: 'compare failed' })
        const scoreMatch = out.match(/Score\s*:\s*([\d.]+)%/)
        const score  = scoreMatch ? parseFloat(scoreMatch[1]).toFixed(1) : '?'
        const isMatch = out.includes('MATCH') && !out.includes('NO MATCH')
        res.json({ ok: true, score, match: isMatch })
    })
})

app.get('/comparison', (req, res) => {
    if (!fs.existsSync(CMP_OUT)) return res.status(404).send('Not found')
    res.sendFile(CMP_OUT)
})

app.get('/list', (req, res) => {
    const files = fs.readdirSync(IMGDIR)
        .filter(f => f.endsWith('.png'))
        .sort().reverse()
    res.json(files)
})

app.delete('/images/:file', (req, res) => {
    const fp = path.join(IMGDIR, path.basename(req.params.file))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    res.json({ ok: true })
})

app.listen(3000, () => console.log('http://localhost:3000'))
