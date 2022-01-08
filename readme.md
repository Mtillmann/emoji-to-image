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
| selectorPrefix | string |  | selector fragment to prepend to generated selectors. Must include trailing whitespace if required. |
| selectorSuffix | string |  | selector fragment to append to generated selectors. Must include leading whitespace if required. |
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
| deployOnConstruct | bool | true | Controls if the Helper should call its deploy method as soon as it's instantiated. Also required for the ComposedCSSHelper, see below... |

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

The Composed CSSHelper lets you compose multiple emojis into one output image to
avoid the clutter of multiple dom nodes that only display a background image.
It supports all features of the CSSHelper, which it extends. In addition to the
base class' options, there are a few extra options and features similar to the
other classes and features.

> Look at the [demos](https://mtillmann.github.io/emoji-to-image/?tab=csshelper) for some 

### Keys and Selectors
Simple emoji keys and selectors are based on the emojis properties. This isn't feasible for the compositions, so by default two selectors are generated from a given composition-key:

```css
/* key = 'something' */
.emojicomp_something, [data-compose-key="vcard_something"]{
	/* ... */
}
```
### Key and Caching
Compositions use their key as identifier for cache, so changing the properties of a composition wont change the previously cached image.

> Disable the Helper's cache during development

### Options

| option | type | default | description |
| --- | --- | --- | --- |
| defaultCompositionProperties | object | `{/* ... see below */}` | default properties for compositions |
| defaultEmojiProperties | object | `{/* ... see below */}` | default properties for emojis |
| positionSnap | int | 0 | when set, the calculated coordinates will snap to a grid of given pixels. Improves pixelated compositions |
| compositions | array | [] | A list of compositions to create programmatically on construct |
| selectorGenerator | function | `/*...*/` | generates a class based on the compose key by default, see the code demos for actual implementations |
| deployOnConstruct | bool | true | Because the super class will call _its own_ methods during the constructor, this option is always passed as `false` to the super class but stored locally as `localDeployOnConstruct` and handled as accordingly |

### Options.defaultCompositionProperties

A set of options that are applied to every composition rendered and may be omitted
from the input:

| option | type | default | description |
| --- | --- | --- | --- |
| key | string | 'DEFAULT' | the key for the composition. Must be unique and should work in a CSS class selector |
| width | int | 400 | the width of the composition |
| height | int | 400 | the height of the composition |
| bgmode | string | 'solid' | background mode, either solid or transparent |
| bgcolor | string | '#ffffff' | the background color, if bgmode is set to solid |

### Options.defaultEmojiProperties

A set of options that are applied to each emoji of every composition rendered and may be omitted
from the input. You can also set any property that your renderer will accept. Below is the built-in default:

| option | type | default | description |
| --- | --- | --- | --- |
| emoji | string | 'e' | the character to render |
| top | mixed | '50%' | the Y position of the emoji on the composition canvas. Can either be a string with a '%' sign, an int that's interpreted as a percentage or a float between 0 and 1 which also will be interpreted as a percentage of the composition canvas size, eg: `0.5`, `50` and `"50%"` are interpreted the same |
| left | mixed | '50%' | the X position, interpreted as described above  |
| translateX | mixed | '-50%' | the X translation, interpreted as described above |
| translateY | mixed | '-50% | the Y translation, interpreted as described above |

> individual emoji `targetWidth` is always overridden from the composition's `width` property. Use `scale` > 1  to if you want to render emojis larger than the composition canvas dimensions.

### Composition Structure

Compositions are objects that may locally define any property of `Options.defaultCompositionProperties`. Additionally it contains an array called `emojis` that contains a list of emojis, which are either literal emojis or objects that may locally override any property of `Options.defaultEmojiProperties`. 

```json
{
	"key" : "some_key",
	"width" : 400,
	"height": 600,
	"emojis" : [
		{
			"emoji" : "🛸",
			"top" : "25%",
			"left" : "75%",
			"scale" : 0.5
		},
		"🚀"
	]
}
```
> Emoji render order is determined by their position in the array, 0 is a the bottom.

### Compostions via data attributes

In addition to passing the emojis to render programatically, you can use the data attribute api, like this:

```html
<div
	data-compose-key="some_key"
	data-compose-0-emoji=="🛸"
	data-compose-0-top="25%"
	data-compose-0-left="75%"
	data-compose-0-scale="0.5"
	data-compose-1-emoji="🚀"
></div>
```
The markup will yield the same output as the JSON example above. `data-compose-key` is the required attribute to have the node picked up by the Helper. Additionaly, every composition property (as described in `Options.defaultCompositionProperties`)  can be passed similarly: `data-compose-width` etc. 

The emojis of the composition are added by attaching numbered data-attributes `data-compose-N-emoji` to the node. All other `Options.defaultEmojiProperties` properties and renderer's properties can be passed as well.

## Caching
Caching is done through the `CacheStorage`-API. Each rendered emoji's blob is assigned a URI based on the emoji's generated key.
If you call `deploy()` on a freshly created instance, the call may be delayed
until the cache has become ready!

>Cache is only available through https except for localhost!   