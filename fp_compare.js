/**
 * Fingerprint comparison with visual output
 * npm install sourceafis jimp
 * Usage: node fp_compare.js probe.png candidate.png
 */
const { FingerprintMatcher, FingerprintImage, FingerprintTransparency } = require('sourceafis')
const Jimp = require('jimp')
const path = require('path')

const MATCH_THRESHOLD = 40

async function loadFP(filePath, dpi = 512) {
    const img = await Jimp.read(filePath)
    img.grayscale()
    const pixels = new Uint8Array(img.bitmap.width * img.bitmap.height)
    for (let y = 0; y < img.bitmap.height; y++) {
        for (let x = 0; x < img.bitmap.width; x++) {
            const idx = (y * img.bitmap.width + x) * 4
            pixels[y * img.bitmap.width + x] = img.bitmap.data[idx]
        }
    }
    return new FingerprintImage(dpi, { width: img.bitmap.width, height: img.bitmap.height, pixels })
}

function drawDot(img, x, y, r, hexColor) {
    const c = Jimp.cssColorToHex(hexColor)
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx*dx + dy*dy <= r*r) {
                img.setPixelColor(c, x+dx, y+dy)
            }
        }
    }
}

async function drawMinutiae(filePath, minutiae, matchedSet, label) {
    const img = await Jimp.read(filePath)
    img.rgba(true)

    for (let i = 0; i < minutiae.length; i++) {
        const m = minutiae[i]
        const x = Math.round(m.position.x)
        const y = Math.round(m.position.y)
        const isMatch = matchedSet.has(i)
        drawDot(img, x, y, isMatch ? 5 : 3, isMatch ? '#00ff00' : '#ff4444')
    }

    // dark top bar for label
    for (let y = 0; y < 22; y++) {
        for (let x = 0; x < img.bitmap.width; x++) {
            img.setPixelColor(0x000000cc, x, y)
        }
    }
    img.print(await Jimp.loadFont(Jimp.FONT_SANS_14_WHITE), 6, 4, label)
    return img
}

async function compare(probePath, candidatePath) {
    console.log(`Comparing:\n  probe     : ${probePath}\n  candidate : ${candidatePath}\n`)

    const probeFP     = await loadFP(probePath)
    const candidateFP = await loadFP(candidatePath)

    // collect transparency data
    const transparency = { probeMinutiae: [], candidateMinutiae: [], pairs: [] }
    const origTake = FingerprintTransparency.current?.take
    // SourceAFIS JS transparency via subclass
    let matcher, score
    try {
        matcher = new FingerprintMatcher(probeFP)
        score   = matcher.match(candidateFP)
    } catch(e) {
        console.error('Match error:', e.message)
        process.exit(1)
    }

    const verdict = score >= MATCH_THRESHOLD
    console.log(`Score    : ${score.toFixed(1)}`)
    console.log(`Result   : ${verdict ? 'MATCH ✓' : 'NO MATCH ✗'} (threshold ${MATCH_THRESHOLD})`)

    // get minutiae from matcher internals if available
    let probeMin = []
    let candMin  = []
    let pairs    = []
    try {
        probeMin = matcher.probe?.minutiae ?? []
        candMin  = matcher.candidate?.minutiae ?? []
        pairs    = matcher.bestPairing?.pairs ?? []
    } catch(e) { /* minutiae not accessible — draw without markers */ }

    const matchedProbe = new Set(pairs.map(p => p.probe))
    const matchedCand  = new Set(pairs.map(p => p.candidate))

    const probeLabel = `PROBE [${path.basename(probePath)}]  minutiae=${probeMin.length}`
    const candLabel  = `CANDIDATE [${path.basename(candidatePath)}]  minutiae=${candMin.length}`

    const [imgProbe, imgCand] = await Promise.all([
        drawMinutiae(probePath,     probeMin, matchedProbe, probeLabel),
        drawMinutiae(candidatePath, candMin,  matchedCand,  candLabel),
    ])

    const W = imgProbe.bitmap.width + imgCand.bitmap.width + 20
    const H = Math.max(imgProbe.bitmap.height, imgCand.bitmap.height) + 50

    const out = new Jimp(W, H, 0x0d1117ff)
    out.composite(imgProbe, 0, 0)
    out.composite(imgCand, imgProbe.bitmap.width + 20, 0)

    // verdict bar
    for (let y = H-50; y < H; y++)
        for (let x = 0; x < W; x++)
            out.setPixelColor(0x161b22ff, x, y)

    const verdictColor = verdict ? 0x3fb950ff : 0xf85149ff
    const verdictText  = `Score: ${score.toFixed(1)}   ${verdict ? 'MATCH' : 'NO MATCH'}   (threshold ${MATCH_THRESHOLD})`
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
    out.print(font, 10, H-38, verdictText)

    const outPath = 'fp_comparison.png'
    await out.writeAsync(outPath)
    console.log(`\nSaved: ${outPath}`)
}

const [,, probe, candidate] = process.argv
if (!probe || !candidate) {
    console.log('Usage: node fp_compare.js probe.png candidate.png')
    process.exit(1)
}
compare(probe, candidate).catch(e => { console.error(e); process.exit(1) })
