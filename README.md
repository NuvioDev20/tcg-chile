# Comparador Pokémon TCG Chile

Página web (instalable en el celular como app) que compara precios de **Pokémon TCG** en tiendas chilenas: **singles** y **producto sellado** (sobres, Booster Box, ETB, bundles, latas, colecciones, mazos) y accesorios.

- Agrupa el mismo producto de distintas tiendas y muestra el más barato primero.
- Filtros: **edición**, **idioma**, **tipo de producto** (singles / sellado / accesorios y subtipos), tienda, rango de precio, sólo con stock y bajas de precio recientes.
- Se actualiza sola: un proceso automático revisa las tiendas **cada 15 minutos**, y la página abierta revisa cada minuto si hay datos nuevos y se refresca sola.
- Guarda el precio anterior de cada producto para mostrar **"↓ bajó $X"**.
- Los filtros quedan en la URL, así que puedes compartir una búsqueda.

> **¿Por qué cada 15 minutos y no al instante?** Las tiendas no avisan cuando cambian un precio, así que la única forma es revisarlas periódicamente. 15 minutos es un buen equilibrio entre frescura y no sobrecargar a las tiendas (GitHub permite como mínimo cada 5 minutos).

## Cómo funciona

```
stores.json ──► scraper/ (Node.js) ──► public/data/products.json ──► public/ (página)
                  │                                                    ▲
                  └─ GitHub Actions lo corre cada 15 min y publica en GitHub Pages
```

El recolector lee cada tienda por su API pública, según su plataforma:

| Plataforma | Cómo se lee | Ejemplos |
|---|---|---|
| Shopify | `/products.json` y `/collections.json` | AFK Store, La Comarca, Singles Vault, Oasis Games |
| WooCommerce | `/wp-json/wc/store/v1/products` | CardNexus, TCG Prime, Level Up |
| Jumpseller | catálogo público de la plataforma en `/api/mcp` | Ruta 12, RT Gamer, Pandora |
| Otras (WooCommerce sin API, sitios propios…) | sitemap + datos estructurados JSON-LD de cada producto (incremental: 250 páginas por ejecución) | Quest Loot, El Reino de los Duelos |

Con `"platform": "auto"` detecta la plataforma solo. Después clasifica cada producto (tipo, idioma, edición, número de carta, condición, terminación reverse holo) con las reglas de `scraper/lib/normalize.mjs` y la lista de ediciones de `scraper/sets.mjs`.

Es respetuoso: se identifica, respeta `robots.txt`, espera entre pedidos y reintenta con calma si la tienda responde con error.

## Publicarlo gratis (GitHub Pages)

1. Crea una cuenta en GitHub y un repositorio nuevo **público** (por ejemplo `tcg-chile`).
2. Sube todos los archivos de esta carpeta al repositorio (incluida la carpeta oculta `.github`).
3. En el repositorio ve a **Settings → Pages** y en *Source* elige **GitHub Actions**.
4. Ve a **Actions → Actualizar precios → Run workflow**. La primera ejecución tarda 2-3 minutos.
5. Tu página queda en `https://TU-USUARIO.github.io/tcg-chile/`. Desde ahí se actualiza sola cada 15 minutos.

Notas:
- GitHub pausa las tareas programadas de un repositorio público si pasan **60 días sin actividad** en él; basta con hacer cualquier cambio o reactivarla en la pestaña Actions.
- Si usas dominio propio, crea la variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables) con la dirección del sitio.

## Usarlo en tu computador

Requiere [Node.js](https://nodejs.org) 20 o superior. No hay dependencias que instalar.

```bash
npm run scrape        # lee todas las tiendas (≈9 minutos)
npm run scrape afkstore cardnexus   # sólo algunas tiendas
npm run serve         # abre http://localhost:8080
npm test              # pruebas
```

## Agregar una tienda

Agrega un bloque a `stores.json`:

```json
{ "id": "mitienda", "name": "Mi Tienda TCG", "url": "https://www.mitienda.cl", "platform": "auto" }
```

Opciones útiles:

| Campo | Para qué sirve |
|---|---|
| `platform` | `shopify`, `woocommerce`, `jumpseller`, `jsonld` o `auto` |
| `onlyPokemon` | `true` si la tienda vende sólo Pokémon (no filtra por palabra clave) |
| `collections` | (Shopify) lista de colecciones a leer, si la detección automática no sirve |
| `categories` | (WooCommerce) IDs o slugs de categorías a leer |
| `defaultSinglesLanguage` | idioma a asumir para singles sin idioma escrito (ej. `"en"`) |
| `productUrlPattern`, `urlFilter`, `sitemaps` | (genérico) cómo reconocer páginas de producto en el sitemap |
| `enabled` | `false` para pausarla |

## Agregar una edición nueva

En `scraper/sets.mjs` copia una línea y completa el nombre en inglés y español, y los textos con que las tiendas la escriben (`aliases`). Si su número total de cartas no lo comparte con otra edición, agrega `total` para reconocer singles como `012/088`.

## Tiendas incluidas

`stores.json` tiene **126 tiendas activas** y **62 pausadas**. La lista se armó a partir del directorio de tiendas TCG de Chile de [cardpulsechile.com](https://cardpulsechile.com/tiendas), más algunas tiendas encontradas aparte. Una actualización completa lee unos **49.000 productos Pokémon** en unos 9 minutos.

Cada tienda pausada tiene el motivo en el campo `nota`. Los más comunes:
- **Tiendas Bsale** (One Up Store, Gorila TCG, Guild Dreams, Tsuki Manga, etc.): su `robots.txt` sólo permite buscadores como Google, y eso se respeta.
- **Cloudflare** (New Player, Updown, Wargaming, WePlay, Mirax): bloquean a los lectores automáticos.
- **PrestaShop sin sitemap, Wix y sitios de una sola página**: su catálogo no se puede leer sin un navegador.
- **Sin productos Pokémon**: el catálogo se lee bien, pero hoy no tienen Pokémon. Si los agregan, basta con cambiar `enabled` a `true`.

Para sumar tiendas bloqueadas, lo mejor es pedirles permiso o un feed de productos: a muchas les conviene aparecer en un comparador.

## Limitaciones

- La clasificación (tipo, edición, idioma) se basa en el texto que escribe cada tienda; algunos productos quedan como "Edición sin identificar" o "Idioma sin especificar". Puedes ver y filtrar esos casos en la página.
- Shopify entrega como máximo 25.000 variantes por colección.
- Los grandes retail (Falabella, Ripley, Paris, Líder, Mercado Libre) no están incluidos: usan protecciones anti-bots y sus términos lo restringen.
- Los precios son referenciales: el precio final siempre es el de la tienda.
