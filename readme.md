# Emoji Renderer

Generate Bitmaps from built-in emojis: [Demos and Playground](https://mtillmann.github.io/emoji-to-image)

## Installation

`npm i ... --save`

There are three builds: CommonJS, ES Modules and a UMD build, in their respective folders: `dist/cjs`, `dist/esm` and `dist/umd`. The UMD build also comes with minified versions of all scripts.

>If you're using the scripts in the browser, use the **UMD build** and be aware that all classes live inside the `EMOJI` namespace!  

##Renderer Usage

Include the Renderer that's best suited for your use-case (see below) into your document or app, then use it like this:

```html
<script src="path/to/package/dist/umd/emoji-renderer-decorated.min.js"></script>
```

```javascript
const renderer = new EMOJI.DecoratedRenderer();
const canvas = renderer.render("🔥");

//directly append the canvas to your document
document.querySelector('.your-target-element').appendChild(canvas);

//create a data URL from the canvas
const img = document.createElement('img');
img.setAttribute('src', canvas.toDataURL());
document.body.appendChild(img);

//create a blob URL from the canvas and display it as an image
canvas.toBlob(blob => {
    const img = document.createElement('img');
    img.setAttribute('src', URL.createObjectURL(blob));
    document.body.appendChild(img);
});
```
The render-method also accepts an object that can overwrite any of the renderer's options for that call:
```javascript
const complexCanvas = renderer.render({
    emoji : "🔥",
    rotate: "20deg",
    pixelate : 5
});
```
A renderer instance will cache each generated canvas and return the same canvas for the same given set of options. For persistent caching and CSS Support, see the `CSSHelper` section below. 

## BaseRenderer

Renders an emoji-character:

### Options
| option | type | default | description |
| --- | --- | --- | --- |
| targetWidth | number | 600 | the target width of the emoji to render |
| bgcolor | string | null | optional background color for the output image |
| color | string | null | optional text color for regular characters |
| font | string | `sans-serif` | optional font name for regular characters |
| fontSize | string | null | optional font size to force on renderer |
| alphaThreshold | number | 0 | 0-255, alpha byte value below which the content of a pixel is discarded while cropping. Improves perceived crop quality, especially for pixelated rendering |

## TransformedRenderer

Extends `BaseRenderer` and adds crop, rotate and scale features:

### Options
| option | type | default | description |
| --- | --- | --- | --- |
| crop | bool | true | crops the output image to actual content size. This may cause the image to be smaller than the given `targetWidth` option because CanvasRenderingContext2D's text rendering- and measuring facilities aren't perfect. |
| scale | number | 1 | scale of the output, relative to the targetWidth |
| rotate | number or string | null | either a radian float or a degrees string ("123deg") |

## DecoratedRenderer

Extends `TransformedRenderer` and adds pixelate and outline effects:

### Options
| option | type | default | description |
| --- | --- | --- | --- |
| pixelate | number | 0 | when > 0, the outputs internal resolution will be divided by given number, then scaled up to create a pixelation effect |
| outline | number | 0 | when > 0, a simple outline is drawn around the pixel content |
| outlineColor | string | #ff0000 | the color of the outline |
| outlineMode | string | inside | "inside" will scale the initially rendered emoji down to fit the outline inside original bounds, "outside" will expand the bounds and keep the original emoji dimensions |

> You only need to include the class which features you use, the inheritance chain is included in each file, although not every class is exposed 

## CSSHelper

The `CSSHelper` class handles DOM, CSS and Caching in the browser.

### Options
| option | type | default | description |
| --- | --- | --- | --- |
| selectorGenerator | function | `/*code*/` | the selector generator, see code for default implementation and arguments |
| selectorPrefix | string |  | selector fragment to prepend to generated selectors |
| selectorSuffix | string |  | selector fragment to append to generated selectors |
| propertyGenerator | function | `/*code*/` | generates the property inside the CSSRule, defaults to `background-image`, see code for actual function |
| targetNode | Node | document.body | DOM node inside which to scan for `data-emoji` nodes |
| styleParentNode | Node | document.head | DOM node to which to append the generated stylesheet |
| onRender | function | null | callback when an emoji has been rendered or retrieved from cache, additionally you can listen for an `emoji:rendered` event on the targetNode or any of its parents |
| onDeploy | function | null | callback when an deploy() call has ended, i.e. all rules have been generated, additionally you can listen for an `emoji:deployed` event on the targetNode or any of its parents |
| useCache | bool | true | toggle usage of native `CacheStorage`, if available |
| cacheName | string | 'emoji' | identifier for the cache. If you use multiple instances of the helper and experience collisions, you can set it differently for each instance |
| imageFormat | string | 'image/png' | Image format for rendered/cached blobs: `image/png`, `image/jpeg` or `image/webp` if your environment permits |
| imageQuality | float | 1 | Quality of the image, 0 is worst, 1 is best |
| logTiming | bool | false | if true, the helper will log to console how long the deploy took. Useful to see how much of an impact the caching has |
| setDimensions | bool | false | when set, a second css rule containing the actual output dimensions will be generated |
| emojis | array | [] | optional list of emojis to render, regardless of existence in DOM. Array elements can be plain emojis or emoji objects according to renderer options |

###Usage
In a document where you want to use emojis as background images you'd use the CSSHelper like this:
```html
<!-- ... -->
<div data-emoji="🍌"></div>

<!-- ... -->
<script src="path/to/package/dist/umd/emoji-renderer-decorated.min.js"></script>
<script src="path/to/package/dist/umd/emoji-csshelper.min.js"></script>
<script>
    window.addEventListener('DOMContentLoaded', () => {
        const renderer = new EMOJI.DecoratedRenderer();
        const helper = new EMOJI.CSSHelper({}, renderer);
    });
</script>
```
The above example would create a style node with a single rule inside:
```html
<style>
[data-emojikey="🍌_0fnsst300"] {
    background-image: url(blob:https://yourhost.tld/adbf07f8-504e-4ac2-84c3-c960c98b9f3e);
}
</style>
```
###Complex Usage
You can pass a JSON object string as the `data-emoji`-attribute to control individual aspects of the emoji to render: 
```html
<!-- notice the single quote wraps on the attribute -->
<div data-emoji='{"emoji" : "🌶️", "scale": 0.4, "rotate" : "20deg"}'></div>
```
The above would yield this rule:
```css
[data-emojikey="🌶️_0fntss123ff0000is620deg02e4200"] {
    background-image: url(blob:https://yourhost.tld/19414b96-de42-4261-88c0-62380a16dbe2);
}
```

After the `deploy()` call, the node now looks like this and has the new attribute for the selector to match:
```html
<div data-emoji='{"emoji" : "🌶️", "scale": 0.4, "rotate" : "20deg"}' data-emojikey="🌶️_0fntss123ff0000is620deg02e4200"></div>
```

The generated keys are also used as caching filenames.

`deploy()` can be called multiple times, when new DOM has been added to the document.

If `JSON.parse` fails on the input, "⚠" is rendered in place.

###Data Attributes
To provide an easier API, each render option can also be controlled via data attributes:
```html
<div data-emoji='{"emoji" : "🌶️", "scale": 0.4, "rotate" : "20deg"}'></div>
```
yields the same key as
```html
<div data-emoji="🌶️" data-emoji-scale="0.4" data-emoji-rotate="20deg"></div>
```
All attributes:
`data-emoji-target-width` `data-emoji-color` `data-emoji-font` `data-emoji-bgcolor` `data-emoji-scale` `data-emoji-rotate`  `data-emoji-crop` `data-emoji-pixelate` `data-emoji-outline` `data-emoji-outline-color` `data-emoji-outline-mode` `data-emoji-alpha-threshold` `data-emoji-font-size`

## Composed CSSHelper


##Caching
Caching is done through the `CacheStorage`-API. Each rendered emoji's blob is assigned a URI based on the emoji's generated key.
If you call `deploy()` on a freshly created instance, the call may be delayed
until the cache has become ready!

>Cache is only available through https except for localhost!   