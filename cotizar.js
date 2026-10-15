// Cotizador online de Mako 3D.
// Habla con la API del cotizador (repo mako-cotizador). Todo texto que viene del servidor
// o del cliente (nombres de archivo) se escribe con textContent, nunca como HTML.

const API = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8000'
  : 'https://cotizar-api.mako3d.com.ar';
const LIMITES = { mbArchivo: 50, mbTotal: 95, archivos: 15, cantidad: 500 };
const EXTENSIONES = ['.stl', '.3mf', '.obj', '.zip'];
const WHATSAPP = 'https://wa.me/5491158067003?text=' +
  encodeURIComponent('Hola, vengo del cotizador online de Mako 3D y quiero cotizar una pieza.');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0';

const $ = (id) => document.getElementById(id);
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const mm = (v) => v.toLocaleString('es-AR', { maximumFractionDigits: 1 });

const estado = {
  archivos: [],          // File elegidos por el cliente
  archivosCambiados: false,
  id: null,              // id de la cotización en la API
  resultado: null,
  piezas: {},            // id -> { cantidad, escala }
  quitadas: new Set(),   // piezas que el cliente sacó del pedido
  turnstile: '',
};

// ---------- utilidades ----------

function el(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h instanceof Node ? h : String(h));
  return e;
}

function evento(nombre, datos = {}) {
  if (typeof gtag === 'function') gtag('event', nombre, datos);
}

function mostrarPaso(...ids) {
  for (const id of ['pasoArchivos', 'pasoEspera', 'pasoResultado', 'pasoContacto', 'pasoListo', 'pasoManual']) {
    $(id).hidden = !ids.includes(id);
  }
  if (estado) actualizarBarra();
}

function aviso(id, ...contenido) {
  const caja = $(id);
  caja.replaceChildren(...contenido);
  caja.hidden = contenido.length === 0;
}

function linkWhatsApp(texto = 'escribinos por WhatsApp') {
  return el('a', { href: WHATSAPP, target: '_blank', rel: 'noopener noreferrer' }, texto);
}

const extension = (nombre) => nombre.slice(nombre.lastIndexOf('.')).toLowerCase();
const megas = (bytes) => bytes / (1024 * 1024);

// ---------- paso 1: archivos ----------

function agregarArchivos(lista) {
  const rechazados = [];
  for (const f of lista) {
    if (!EXTENSIONES.includes(extension(f.name))) { rechazados.push(f.name); continue; }
    if (!estado.archivos.some((a) => a.name === f.name && a.size === f.size)) estado.archivos.push(f);
  }
  estado.archivosCambiados = true;
  dibujarLista();
  if (rechazados.length) {
    aviso('avisoArchivos', `No aceptamos ${rechazados.join(', ')}. Subí STL, 3MF, OBJ o un ZIP con ellos. `,
      'Si tenés un STEP u otro formato, ', linkWhatsApp(), '.');
  } else {
    aviso('avisoArchivos');
  }
  if (estado.archivos.length) {
    evento('cotizador_archivos_elegidos', { cantidad: estado.archivos.length });
    if (!estado.id) $('tituloUso').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function dibujarLista() {
  $('listaArchivos').replaceChildren(...estado.archivos.map((f, i) => el('li', {},
    el('span', { class: 'cz-nombre' }, el('span', { class: 'cz-tilde-chica', 'aria-hidden': 'true' }, '✓'), f.name),
    el('span', { class: 'cz-peso' }, `${megas(f.size).toFixed(1)} MB`),
    el('button', { class: 'cz-quitar', type: 'button', 'aria-label': `Quitar ${f.name}`, onclick: () => {
      estado.archivos.splice(i, 1);
      estado.archivosCambiados = true;
      dibujarLista();
    } }, '✕'),
  )));
  const boton = $('botonCotizar');
  boton.disabled = estado.archivos.length === 0;
  boton.textContent = estado.id ? 'Volver a cotizar' : 'Cotizar';
  $('tituloArchivos').classList.toggle('cz-hecho', estado.archivos.length > 0);
  actualizarBarra();
}

function actualizarBarra() {
  const n = estado.archivos.length;
  // La barra acompaña mientras se eligen archivos y uso; con el resultado a la vista, el resumen tiene su botón.
  $('barraCotizar').hidden = n === 0 || (!$('pasoResultado').hidden && !estado.archivosCambiados);
  $('barraArchivos').textContent = `${n} ${n === 1 ? 'archivo' : 'archivos'}`;
  $('barraUso').textContent = textoAplicacion();
}

function excedeLimites() {
  const grandes = estado.archivos.filter((f) => megas(f.size) > LIMITES.mbArchivo);
  const total = estado.archivos.reduce((s, f) => s + f.size, 0);
  if (grandes.length) {
    return `${grandes.map((f) => f.name).join(', ')} ${grandes.length > 1 ? 'pesan' : 'pesa'} más de ${LIMITES.mbArchivo} MB, el máximo del cotizador automático.`;
  }
  if (megas(total) > LIMITES.mbTotal) return `Entre todos los archivos suman ${megas(total).toFixed(0)} MB y el cotizador automático acepta hasta ${LIMITES.mbTotal} MB por pedido.`;
  if (estado.archivos.length > LIMITES.archivos) return `Son ${estado.archivos.length} archivos y el cotizador automático acepta hasta ${LIMITES.archivos} por pedido.`;
  return null;
}

function derivarAManual(texto, motivo) {
  $('tituloManual').textContent = 'Este pedido lo cotizamos a mano';
  $('textoManual').textContent = `${texto} No hay problema: mandanos los archivos por WhatsApp o email (podés usar WeTransfer o Google Drive) y te pasamos el presupuesto.`;
  mostrarPaso('pasoManual');
  evento('cotizador_derivado_manual', { motivo });
}

const aplicacion = () => document.querySelector('input[name="aplicacion"]:checked').value;
const textoAplicacion = () => document.querySelector('input[name="aplicacion"]:checked').closest('label').querySelector('strong').textContent;
const materialPreferido = () => $('materialPreferido').value.trim();
const HERRAMIENTAS = [
  { nombre: 'Formware', url: 'https://www.formware.co/onlinestlrepair' },
  { nombre: 'MeshLab', url: 'https://www.meshlab.net/' },
];

async function cotizar() {
  const exceso = excedeLimites();
  if (exceso) return derivarAManual(exceso, 'tamano');

  const datos = new FormData();
  for (const f of estado.archivos) datos.append('archivos', f, f.name);
  datos.append('aplicacion', aplicacion());
  datos.append('material_preferido', materialPreferido());
  datos.append('turnstile', estado.turnstile);

  mostrarPaso('pasoArchivos', 'pasoEspera');
  $('pasoEspera').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('botonCotizar').disabled = true;
  evento('cotizador_cotizar', { archivos: estado.archivos.length, aplicacion: aplicacion() });

  let r;
  try {
    r = await fetch(`${API}/api/cotizaciones`, { method: 'POST', body: datos });
  } catch {
    return sinServicio();
  } finally {
    $('botonCotizar').disabled = false;
  }
  const cuerpo = await r.json().catch(() => ({}));
  if (r.status === 413) return derivarAManual(cuerpo.detail || 'El pedido es demasiado grande.', 'tamano');
  if (!r.ok) {
    mostrarPaso('pasoArchivos');
    return aviso('avisoArchivos', cuerpo.detail || 'No pudimos procesar los archivos. ', ' ', linkWhatsApp('Escribinos'), ' y lo vemos.');
  }
  estado.id = cuerpo.id;
  estado.archivosCambiados = false;
  estado.piezas = {};
  estado.quitadas.clear();
  visores.clear();
  await esperarResultado();
}

function sinServicio() {
  mostrarPaso('pasoArchivos');
  aviso('avisoArchivos', 'El cotizador automático no está disponible en este momento. ',
    'Podés ', linkWhatsApp('mandarnos los archivos por WhatsApp'), ' y te cotizamos igual.');
  evento('cotizador_sin_servicio');
}

async function esperarResultado() {
  const inicio = Date.now();
  while (Date.now() - inicio < 5 * 60 * 1000) {
    let r;
    try {
      r = await fetch(`${API}/api/cotizaciones/${encodeURIComponent(estado.id)}`);
    } catch {
      return sinServicio();
    }
    const cuerpo = await r.json().catch(() => ({}));
    if (r.status === 404) {
      estado.id = null;
      mostrarPaso('pasoArchivos');
      return aviso('avisoArchivos', cuerpo.detail || 'La cotización venció. Volvé a cotizar.');
    }
    if (cuerpo.estado === 'lista') return mostrarResultado(cuerpo.resultado);
    if (cuerpo.estado === 'error') return derivarAManual(cuerpo.error, 'error_analisis');
    await new Promise((ok) => setTimeout(ok, 700));
  }
  derivarAManual('El análisis está tardando más de lo normal.', 'demora');
}

// ---------- paso 2: resultado ----------

function mostrarResultado(resultado) {
  estado.resultado = resultado;
  for (const p of resultado.piezas) {
    estado.piezas[p.id] = { cantidad: p.cantidad, escala: p.escala_dudosa ? null : p.escala };
  }
  $('piezas').replaceChildren(...resultado.piezas.map(tarjetaPieza));
  dibujarResumen();
  $('resumen').classList.remove('cz-cargando');
  mostrarPaso('pasoArchivos', 'pasoResultado');
  $('pasoResultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  dibujarLista();
  evento('cotizador_precio_mostrado', {
    automatico: resultado.precio_automatico,
    value: resultado.precio?.total_ars || 0,
    currency: 'ARS',
  });
}

function tarjetaPieza(p) {
  if (!p.imprimible) {
    return el('article', { class: 'cz-pieza cz-no-imprimible' },
      el('div', {},
        el('h3', {}, p.archivo),
        el('p', { class: 'cz-medidas' }, p.motivo || 'No pudimos cotizar esta pieza automáticamente.'),
        el('p', { class: 'cz-sugerencias' }, 'Podés quitarla y seguir con el resto, o dejarla y la revisamos a mano.'),
        el('button', { class: 'cz-chip', type: 'button', onclick: () => quitarPieza(p.id) }, 'Quitar del pedido'),
      ));
  }
  const [x, y, z] = p.medidas_mm;
  return el('article', { class: 'cz-pieza' },
    visor(p),
    el('div', {},
      el('h3', {}, p.archivo),
      el('p', { class: 'cz-medidas' }, el('b', {}, `${mm(x)} × ${mm(y)} × ${mm(z)} mm`),
        p.escala !== 1 ? ` · archivo en ${nombreUnidad(p.escala)}` : ''),
      p.escala_dudosa ? cajaEscala(p) : null,
      estadoArchivo(p),
      el('div', { class: 'cz-fila' }, selectorCantidad(p), precioPieza(p)),
    ));
}

function quitarPieza(id) {
  estado.quitadas.add(id);
  if (estado.resultado.piezas.every((p) => estado.quitadas.has(p.id))) {
    estado.id = null;
    estado.resultado = null;
    mostrarPaso('pasoArchivos');
    return aviso('avisoArchivos', 'Quitaste todas las piezas. Elegí otros archivos para cotizar.');
  }
  evento('cotizador_quitar_pieza');
  ajustar(0);
}

function estadoArchivo(p) {
  if (p.estado_archivo === 'listo') return el('p', { class: 'cz-estado cz-ok' }, '✓ Archivo listo para imprimir');
  const errores = p.estado_archivo === 'errores';
  return el('div', { class: `cz-estado-caja ${errores ? 'cz-error' : 'cz-adv'}` },
    el('p', { class: 'cz-estado-titulo' }, errores ? '⚠ Tu archivo tiene errores de malla' : '⚠ Revisá estos avisos'),
    el('ul', {}, p.avisos_archivo.map((a) => el('li', {}, a.texto))),
    errores ? el('p', {}, 'El precio es aproximado. Podés repararlo y volver a cotizar, o seguir: se imprime tal como lo enviaste. ',
      'Herramientas gratuitas: ', ...HERRAMIENTAS.flatMap((h, i) => [i ? ' · ' : '',
        el('a', { href: h.url, target: '_blank', rel: 'noopener noreferrer' }, h.nombre)])) : null,
  );
}

function nombreUnidad(escala) {
  return { 10: 'cm', 25.4: 'pulgadas', 1000: 'metros' }[escala] || 'mm';
}

function cajaEscala(p) {
  const [x, y, z] = p.medidas_mm;
  return el('div', { class: 'cz-escala' },
    el('p', {}, `Tu pieza mide ${mm(x)} × ${mm(y)} × ${mm(z)} mm, muy chica. ¿Tu archivo está en otra unidad?`),
    el('div', { class: 'cz-escala-botones' },
      p.escalas_alternativas.map((a) => el('button', { type: 'button', onclick: () => elegirEscala(p.id, a.factor) },
        `Está en ${a.unidad} → ${a.medidas_mm.map(mm).join(' × ')} mm`)),
      el('button', { type: 'button', onclick: () => elegirEscala(p.id, 1) }, 'Las medidas están bien'),
    ));
}

function elegirEscala(id, factor) {
  estado.piezas[id].escala = factor;
  visores.delete(id);  // cambia el tamaño: se vuelve a dibujar
  evento('cotizador_escala', { factor });
  ajustar(0);
}

function selectorCantidad(p) {
  const input = el('input', { type: 'number', min: 1, max: LIMITES.cantidad, value: estado.piezas[p.id].cantidad,
    'aria-label': `Cantidad de ${p.archivo}`, inputmode: 'numeric' });
  const fijar = (n) => {
    n = Math.round(Number(n) || 1);
    if (n > LIMITES.cantidad) {
      aviso('avisoArchivos');
      derivarAManual(`Para más de ${LIMITES.cantidad} unidades de una pieza preparamos un presupuesto a medida, con mejor precio por cantidad.`, 'cantidad');
      return;
    }
    n = Math.max(1, n);
    input.value = n;
    if (n !== estado.piezas[p.id].cantidad) {
      estado.piezas[p.id].cantidad = n;
      ajustar();
    }
  };
  input.addEventListener('change', () => fijar(input.value));
  return el('div', { class: 'cz-cantidad' },
    el('button', { type: 'button', 'aria-label': 'Una menos', onclick: () => fijar(Number(input.value) - 1) }, '−'),
    input,
    el('button', { type: 'button', 'aria-label': 'Una más', onclick: () => fijar(Number(input.value) + 1) }, '+'),
  );
}

function precioPieza(p) {
  if (p.precio_unitario_ars == null) return el('div', { class: 'cz-precio' }, el('small', {}, 'Precio a confirmar'));
  const ahorra = p.subtotal_pedida_sola_ars > p.subtotal_ars;
  const rebajado = p.precio_unitario_regular_ars > p.precio_unitario_ars;
  return el('div', { class: 'cz-precio' },
    rebajado ? el('small', {}, el('s', {}, `${pesos.format(p.precio_unitario_regular_ars)} c/u`)) : null,
    el('span', { class: 'cz-unit' }, `${pesos.format(p.precio_unitario_ars)} c/u`),
    p.cantidad > 1 ? el('small', {}, `Subtotal ${pesos.format(p.subtotal_ars)}`) : null,
    ahorra ? el('small', {}, 'Pedida sola: ', el('s', {}, pesos.format(p.subtotal_pedida_sola_ars))) : null,
  );
}

function dibujarResumen() {
  const r = estado.resultado;
  const imprimibles = r.piezas.filter((p) => p.imprimible);
  const pendientes = r.confirmar_medidas.length > 0;
  const hijos = [el('h2', {}, 'Tu pedido'),
    el('dl', {},
      el('dt', {}, 'Piezas'), el('dd', {}, imprimibles.length),
      el('dt', {}, 'Unidades'), el('dd', {}, r.unidades),
      el('dt', {}, 'Uso'), el('dd', {}, textoAplicacion()),
    )];

  if (r.precio?.total_ars != null) {
    const promo = r.precio.promocion;
    if (promo) {
      const [a, m, d] = promo.hasta.split('-');
      hijos.push(el('p', { class: 'cz-promo' },
        el('strong', {}, `${promo.texto}: ${Math.round(promo.descuento * 100)}% de descuento`),
        ` hasta el ${d}/${m}/${a}.`));
    }
    hijos.push(el('div', { class: 'cz-total' }, el('span', {}, 'Total estimado'),
      r.precio.total_regular_ars > r.precio.total_ars ? el('s', { class: 'cz-regular' }, pesos.format(r.precio.total_regular_ars)) : null,
      el('strong', {}, pesos.format(r.precio.total_ars))));
    if (r.precio.pedido_minimo_ars) {
      hijos.push(el('p', { class: 'cz-nota' }, `Incluye el ajuste al pedido mínimo de ${pesos.format(r.precio.pedido_minimo_ars)}.`));
    }
    if (r.precio.descuento_por_kilos > 0) {
      hijos.push(el('p', { class: 'cz-ahorro' }, `Incluye ${Math.round(r.precio.descuento_por_kilos * 100)}% de descuento por volumen.`));
    }
    if (r.precio.ahorro_ars > 0) {
      hijos.push(el('p', { class: 'cz-ahorro' }, `Ahorrás ${pesos.format(r.precio.ahorro_ars)} frente a pedir cada pieza por separado.`));
    }
    hijos.push(el('p', { class: 'cz-nota' }, 'Precio en pesos argentinos. Te confirmamos plazo y entrega al recibir el pedido.'));
  } else if (r.precio?.rango_estimado_ars) {
    const [a, b] = r.precio.rango_estimado_ars;
    hijos.push(el('div', { class: 'cz-total' }, el('span', {}, 'Precio estimado'), el('strong', {}, `${pesos.format(a)} – ${pesos.format(b)}`)));
  }
  if (!r.precio_automatico) {
    hijos.push(el('p', { class: 'cz-nota' }, 'Este pedido lo revisamos antes de confirmarte el precio:'),
      el('ul', { class: 'cz-motivos' }, r.motivos_cotizacion_manual.map((m) => el('li', {}, m))));
  }
  if (pendientes) hijos.push(el('p', { class: 'cz-aviso' }, 'Confirmá las medidas de las piezas marcadas para continuar.'));
  if (imprimibles.length) {
    hijos.push(el('button', { class: 'btn-primary cz-boton', type: 'button', disabled: pendientes, onclick: irAContacto },
      r.precio_automatico ? 'Confirmar pedido' : 'Enviar para cotizar'));
  } else {
    hijos.push(el('p', { class: 'cz-nota' }, 'No pudimos cotizar estos archivos automáticamente. ', linkWhatsApp('Escribinos'), ' y los revisamos.'));
  }
  $('resumen').replaceChildren(...hijos);
}

let temporizador = null;
function ajustar(demora = 500) {
  clearTimeout(temporizador);
  $('resumen').classList.add('cz-cargando');
  temporizador = setTimeout(async () => {
    const cuerpo = {
      aplicacion: aplicacion(),
      piezas: estado.resultado.piezas.filter((p) => !estado.quitadas.has(p.id))
        .map((p) => ({ id: p.id, ...estado.piezas[p.id] })),
    };
    let r;
    try {
      r = await fetch(`${API}/api/cotizaciones/${encodeURIComponent(estado.id)}/ajustar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
      });
    } catch {
      return sinServicio();
    }
    if (r.status === 409) return ajustar(800);  // todavía calculando el cambio anterior
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      $('resumen').classList.remove('cz-cargando');
      return aviso('avisoArchivos', typeof e.detail === 'string' ? e.detail : 'No pudimos aplicar el cambio.');
    }
    await esperarResultado();
  }, demora);
}

// Cambiar material o uso con una cotización abierta: se recalcula sin volver a subir.
document.querySelectorAll('input[name="aplicacion"]').forEach((i) => i.addEventListener('change', () => {
  actualizarBarra();
  if (estado.id && !estado.archivosCambiados && estado.resultado) ajustar(0);
}));

$('materialPreferido').addEventListener('change', () => {
  if (estado.id) { estado.archivosCambiados = true; dibujarLista(); }
});

// ---------- visor 3D ----------

const visores = new Map();  // id de pieza -> elemento del visor (se reutiliza al recalcular)
let three = null;

function visor(p) {
  if (visores.has(p.id)) return visores.get(p.id);
  const caja = el('div', { class: 'cz-visor' }, 'Vista previa');
  visores.set(p.id, caja);
  const archivo = estado.archivos.find((f) => f.name === p.archivo && extension(f.name) !== '.zip');
  if (archivo) dibujarModelo(caja, archivo).catch(() => { caja.textContent = 'Sin vista previa'; });
  else caja.textContent = 'Sin vista previa';
  return caja;
}

async function cargarThree() {
  if (!three) {
    three = Promise.all([
      import(`${THREE_CDN}/+esm`),
      import(`${THREE_CDN}/examples/jsm/controls/OrbitControls.js/+esm`),
      import(`${THREE_CDN}/examples/jsm/loaders/STLLoader.js/+esm`),
      import(`${THREE_CDN}/examples/jsm/loaders/3MFLoader.js/+esm`),
      import(`${THREE_CDN}/examples/jsm/loaders/OBJLoader.js/+esm`),
    ]).then(([THREE, c, stl, tmf, obj]) => ({ THREE, OrbitControls: c.OrbitControls,
      STLLoader: stl.STLLoader, ThreeMFLoader: tmf.ThreeMFLoader, OBJLoader: obj.OBJLoader }));
  }
  return three;
}

async function dibujarModelo(caja, archivo) {
  const { THREE, OrbitControls, STLLoader, ThreeMFLoader, OBJLoader } = await cargarThree();
  const ext = extension(archivo.name);
  const material = new THREE.MeshStandardMaterial({ color: 0x2f7dfa, roughness: 0.55, metalness: 0.1 });
  let objeto;
  if (ext === '.stl') {
    objeto = new THREE.Mesh(new STLLoader().parse(await archivo.arrayBuffer()), material);
  } else if (ext === '.3mf') {
    objeto = new ThreeMFLoader().parse(await archivo.arrayBuffer());
  } else {
    objeto = new OBJLoader().parse(await archivo.text());
  }
  objeto.traverse?.((o) => { if (o.isMesh) o.material = material; });

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xffffff, 0x1a2338, 2.2));
  const luz = new THREE.DirectionalLight(0xffffff, 1.6);
  luz.position.set(1, 2, 3);
  escena.add(luz);

  const caja3d = new THREE.Box3().setFromObject(objeto);
  const centro = caja3d.getCenter(new THREE.Vector3());
  const tamano = caja3d.getSize(new THREE.Vector3()).length() || 1;
  objeto.position.sub(centro);
  const pivote = new THREE.Group();
  pivote.add(objeto);
  pivote.rotation.x = -Math.PI / 2;  // los archivos de impresión vienen con Z hacia arriba
  escena.add(pivote);

  const camara = new THREE.PerspectiveCamera(35, 1, tamano / 100, tamano * 10);
  camara.position.set(tamano * 0.9, tamano * 0.7, tamano * 1.1);
  const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  render.setPixelRatio(Math.min(devicePixelRatio, 2));
  caja.replaceChildren(render.domElement);
  const controles = new OrbitControls(camara, render.domElement);
  controles.enableZoom = false;
  controles.enablePan = false;
  controles.autoRotate = true;
  controles.autoRotateSpeed = 1.5;

  const ajustarTamano = () => {
    const { width, height } = caja.getBoundingClientRect();
    if (!width || !height) return;
    render.setSize(width, height, false);
    camara.aspect = width / height;
    camara.updateProjectionMatrix();
  };
  new ResizeObserver(ajustarTamano).observe(caja);
  ajustarTamano();
  const cuadro = () => {
    if (caja.isConnected) { controles.update(); render.render(escena, camara); }
    requestAnimationFrame(cuadro);
  };
  cuadro();
}

// ---------- paso 3: contacto ----------

function irAContacto() {
  const conAvisos = estado.resultado.piezas.some((p) => p.imprimible && p.estado_archivo !== 'listo');
  $('checkAvisos').hidden = !conAvisos;
  $('formContacto').acepta_avisos.required = conAvisos;
  mostrarPaso('pasoArchivos', 'pasoResultado', 'pasoContacto');
  $('pasoContacto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  evento('cotizador_formulario');
}

$('formContacto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const datos = Object.fromEntries(new FormData(form));
  datos.acepta_condiciones = form.acepta_condiciones.checked;
  datos.acepta_avisos = form.acepta_avisos.checked;
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const r = await fetch(`${API}/api/cotizaciones/${encodeURIComponent(estado.id)}/confirmar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detalle = typeof cuerpo.detail === 'string' ? cuerpo.detail : 'Revisá los datos e intentá de nuevo.';
      return aviso('avisoContacto', detalle, ' Si sigue fallando, ', linkWhatsApp(), '.');
    }
    $('numeroPedido').textContent = cuerpo.numero;
    mostrarPaso('pasoListo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    evento('generate_lead', { method: 'cotizador', value: estado.resultado.precio?.total_ars || 0, currency: 'ARS' });
  } catch {
    aviso('avisoContacto', 'No pudimos enviar el pedido. ', linkWhatsApp('Escribinos por WhatsApp'), ' y lo cargamos nosotros.');
  } finally {
    boton.disabled = false;
  }
});

// ---------- arranque ----------

const zona = $('zonaArchivos');
$('inputArchivos').addEventListener('change', (e) => { agregarArchivos(e.target.files); e.target.value = ''; });
zona.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('inputArchivos').click(); } });
['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add('arrastrando'); }));
['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); }));
zona.addEventListener('drop', (e) => agregarArchivos(e.dataTransfer.files));
$('botonCotizar').addEventListener('click', cotizar);
$('volverArchivos').addEventListener('click', () => mostrarPaso('pasoArchivos'));

// Verificación anti-bots de Cloudflare: se activa poniendo data-sitekey en #turnstile.
const sitekey = $('turnstile').dataset.sitekey;
if (sitekey) {
  window.turnstileListo = () => window.turnstile.render('#turnstile', {
    sitekey, callback: (token) => { estado.turnstile = token; },
  });
  document.head.append(el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=turnstileListo&render=explicit', async: true }));
}
