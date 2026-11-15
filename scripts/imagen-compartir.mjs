// La imagen para compartir (Open Graph, 1200x630): la vista previa de WhatsApp, Telegram o las redes. Recompone
// la portada sobre el tapete: la marca, el lema y la franja de las eras a la izquierda; el abanico, a la derecha.
// Las cartas del abanico salen al azar, como en la portada: si no convencen, se vuelve a generar.
// Uso, con `npm run dev` en marcha y playwright-core instalado aparte (no es dependencia del proyecto):
//   node scripts/imagen-compartir.mjs public/compartir.jpg
// En JPG y por debajo de 300 KB: WhatsApp no enseña la vista previa si pesa más.
import { chromium } from 'playwright-core'
const salida = process.argv[2] ?? 'og.png'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)
await p.evaluate(() => {
  for (const i of document.querySelectorAll('img')) i.loading = 'eager'
  const fondo = getComputedStyle(document.body)
  const og = document.createElement('div')
  og.id = 'og'
  Object.assign(og.style, {
    position: 'fixed', inset: '0', zIndex: '9999', display: 'grid', gridTemplateColumns: '560px 640px', alignItems: 'center',
    background: 'radial-gradient(120% 90% at 30% 0%, var(--tapete) 0%, var(--tapete-2) 75%), var(--tapete-2)',
  })
  const izq = document.createElement('div')
  Object.assign(izq.style, { padding: '0 0 0 76px', display: 'grid', gap: '18px', justifyItems: 'start' })
  const h1 = document.querySelector('.portada h1').cloneNode(true)
  Object.assign(h1.style, { margin: '0', fontSize: '102px', lineHeight: '1', fontWeight: '400' })
  const lema = document.querySelector('.portada .lema').cloneNode(true)
  Object.assign(lema.style, { margin: '0 0 0 6px', fontSize: '30px', lineHeight: '1.2' })
  const eras = document.createElement('div')
  Object.assign(eras.style, { display: 'flex', width: '420px', height: '7px', margin: '20px 0 0 6px', borderRadius: '4px', overflow: 'hidden' })
  for (const e of ['antigua', 'media', 'moderna', 'contemporanea']) {
    const s = document.createElement('i')
    Object.assign(s.style, { flex: '1', background: `var(--${e})` })
    eras.append(s)
  }
  izq.append(h1, lema, eras)
  const der = document.createElement('div')
  Object.assign(der.style, { position: 'relative', height: '630px' })
  const abanico = document.querySelector('.abanico').cloneNode(true)
  abanico.style.setProperty('--ancho', '235px')
  Object.assign(abanico.style, { position: 'absolute', left: '40px', right: '0', top: '118px', marginTop: '0', width: 'auto' })
  der.append(abanico)
  og.append(izq, der)
  for (const n of document.body.children) n.style.visibility = 'hidden'
  document.body.append(og)
})
await p.waitForTimeout(1500)
await p.screenshot({ path: salida, type: 'jpeg', quality: 86 })
await b.close()
