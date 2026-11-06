# Nova Shop Guatemala — E-Commerce Shop Style Reference

Plataforma de comercio electrónico de alta gama, totalmente responsiva y preparada para producción, desarrollada bajo las especificaciones exactas del sistema de diseño **"Shop Style Reference"** y adaptada a la legislación y operaciones en **Guatemala**.

---

## 🇬🇹 1. Requerimientos Oficiales para Guatemala

### Sede Legal y Domicilio Fiscal
- **Razón Social:** Nova Commerce Solutions de Guatemala, S.A.
- **Nombre Comercial:** Nova Shop Guatemala
- **NIT SAT Guatemala:** 10482910-4
- **Registro Mercantil General:** No. 129482, Folio 182, Libro 89 de Sociedades Mercantiles
- **Sede Oficial y Domicilio Fiscal:** Diagonal 6, 10-01 Zona 10, Centro Gerencial Las Margaritas, Torre II, Nivel 12, Ciudad de Guatemala, Guatemala.
- **PBX Guatemala:** +502 2339-4820 | **WhatsApp Oficial:** [+502 3257-8665](https://wa.me/50232578665?text=Hola,%20estoy%20interesado%20en%20sus%20productos%20y%20quiero%20m%C3%A1s%20informaci%C3%B3n.)
- **Enlace Directo Oficial:** `https://wa.me/50232578665?text=Hola,%20estoy%20interesado%20en%20sus%20productos%20y%20quiero%20más%20información.`
- **Marco Jurídico:** Código de Comercio de Guatemala (Decreto 2-70) y Ley de Protección al Consumidor y Usuario (Decreto 06-2003 - DIACO).

### Moneda y Precios
- **Moneda oficial:** Quetzales (GTQ - `Q`).
- Toda la tienda (catálogo, vista rápida, carrito, subtotal, descuentos, checkout y confirmación) opera estrictamente en Quetzales (ej. `Q265.00`, `Q890.00`, `Q1,450.00`).
- **Envío Gratuito en Guatemala:** Meta progresiva a partir de compras de `Q500.00`.

### Método de Pago Único Oficial en el Checkout
- **🏦 Transferencia Bancaria / Depósito en Cuenta de Ahorro:**
  * **Banco Oficial:** BANRURAL
  * **Tipo de Cuenta:** Cuenta de Ahorro en Quetzales
  * **Número de Cuenta:** `4080161041`
  * **Nombre del Titular:** `IDALMA ODILI BARRERA`
  * **Función de copia rápida:** Botón "Copiar Cuenta" integrado para transferencias ágiles.
  * **Validación Obligatoria de Comprobante:**
    - Campo obligatorio: *Nombre de quien realiza el depósito / transferencia*.
    - Campo obligatorio: *Número de boleta o transferencia bancaria*.
    - Campo para adjuntar fotografía o PDF del comprobante de pago.
    - Botón de envío directo del comprobante al WhatsApp oficial: [+502 3257-8665](https://wa.me/50232578665?text=Hola,%20adjunto%20comprobante%20de%20dep%C3%B3sito%20Banrural%20a%20nombre%20de%20IDALMA%20ODILI%20BARRERA%20para%20mi%20pedido%20en%20Nova%20Shop.).

### Validaciones y Aceptación Legal Obligatoria
- Casilla de verificación requerida para aceptar los **Términos y Condiciones de Uso** y la **Política de Tratamiento de Datos Personales** de la sede en Ciudad de Guatemala antes de procesar el pedido.

---

## 🎨 2. Sistema de Diseño y Tokens "Shop"

- **Fondo General (Canvas Mist):** `#f2f4f5`
- **Superficies Principales & Tarjetas (Pure White):** `#ffffff`
- **Texto Primario & Encabezados (Ink Black):** `#000000`
- **Texto Secundario & Bordes Suaves:** `#787574` (Muted Gray) y `#ebebeb` (Faint Border)
- **Color de Acento Único (Shop Violet):** `#5433eb` con sombra tintada `rgba(69, 36, 219, 0.34) 0px 4px 24px 0px`
- **Radios:** Tarjetas de producto (`28px`), Pills e inputs (`9999px`), e imagen interna 1:1 (`20px`).
- **Sombras:** `rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px`.
- **Tipografía:** `Inter` con espaciado negativo apretado (`-0.031em` a `-0.05em`).

---

## ⚖️ 3. Módulos Legales y Prevención de Reclamaciones

- [Términos y Condiciones (Guatemala)](file:///c:/Users/gilbe/OneDrive/Desktop/tienda%20en%20linea%20madre/terminos.html)
- [Política de Privacidad y Datos Personales](file:///c:/Users/gilbe/OneDrive/Desktop/tienda%20en%20linea%20madre/privacidad.html)
- [Política de Envíos, Garantías y Devoluciones](file:///c:/Users/gilbe/OneDrive/Desktop/tienda%20en%20linea%20madre/envios-garantias.html)
- **Aviso Flotante de Cookies:** Banner inferior estilo pill con persistencia en `localStorage`.

---

## 📂 Estructura del Proyecto

```
tienda en linea madre/
├── index.html              # Página principal (Catálogo, Checkout Guatemala, Drawer)
├── terminos.html           # Términos y Condiciones oficiales para Guatemala
├── privacidad.html         # Política de Privacidad y Datos (SAT / FEL)
├── envios-garantias.html   # Envíos en GT (24-48h Ciudad, 48-72h Departamentos)
├── css/
│   └── styles.css          # Tokens CSS del sistema Shop
├── js/
│   ├── products.js         # Catálogo con precios en Quetzales (Q)
│   └── app.js              # Lógica del checkout dinámico, carrito y modales GT
└── README.md               # Documentación general
```

---

## 🚀 Cómo Visualizar la Tienda

Abre directamente [index.html](file:///c:/Users/gilbe/OneDrive/Desktop/tienda%20en%20linea%20madre/index.html) en tu navegador preferido (Chrome, Edge, Safari, Firefox).
