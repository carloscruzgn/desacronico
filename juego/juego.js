"use strict";
// desacrónico — versión digital. Funciona abriendo index.html, sin conexión ni servidor.

// ---------- Datos y utilidades ----------
const POR_ID = {};
CARTAS.forEach(c => POR_ID[c.id] = c);

const AMBITOS = [
  { id: "comunicacion", nombre: "Comunicación" },
  { id: "social", nombre: "Social" },
  { id: "cientifico", nombre: "Científico" },
  { id: "mujer", nombre: "Mujer y género" },
  { id: "coria", nombre: "Coria" },
];
const ERAS = [
  { id: "antigua", nombre: "Antigüedad" },
  { id: "media", nombre: "Edad Media" },
  { id: "moderna", nombre: "Edad Moderna" },
  { id: "contemporanea", nombre: "Edad Contemporánea" },
];
const NOMBRE_ERA = Object.fromEntries(ERAS.map(e => [e.id, e.nombre]));
const MODOS = {
  clasico: { titulo: "Modo competitivo tradicional", min: 2, max: 6 },
  eras: { titulo: "Modo competitivo de eras", min: 2, max: 6 },
  cooperativo: { titulo: "Modo cooperativo", min: 2, max: 6 },
};

const $ = s => document.querySelector(s);
function el(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat()) if (h != null) e.append(h);
  return e;
}
function barajar(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const textoPlano = html => html.replace(/<[^>]+>/g, "");
const fecha = c => (c.circa ? "c. " : "") + c.anio;
const img = (id, cara) => `cartas/${id}${cara}.jpg`;

function carta(id, cara, opciones = {}) {
  const c = POR_ID[id];
  const d = el("div", { class: "carta" + (opciones.clase ? " " + opciones.clase : ""), title: textoPlano(c.texto) + (cara === "r" ? " (" + fecha(c) + ")" : "") },
    el("img", { src: img(id, cara), alt: textoPlano(c.texto) + (cara === "r" ? ", " + fecha(c) : ""), draggable: "false" }));
  if (opciones.onclick) d.addEventListener("click", opciones.onclick);
  if (opciones.lupa) d.append(el("button", { class: "lupa", title: "Ampliar", onclick: ev => { ev.stopPropagation(); ampliar(id, cara === "r"); } }, "🔍"));
  return d;
}

// ---------- Pantallas ----------
function ir(id) {
  document.querySelectorAll(".pantalla").forEach(p => p.classList.toggle("activa", p.id === id));
  window.scrollTo(0, 0);
  if (id === "explorar") pintarExplorar();
}
document.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));
document.querySelectorAll("[data-modo]").forEach(b => b.addEventListener("click", () => prepararModo(b.dataset.modo)));

// ---------- Ventana ----------
function ventana(contenido, botones = [{ texto: "Cerrar" }], { cerrable = true } = {}) {
  const v = $("#ventana"); v.innerHTML = "";
  v.append(contenido);
  const fila = el("div", { class: "botones" });
  botones.forEach(b => fila.append(el("button", { class: b.secundario ? "secundario" : "", onclick: () => { cerrarVentana(); b.accion && b.accion(); } }, b.texto)));
  v.append(fila);
  $("#velo").classList.remove("oculto");
  $("#velo").dataset.cerrable = cerrable ? "1" : "";
  fila.querySelector("button:last-child").focus();
}
function cerrarVentana() { $("#velo").classList.add("oculto"); }
$("#velo").addEventListener("click", ev => { if (ev.target.id === "velo" && $("#velo").dataset.cerrable) cerrarVentana(); });
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && $("#velo").dataset.cerrable) cerrarVentana(); });

function ampliar(id, mostrarReverso) {
  const c = POR_ID[id];
  const caras = el("div", { class: "caras" + (mostrarReverso ? "" : " una") }, el("img", { src: img(id, "a"), alt: "Anverso" }));
  if (mostrarReverso) caras.append(el("img", { src: img(id, "r"), alt: "Reverso" }));
  ventana(el("div", {}, caras));
}

// ---------- Tamaño de las cartas ----------
function ajusteTam(input, contenedor) {
  const aplicar = () => contenedor.style.setProperty("--carta", input.value + "px");
  try { const g = localStorage.getItem("tam-" + input.id); if (g) input.value = g; } catch (e) {}
  aplicar();
  input.addEventListener("input", () => { aplicar(); try { localStorage.setItem("tam-" + input.id, input.value); } catch (e) {} if (partida && partida.repintar) partida.repintar(); });
}

// ---------- Preparación ----------
let modoActual = null;
function selectorAmbitos(cont, alCambiar) {
  cont.innerHTML = "";
  AMBITOS.forEach(a => {
    const n = CARTAS.filter(c => c.ambito === a.id).length;
    const cb = el("input", { type: "checkbox", value: a.id, checked: true, onchange: alCambiar });
    cont.append(el("label", { class: "ambito" }, cb, el("span", { class: "muestra", style: `background:var(--${a.id})` }), `${a.nombre} (${n})`));
  });
}
const ambitosElegidos = cont => [...cont.querySelectorAll("input:checked")].map(i => i.value);

function prepararModo(modo) {
  modoActual = modo;
  const m = MODOS[modo];
  $("#prep-titulo").textContent = m.titulo;
  selectorAmbitos($("#prep-ambitos"), actualizarPrep);
  const sel = $("#prep-num"); sel.innerHTML = "";
  for (let i = m.min; i <= m.max; i++) sel.append(el("option", { value: i }, String(i)));
  sel.value = Math.min(Math.max(2, m.min), m.max);
  sel.onchange = actualizarPrep;
  $("#prep-nombres").innerHTML = "";
  actualizarPrep();
  ir("preparar");
}
function actualizarPrep() {
  const n = +$("#prep-num").value;
  const cont = $("#prep-nombres");
  const previos = [...cont.querySelectorAll("input")].map(i => i.value);
  cont.innerHTML = "";
  for (let i = 0; i < n; i++) cont.append(el("input", { type: "text", maxlength: 20, placeholder: `Jugador ${i + 1}`, value: previos[i] || "" }));
  const mazo = CARTAS.filter(c => ambitosElegidos($("#prep-ambitos")).includes(c.ambito)).length;
  $("#prep-mazo").textContent = modoActual === "cooperativo"
    ? `Cartas disponibles: ${mazo}. Se usarán 36 al azar.`
    : `Cartas en el mazo: ${mazo}.`;
  $("#prep-error").textContent = errorPrep();
  $("#prep-empezar").disabled = !!errorPrep();
}
function errorPrep() {
  const n = +$("#prep-num").value;
  const mazo = CARTAS.filter(c => ambitosElegidos($("#prep-ambitos")).includes(c.ambito)).length;
  if (!mazo) return "Elige al menos un ámbito.";
  if (modoActual === "clasico" && mazo < n * 4 + 2) return `Con ${n} jugadores hacen falta al menos ${n * 4 + 2} cartas.`;
  if (modoActual === "eras" && mazo < n * 12 + 6) return `Con ${n} jugadores hacen falta al menos ${n * 12 + 6} cartas: añade más ámbitos o juega con menos jugadores.`;
  if (modoActual === "cooperativo" && mazo < 36) return "El modo cooperativo necesita al menos 36 cartas.";
  if (modoActual === "cooperativo" && 2 + n * 4 > 36) return "Demasiados jugadores para 36 cartas.";
  return "";
}
$("#prep-empezar").addEventListener("click", () => {
  if (errorPrep()) return;
  const nombres = [...$("#prep-nombres").querySelectorAll("input")].map((i, k) => i.value.trim() || `Jugador ${k + 1}`);
  const ids = barajar(CARTAS.filter(c => ambitosElegidos($("#prep-ambitos")).includes(c.ambito)).map(c => c.id));
  empezar(modoActual, nombres, ids);
});

// ---------- Mesa común ----------
let partida = null;
ajusteTam($("#tam-cartas"), $("#mesa"));
$("#mesa-salir").addEventListener("click", () => {
  if (partida && !partida.terminada) ventana(el("p", {}, "¿Salir de la partida? Se perderá."), [{ texto: "Seguir jugando", secundario: true }, { texto: "Salir", accion: () => { partida = null; ir("inicio"); } }]);
  else { partida = null; ir("inicio"); }
});
function empezar(modo, nombres, ids) {
  const P = { clasico: Clasico, eras: Eras, cooperativo: Cooperativo }[modo];
  partida = new P(nombres, ids);
  $("#mesa-titulo").textContent = MODOS[modo].titulo;
  ir("mesa");
  partida.repintar();
}
function estado(txt) { $("#mesa-estado").textContent = txt; }
function cuerpo(...hijos) { const c = $("#mesa-cuerpo"); c.innerHTML = ""; c.append(...hijos); }
function filaJugadores(jugadores, turno) {
  return el("div", { class: "jugadores" }, jugadores.map((j, i) =>
    el("span", { class: "jugador" + (i === turno ? " turno" : "") + (j.fuera ? " fuera" : "") }, `${j.nombre}${j.mano ? " · " + j.mano.length : ""}`)));
}

class Mazo {
  constructor(ids, rebarajar = true) { this.cartas = ids; this.descartes = []; this.rebarajar = rebarajar; }
  robar() {
    if (!this.cartas.length && this.rebarajar && this.descartes.length) {
      this.cartas = barajar(this.descartes); this.descartes = [];
      this.aviso = "Se ha agotado el mazo: se barajan los descartes.";
    }
    return this.cartas.pop() || null;
  }
}

// ---------- Modo competitivo tradicional ----------
class Clasico {
  constructor(nombres, ids) {
    this.mazo = new Mazo(ids);
    this.jugadores = nombres.map(n => ({ nombre: n, mano: [], fuera: false }));
    for (let k = 0; k < 4; k++) this.jugadores.forEach(j => j.mano.push(this.mazo.robar()));
    this.crono = [this.mazo.robar()];
    this.turno = 0; this.ronda = 1; this.sel = null; this.ultima = null;
    this.mensaje = `Empieza ${this.jugadores[0].nombre}. Elige una carta y después el hueco de la cronología donde quieres colocarla.`;
  }
  get activos() { return this.jugadores.filter(j => !j.fuera); }
  repintar() {
    const j = this.jugadores[this.turno];
    estado(`Ronda ${this.ronda} · Mazo: ${this.mazo.cartas.length} · Descartes: ${this.mazo.descartes.length}`);
    const crono = el("div", { class: "cronologia" + (this.sel && !this.terminada ? " colocando" : "") });
    const hueco = pos => el("button", { class: "hueco", title: "Colocar aquí", onclick: () => this.colocar(pos), disabled: !this.sel }, "▼");
    crono.append(hueco(0));
    this.crono.forEach((id, i) => {
      crono.append(carta(id, "r", { clase: id === this.ultima ? "nueva" : "", onclick: () => ampliar(id, true) }));
      crono.append(hueco(i + 1));
    });
    const mano = el("div", { class: "mano" }, this.terminada ? [] : j.mano.map(id =>
      carta(id, "a", { clase: id === this.sel ? "seleccionada" : "", lupa: true, onclick: () => { this.sel = this.sel === id ? null : id; this.repintar(); } })));
    cuerpo(
      filaJugadores(this.jugadores, this.terminada ? -1 : this.turno),
      el("div", { class: "zona" }, el("p", { class: "zona-titulo" }, "Cronología"), crono),
      el("div", { class: "mensaje " + (this.tono || ""), html: this.mensaje }),
      el("div", { class: "zona" }, el("p", { class: "zona-titulo" }, this.terminada ? "" : `Mano de ${j.nombre}`), mano),
      this.terminada ? el("div", { class: "acciones" }, el("button", { class: "grande", onclick: () => prepararModo("clasico") }, "Otra partida")) : null,
    );
    if (this.ultima) {
      const n = crono.querySelector(".nueva");
      if (n) n.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }
  colocar(pos) {
    const id = this.sel; if (!id) return;
    const j = this.jugadores[this.turno];
    const c = POR_ID[id];
    const izq = pos > 0 ? POR_ID[this.crono[pos - 1]].anio : -Infinity;
    const der = pos < this.crono.length ? POR_ID[this.crono[pos]].anio : Infinity;
    const bien = izq <= c.anio && c.anio <= der;
    j.mano.splice(j.mano.indexOf(id), 1);
    this.sel = null;
    let robo = null;
    if (bien) { this.crono.splice(pos, 0, id); this.ultima = id; }
    else { this.mazo.descartes.push(id); this.ultima = null; robo = this.mazo.robar(); if (robo) j.mano.push(robo); }
    const cab = el("div", {},
      el("p", { class: "resultado " + (bien ? "acierto" : "fallo") }, bien ? "¡Correcto!" : "¡Fallo!"),
      el("div", { class: "caras una" }, el("img", { src: img(id, "r"), alt: textoPlano(c.texto) + ", " + fecha(c) })),
      el("p", {}, bien ? "La carta se queda en la cronología." : `La carta va a los descartes${robo ? " y robas una nueva" : ""}.`));
    this.siguiente(bien, c);
    ventana(cab, [{ texto: this.terminada ? "Ver la mesa" : `Turno de ${this.jugadores[this.turno].nombre}`, accion: () => this.repintar() }], { cerrable: false });
    this.repintar();
  }
  siguiente(bien, c) {
    const anterior = this.jugadores[this.turno];
    // ¿se acaba la ronda? La ronda termina tras el último jugador activo en el orden de la mesa.
    const orden = this.jugadores.map((j, i) => i).filter(i => !this.jugadores[i].fuera);
    const finRonda = this.turno === orden[orden.length - 1];
    let txt = `${anterior.nombre} ${bien ? "acierta" : "falla"}: ${textoPlano(c.texto)} (${fecha(c)}).`;
    this.tono = bien ? "acierto" : "fallo";
    if (finRonda) {
      const acabaron = this.activos.filter(j => j.mano.length === 0);
      if (acabaron.length === 1) {
        this.terminada = true;
        this.mensaje = `${txt}<br><b>¡${acabaron[0].nombre} gana la partida!</b>`;
        estado(`Ronda ${this.ronda} · Fin`);
        return;
      }
      if (acabaron.length > 1) {
        this.activos.filter(j => j.mano.length > 0).forEach(j => j.fuera = true);
        acabaron.forEach(j => { const r = this.mazo.robar(); if (r) j.mano.push(r); });
        txt += `<br>Empate: ${acabaron.map(j => j.nombre).join(", ")} colocan su última carta en esta ronda. Los demás quedan eliminados y los empatados roban una carta.`;
      }
      this.ronda++;
    }
    const sig = finRonda ? orden.find(i => !this.jugadores[i].fuera) : orden.find(i => i > this.turno && !this.jugadores[i].fuera);
    this.turno = sig;
    if (this.mazo.aviso) { txt += "<br>" + this.mazo.aviso; this.mazo.aviso = null; }
    this.mensaje = `${txt}<br>Turno de <b>${this.jugadores[this.turno].nombre}</b>.`;
  }
}

// ---------- Modo competitivo de eras ----------
class Eras {
  constructor(nombres, ids) {
    this.mazo = new Mazo(ids);
    this.jugadores = nombres.map(n => ({ nombre: n, mano: [], puntos: 0, selecciones: [], erasUsadas: [] }));
    this.jugadores.forEach(j => this.reponer(j));
    this.ronda = 1; this.desempate = false; this.enJuego = this.jugadores.map((j, i) => i);
    this.empezarRonda();
  }
  reponer(j) { while (j.mano.length < 12) { const r = this.mazo.robar(); if (!r) break; j.mano.push(r); } }
  empezarRonda() {
    this.paso = 0; // índice dentro de enJuego
    this.fase = "cortina";
    this.jugadas = {};
  }
  get actual() { return this.jugadores[this.enJuego[this.paso]]; }
  repintar() {
    estado(`${this.desempate ? "Desempate" : "Ronda " + this.ronda} · Mazo: ${this.mazo.cartas.length}`);
    if (this.fase === "cortina") return this.pintarCortina();
    if (this.fase === "eligiendo") return this.pintarEleccion();
    if (this.fase === "resultado") return this.pintarResultado();
    if (this.fase === "final") return this.pintarFinal();
  }
  pintarCortina() {
    const j = this.actual;
    cuerpo(el("div", { class: "cortina" },
      el("p", {}, `Pasa el dispositivo a`), el("h2", { class: "logo-juego", style: "font-size:3rem" }, j.nombre),
      el("p", { class: "ayuda" }, "Los demás jugadores no deben mirar la pantalla."),
      el("button", { class: "grande", onclick: () => { this.fase = "eligiendo"; this.sel = new Set(); this.era = null; this.descartado = false; this.repintar(); } }, "Estoy listo")));
  }
  pintarEleccion() {
    const j = this.actual;
    const nSel = this.sel.size;
    const robos = { 1: 1, 3: 2, 5: 3 };
    const usadas = this.desempate ? [] : j.erasUsadas;
    const mano = el("div", { class: "mano" }, j.mano.map(id =>
      carta(id, "a", { clase: this.sel.has(id) ? "seleccionada" : "", lupa: true, onclick: () => { this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id); this.repintar(); } })));
    const eras = el("div", { class: "eras-botones" }, ERAS.map(e =>
      el("button", { class: "era-btn" + (this.era === e.id ? " elegida" : ""), style: `background:var(--${e.id})`, disabled: usadas.includes(e.id),
        title: usadas.includes(e.id) ? "Ya elegiste esta era en la primera ronda" : "", onclick: () => { this.era = e.id; this.repintar(); } }, e.nombre)));
    const descartar = el("button", { class: "secundario", disabled: this.descartado || !robos[nSel],
      onclick: () => {
        const fuera = [...this.sel];
        fuera.forEach(id => { j.mano.splice(j.mano.indexOf(id), 1); this.mazo.descartes.push(id); });
        for (let k = 0; k < robos[nSel]; k++) { const r = this.mazo.robar(); if (r) j.mano.push(r); }
        this.sel = new Set(); this.descartado = true; this.repintar();
      } }, robos[nSel] ? `Descartar ${nSel} y robar ${robos[nSel]}` : "Descartar (1, 3 o 5 cartas)");
    const confirmar = el("button", { class: "grande", disabled: !this.era && nSel > 0,
      onclick: () => {
        this.jugadas[this.enJuego[this.paso]] = { era: this.era, cartas: [...this.sel] };
        [...this.sel].forEach(id => j.mano.splice(j.mano.indexOf(id), 1));
        this.paso++;
        if (this.paso < this.enJuego.length) this.fase = "cortina"; else this.resolver();
        this.repintar();
      } }, nSel ? `Confirmar ${nSel} carta${nSel > 1 ? "s" : ""}${this.era ? " de " + NOMBRE_ERA[this.era] : ""}` : "Confirmar sin seleccionar ninguna");
    cuerpo(
      el("div", { class: "mensaje", html: `<b>${j.nombre}</b>: selecciona las cartas que creas de una misma era y declara cuál es.` +
        (this.descartado ? "" : "<br><span class='ayuda'>Antes puedes descartar una vez: selecciona 1, 3 o 5 cartas y pulsa «Descartar».</span>") }),
      el("div", { class: "acciones" }, descartar),
      el("div", { class: "zona" }, mano),
      el("p", { class: "zona-titulo", style: "text-align:center" }, "Era de tu selección"),
      eras,
      el("div", { class: "acciones", style: "padding:1rem" }, confirmar));
  }
  resolver() {
    this.resultados = this.enJuego.map(i => {
      const jg = this.jugadas[i];
      const buenas = jg.cartas.filter(id => POR_ID[id].era === jg.era);
      const malas = jg.cartas.filter(id => POR_ID[id].era !== jg.era);
      const quitarBuenas = Math.max(0, malas.length - 1);
      const quedan = Math.max(0, buenas.length - quitarBuenas);
      // se retiran las erróneas y tantas correctas como errores menos una
      const retiradas = malas.concat(buenas.slice(quedan));
      retiradas.forEach(id => this.mazo.descartes.push(id));
      const j = this.jugadores[i];
      if (jg.era && !this.desempate) j.erasUsadas.push(jg.era);
      j.selecciones.push({ ronda: this.desempate ? "Desempate" : this.ronda, era: jg.era, cartas: jg.cartas, quedan: buenas.slice(0, quedan) });
      return { i, quedan, buenas: buenas.length, malas: malas.length, era: jg.era, cartas: jg.cartas };
    });
    // puestos: el siguiente a un empate ocupa el puesto inmediato
    const valores = [...new Set(this.resultados.filter(r => r.quedan > 0).map(r => r.quedan))].sort((a, b) => b - a);
    const tabla = this.desempate ? [] : this.ronda === 1 ? [3, 2] : [2, 1];
    this.resultados.forEach(r => {
      const puesto = r.quedan > 0 ? valores.indexOf(r.quedan) : -1;
      r.puesto = puesto;
      r.puntos = puesto >= 0 && puesto < tabla.length ? tabla[puesto] : 0;
      this.jugadores[r.i].puntos += r.puntos;
    });
    this.fase = "resultado";
  }
  pintarResultado() {
    const bloques = this.resultados.map(r => {
      const j = this.jugadores[r.i];
      const quedan = new Set(j.selecciones[j.selecciones.length - 1].quedan);
      return el("div", { class: "seleccion" },
        el("h4", {}, `${j.nombre} — ${r.era ? NOMBRE_ERA[r.era] : "sin selección"}`),
        el("div", { class: "cartas" }, r.cartas.map(id => carta(id, "r", { clase: POR_ID[id].era !== r.era ? "mala" : quedan.has(id) ? "nueva" : "", onclick: () => ampliar(id, true) }))),
        el("p", {}, `${r.buenas} correcta${r.buenas === 1 ? "" : "s"}, ${r.malas} errónea${r.malas === 1 ? "" : "s"} → conserva ${r.quedan}` + (this.desempate ? "" : ` · ${r.puntos} punto${r.puntos === 1 ? "" : "s"}`)));
    });
    let botonTxt, accion;
    if (this.desempate) {
      const max = Math.max(...this.resultados.map(r => r.quedan));
      const top = this.resultados.filter(r => r.quedan === max);
      if (top.length === 1 && max > 0) { this.ganador = this.jugadores[top[0].i].nombre; botonTxt = "Ver resultado final"; accion = () => { this.fase = "final"; this.terminada = true; }; }
      else { botonTxt = "Nueva ronda de desempate"; accion = () => { if (max > 0) this.enJuego = top.map(r => r.i); this.prepararDesempate(); }; }
    } else if (this.ronda === 1) {
      botonTxt = "Segunda ronda"; accion = () => { this.ronda = 2; this.jugadores.forEach(j => this.reponer(j)); this.empezarRonda(); };
    } else {
      const max = Math.max(...this.jugadores.map(j => j.puntos));
      const top = this.jugadores.map((j, i) => i).filter(i => this.jugadores[i].puntos === max);
      if (top.length === 1) { this.ganador = this.jugadores[top[0]].nombre; botonTxt = "Ver resultado final"; accion = () => { this.fase = "final"; this.terminada = true; }; }
      else { botonTxt = "Desempate"; accion = () => { this.enJuego = top; this.desempate = true; this.prepararDesempate(); }; }
    }
    cuerpo(
      el("div", { class: "mensaje" }, "Todos voltean su selección a la vez."),
      el("div", { class: "selecciones" }, bloques),
      this.tablaPuntos(),
      el("div", { class: "acciones", style: "padding:1rem" }, el("button", { class: "grande", onclick: () => { accion(); this.repintar(); } }, botonTxt)));
  }
  prepararDesempate() {
    this.enJuego.forEach(i => this.reponer(this.jugadores[i]));
    this.empezarRonda();
  }
  tablaPuntos() {
    return el("table", { class: "tabla" }, el("tr", {}, el("th", {}, "Jugador"), el("th", {}, "Puntos")),
      this.jugadores.map(j => el("tr", {}, el("td", {}, j.nombre), el("td", { class: "num" }, String(j.puntos)))));
  }
  pintarFinal() {
    estado("Fin de la partida");
    cuerpo(el("div", { class: "cortina" },
      el("p", {}, "Gana la partida"), el("h2", { class: "logo-juego", style: "font-size:3rem" }, this.ganador),
      this.tablaPuntos(),
      el("button", { class: "grande", onclick: () => prepararModo("eras") }, "Otra partida")));
  }
}

// ---------- Modo cooperativo ----------
class Cooperativo {
  constructor(nombres, ids) {
    this.mazo = new Mazo(ids.slice(0, 36), false);
    this.jugadores = nombres.map(n => ({ nombre: n, mano: [] }));
    this.tumbadas = new Set();
    this.crono = [this.mazo.robar()];
    this.mazo.descartes.push(this.mazo.robar());
    for (let k = 0; k < 4; k++) this.jugadores.forEach(j => { const r = this.mazo.robar(); if (r) j.mano.push(r); });
    this.adicional = {}; // clave: "idIzq|idDer" → id de la carta encima
    this.turno = 0; this.jugadasTurno = 0; this.sel = null; this.ultima = null;
    this.mensaje = `Empieza ${this.jugadores[0].nombre}. Elige una carta: puedes jugar una o dos, o descartarte de una.`;
  }
  get tope() { return this.mazo.descartes[this.mazo.descartes.length - 1]; }
  get total() { return this.crono.length + Object.keys(this.adicional).length; }
  repintar() {
    const j = this.jugadores[this.turno];
    estado(`Cronología: ${this.total} · Mazo: ${this.mazo.cartas.length}`);
    // lienzo con la cronología principal abajo y la adicional encima, entre cada par
    const w = +$("#tam-cartas").value, h = w * 766 / 554, g = 10;
    const lienzo = el("div", { class: "coop-lienzo", style: `width:${this.crono.length * (w + g) + w / 2}px;height:${h * 2 + 20}px` });
    this.crono.forEach((id, i) => {
      const c = carta(id, "r", { clase: id === this.ultima ? "nueva" : "", onclick: () => ampliar(id, true) });
      c.style.left = (w / 4 + i * (w + g)) + "px"; c.style.top = (h + 16) + "px";
      lienzo.append(c);
      const enc = this.adicional[id + "|" + this.crono[i + 1]];
      if (enc) {
        const a = carta(enc, "r", { clase: enc === this.ultima ? "nueva" : "", onclick: () => ampliar(enc, true) });
        a.style.left = (w / 4 + i * (w + g) + (w + g) / 2) + "px"; a.style.top = "0px";
        lienzo.append(a);
      }
    });
    const crono = el("div", { class: "coop-crono" }, lienzo);
    const puedeJugar = this.jugadasTurno < 2 && !this.terminada;
    const selTumbada = this.sel && this.tumbadas.has(this.sel);
    const mano = el("div", { class: "mano" }, this.terminada ? [] : j.mano.map(id =>
      carta(id, "a", { clase: (id === this.sel ? "seleccionada " : "") + (this.tumbadas.has(id) ? "tumbada" : ""), lupa: true,
        onclick: () => { this.sel = this.sel === id ? null : id; this.repintar(); } })));
    const sinOpciones = !this.terminada && this.jugadasTurno === 0 && !this.puedeActuar(j);
    const acciones = el("div", { class: "acciones" },
      this.terminada ? el("button", { class: "grande", onclick: () => prepararModo("cooperativo") }, "Otra partida") : [
        el("button", { disabled: !this.sel || !puedeJugar || selTumbada, onclick: () => this.jugar() }, "Jugar la carta"),
        el("button", { disabled: !this.sel || this.jugadasTurno > 0 || !this.tope, onclick: () => this.descartar() }, "Descartarse de ella"),
        this.jugadasTurno === 1 ? el("button", { class: "secundario", onclick: () => this.finTurno(`${j.nombre} termina su turno tras jugar una carta.`) }, "Terminar el turno") : null,
        sinOpciones ? el("button", { class: "secundario", onclick: () => this.finTurno(`${j.nombre} no puede jugar ni descartarse: pasa el turno.`) }, "Pasar el turno") : null,
      ]);
    const pilas = el("div", { class: "pilas" },
      el("div", { class: "pila" }, el("div", {}, "Descartes"), this.tope ? carta(this.tope, "r", { onclick: () => ampliar(this.tope, true) }) : el("div", { class: "vacia" })),
      el("div", { class: "pila" }, el("div", {}, `Mazo (${this.mazo.cartas.length})`), this.mazo.cartas.length ? el("div", { class: "carta", style: "background:var(--tinta)" }) : el("div", { class: "vacia" })));
    cuerpo(
      filaJugadores(this.jugadores, this.terminada ? -1 : this.turno),
      el("div", { class: "zona" }, el("p", { class: "zona-titulo" }, "Cronología (arriba, la adicional)"), crono),
      el("div", { class: "mensaje " + (this.tono || ""), html: this.mensaje }),
      el("div", { class: "zona", style: "display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;align-items:flex-end" },
        el("div", {}, el("p", { class: "zona-titulo" }, this.terminada ? "" : `Mano de ${j.nombre}`), mano), pilas),
      acciones);
    const n = lienzo.querySelector(".nueva");
    if (n) crono.scrollLeft = n.offsetLeft - crono.clientWidth / 2 + w / 2;
  }
  puedeActuar(j) {
    return j.mano.some(id => !this.tumbadas.has(id)) || (this.tope && j.mano.some(id => POR_ID[id].logoAnverso === POR_ID[this.tope].logoReverso));
  }
  jugar() {
    const id = this.sel, j = this.jugadores[this.turno], c = POR_ID[id];
    const anios = this.crono.map(x => POR_ID[x].anio);
    j.mano.splice(j.mano.indexOf(id), 1); this.sel = null;
    let donde = null;
    if (c.anio <= anios[0]) { this.crono.unshift(id); donde = "a la izquierda de la cronología"; }
    else if (c.anio >= anios[anios.length - 1]) { this.crono.push(id); donde = "a la derecha de la cronología"; }
    else {
      // pares de cartas contiguas entre las que cae; se usa el primer hueco libre de la cronología adicional
      for (let i = 0; i < anios.length - 1 && !donde; i++) {
        const clave = this.crono[i] + "|" + this.crono[i + 1];
        if (anios[i] <= c.anio && c.anio <= anios[i + 1] && !this.adicional[clave]) { this.adicional[clave] = id; donde = "en la cronología adicional"; }
      }
    }
    this.jugadasTurno++;
    const cab = el("div", {}, el("div", { class: "caras una" }, el("img", { src: img(id, "r"), alt: textoPlano(c.texto) + ", " + fecha(c) })));
    if (donde) {
      this.ultima = id; this.tono = "acierto";
      cab.prepend(el("p", { class: "resultado acierto" }, `${fecha(c)}: se coloca ${donde}.`));
      const txt = `${j.nombre} coloca «${textoPlano(c.texto)}» (${fecha(c)}) ${donde}.`;
      if (this.jugadasTurno >= 2) this.finTurno(txt); else { this.mensaje = txt + " Puede jugar otra carta o terminar el turno."; }
    } else {
      j.mano.push(id); this.tumbadas.add(id); this.tono = "fallo";
      cab.prepend(el("p", { class: "resultado fallo" }, `${fecha(c)}: ya hay una carta en la cronología adicional entre esas fechas.`));
      this.finTurno(`${j.nombre} falla con «${textoPlano(c.texto)}» (${fecha(c)}): vuelve a su mano en horizontal y su turno termina.`);
    }
    ventana(cab, [{ texto: "Seguir", accion: () => this.repintar() }], { cerrable: false });
    this.repintar();
  }
  descartar() {
    const id = this.sel, j = this.jugadores[this.turno], c = POR_ID[id];
    const pos = { tl: "arriba a la izquierda", tr: "arriba a la derecha", bl: "abajo a la izquierda", br: "abajo a la derecha" };
    if (c.logoAnverso !== POR_ID[this.tope].logoReverso) {
      this.tono = "fallo";
      this.mensaje = `El logo de esa carta (${pos[c.logoAnverso]}) no coincide con el de la pila de descartes (${pos[POR_ID[this.tope].logoReverso]}). Elige otra acción.`;
      return this.repintar();
    }
    j.mano.splice(j.mano.indexOf(id), 1); this.tumbadas.delete(id); this.sel = null;
    this.mazo.descartes.push(id);
    this.tono = "";
    this.finTurno(`${j.nombre} se descarta de «${textoPlano(c.texto)}» (${fecha(c)}).`);
  }
  finTurno(txt) {
    const j = this.jugadores[this.turno];
    while (j.mano.length < 4) { const r = this.mazo.robar(); if (!r) break; j.mano.push(r); }
    this.jugadasTurno = 0; this.sel = null;
    // fin: sin cartas en ninguna mano o todas en horizontal
    const quedan = this.jugadores.flatMap(x => x.mano);
    if (!quedan.length || quedan.every(id => this.tumbadas.has(id))) {
      this.terminada = true;
      this.mensaje = `${txt}<br><b>Fin de la partida: habéis conseguido una cronología de ${this.total} cartas (mazo de 36).</b>`;
      return this.repintar();
    }
    this.turno = (this.turno + 1) % this.jugadores.length;
    this.mensaje = `${txt}<br>Turno de <b>${this.jugadores[this.turno].nombre}</b>.`;
    this.repintar();
  }
}

// ---------- Explorar ----------
selectorAmbitos($("#filtro-ambitos"), pintarExplorar);
ERAS.forEach(e => $("#filtro-era").append(el("option", { value: e.id }, e.nombre)));
["#filtro-era", "#filtro-orden", "#filtro-reverso"].forEach(s => $(s).addEventListener("change", pintarExplorar));
$("#filtro-texto").addEventListener("input", pintarExplorar);
ajusteTam($("#tam-explorar"), $("#explorar"));
function pintarExplorar() {
  const amb = ambitosElegidos($("#filtro-ambitos"));
  const era = $("#filtro-era").value;
  const q = $("#filtro-texto").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const reverso = $("#filtro-reverso").checked;
  let lista = CARTAS.filter(c => amb.includes(c.ambito) && (!era || c.era === era) &&
    (!q || textoPlano(c.texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)));
  if ($("#filtro-orden").value === "crono") lista = lista.slice().sort((a, b) => a.anio - b.anio);
  $("#filtro-cuenta").textContent = `${lista.length} carta${lista.length === 1 ? "" : "s"}. Pulsa una carta para verla por las dos caras.`;
  const r = $("#rejilla"); r.innerHTML = "";
  lista.forEach(c => r.append(carta(c.id, reverso ? "r" : "a", { onclick: () => ampliar(c.id, true) })));
}

// ---------- Reglas y créditos ----------
$("#reglas-texto").innerHTML = TEXTOS.reglas;
(function () {
  const t = $("#creditos-texto");
  t.innerHTML = TEXTOS.creditos;
  const tabla = el("table", {}, el("tr", {}, el("th", {}, "Nº"), el("th", {}, "Carta"), el("th", {}, "Crédito de la imagen")));
  CARTAS.forEach(c => tabla.append(el("tr", {}, el("td", {}, c.id), el("td", { html: c.texto + " (" + fecha(c) + ")" }), el("td", {}, c.credito.replace(/^Imagen:\s*/, "")))));
  t.append(tabla);
})();
