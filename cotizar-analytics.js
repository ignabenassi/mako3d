// Google Analytics (GA4). En archivo aparte para que la política de seguridad de la página
// no tenga que permitir scripts escritos dentro del HTML.
// En la PC de desarrollo no se manda nada, para no mezclar pruebas con visitas reales.
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
  gtag('js', new Date());
  gtag('config', 'G-FCPJY449ZR');
}
