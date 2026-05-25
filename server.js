const express = require('express')
const { spawn } = require('child_process')
const fs   = require('fs')
const path = require('path')

const app    = express()
const IMGDIR = path.join(__dirname, 'images')

if (!fs.existsSync(IMGDIR)) fs.mkdirSync(IMGDIR)

app.use(express.static('.'))
app.use('/images', express.static(IMGDIR))

let scanning = false  // prevent concurrent scans

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
        const debug = stderr.trim()
        if (code === 0 && fs.existsSync(filepath)) {
            res.json({ ok: true, filename, debug })
        } else {
            res.json({ ok: false, error: stdout.trim() || 'exit ' + code, debug })
        }
    })
})

app.get('/list', (req, res) => {
    const files = fs.readdirSync(IMGDIR)
        .filter(f => f.endsWith('.png'))
        .sort()
        .reverse()
    res.json(files)
})

app.delete('/images/:file', (req, res) => {
    const fp = path.join(IMGDIR, path.basename(req.params.file))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    res.json({ ok: true })
})

app.listen(3000, () => console.log('http://localhost:3000'))
