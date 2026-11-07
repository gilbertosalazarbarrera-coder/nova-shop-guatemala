/* Nova Shop Guatemala — Departamento y Municipio enlazados (datos en js/guatemala-geo.js). */
(function () {
  'use strict';

  function init() {
    const geo = window.GT_GEO;
    const dep = document.getElementById('checkoutDepartamento');
    const mun = document.getElementById('checkoutMunicipio');
    if (!geo || !dep || !mun) return;

    // Si el HTML no trae los departamentos, se cargan desde GT_GEO
    if (dep.options.length <= 1) {
      Object.keys(geo).forEach((d) => dep.add(new Option(d, d)));
    }

    function renderMunicipios() {
      const list = geo[dep.value] || [];
      mun.innerHTML = '';
      const ph = new Option(list.length ? 'Selecciona un municipio' : 'Primero elige un departamento', '', true, true);
      ph.disabled = true;
      mun.add(ph);
      const frag = document.createDocumentFragment();
      list.forEach((name) => frag.appendChild(new Option(name, name)));
      mun.appendChild(frag);
      mun.disabled = list.length === 0;   // se activa solo con un departamento válido
    }

    dep.addEventListener('change', renderMunicipios);

    // Si el formulario se reinicia (p. ej. tras confirmar un pedido), se vuelve a bloquear el municipio
    const form = document.getElementById('checkoutForm');
    if (form) form.addEventListener('reset', () => setTimeout(renderMunicipios, 0));

    renderMunicipios();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
