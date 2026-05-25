const express = require('express')
const { spawn } = require('child_process')
const fs   = require('fs')
const path = require('path')

const app    = express()
const IMGDIR = path.join(__dirname, 'images')

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
h1{text-align:center;font-size:1.4rem;margin-bottom:24px}
.scan-wrap{text-align:center;margin-bottom:28px}
#btn-scan{background:#2563eb;color:#fff;border:none;border-radius:10px;padding:14px 36px;font-size:1.1rem;cursor:pointer}
#btn-scan:hover{background:#1d4ed8}
#btn-scan:disabled{background:#475569;cursor:not-allowed}
#status{margin-top:12px;font-size:.9rem;color:#8b949e;min-height:20px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;overflow:hidden}
.card img{width:100%;display:block;background:#21262d;cursor:zoom-in}
.card-info{padding:8px 10px;font-size:.78rem;color:#8b949e;display:flex;justify-content:space-between;align-items:center}
.btn-del{background:transparent;border:1px solid #f85149;color:#f85149;border-radius:6px;padding:3px 8px;font-size:.72rem;cursor:pointer}
.btn-del:hover{background:#f85149;color:#fff}
#modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);justify-content:center;align-items:center;z-index:99}
#modal.open{display:flex}
#modal img{max-width:90vw;max-height:90vh;border-radius:8px}
#modal-close{position:fixed;top:16px;right:20px;background:transparent;border:none;color:#fff;font-size:2rem;cursor:pointer}
</style>
</head>
<body>
<h1>🖐 Fingerprint Gallery</h1>
<div class="scan-wrap">
  <button id="btn-scan" onclick="scan()">สแกนนิ้ว</button>
  <div id="status"></div>
</div>
<div id="gallery" class="gallery"></div>
<div id="modal" onclick="closeModal()">
  <button id="modal-close" onclick="closeModal()">✕</button>
  <img id="modal-img" src="" alt="">
</div>
<script>
async function scan(){
  const btn=document.getElementById('btn-scan'),st=document.getElementById('status')
  btn.disabled=true
  st.textContent='กำลังสแกน... วางนิ้ว → ยก → วางอีกครั้งค้างไว้'
  st.style.color='#8b949e'
  try{
    const r=await fetch('/scan')
    const d=await r.json()
    if(d.ok){st.textContent='สำเร็จ — '+d.filename;st.style.color='#3fb950';loadGallery()}
    else{st.textContent='ไม่สำเร็จ: '+(d.error||'unknown');st.style.color='#f85149'}
  }catch(e){st.textContent='Error: '+e.message;st.style.color='#f85149'}
  btn.disabled=false
}
async function loadGallery(){
  const files=await(await fetch('/list')).json()
  const el=document.getElementById('gallery')
  el.innerHTML=''
  files.forEach(f=>{
    const url='/images/'+f
    const ts=f.replace('fp_','').replace('.png','')
    const date=ts?new Date(parseInt(ts)).toLocaleString('th-TH'):f
    const card=document.createElement('div')
    card.className='card'
    card.innerHTML='<img src="'+url+'" alt="fingerprint" loading="lazy" onclick="openModal(\''+url+'\')" onerror="this.style.background=\'#f85149\';this.style.height=\'80px\'"><div class="card-info"><span>'+date+'</span><button class="btn-del" onclick="del(\''+f+'\')">ลบ</button></div>'
    el.appendChild(card)
  })
  if(!files.length)el.innerHTML='<p style="color:#8b949e;text-align:center;grid-column:1/-1">ยังไม่มีรูป</p>'
}
async function del(f){
  if(!confirm('ลบ '+f+'?'))return
  await fetch('/images/'+f,{method:'DELETE'})
  loadGallery()
}
function openModal(url){document.getElementById('modal-img').src=url;document.getElementById('modal').classList.add('open')}
function closeModal(){document.getElementById('modal').classList.remove('open')}
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
