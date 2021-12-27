'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class CSSHelper {
    processedEmojis = [];
    options = {
        selectorPrefix: '',
        selectorSuffix: '',
        propertyGenerator: dataURL => `background-image:url("${dataURL}");`,
        targetNode: document.body,
        styleParentNode: document.head,
        onRender: null,
        onDeploy: null,
        useCache: true,
        cacheName: 'emoji',
        imageFormat: 'image/png',
        imageQuality: 1,
        logTiming: false,
        setDimensions: false
    };
    styleNode = null;
    renderer = null;
    cacheSupported = false;
    cache = null;
    ready = true;
    timings = [];

    constructor(options, renderer) {
        this.options = {...this.options, ...options};
        if (!renderer) {
            console.error('renderer argument missing');
            return;
        }

        this.renderer = renderer;
        this.cacheSupported = 'caches' in window;

        if (!this.cacheSupported && this.options.useCache && window.location.protocol === 'http:') {
            console.error('Cache not supported on non-ssl URLs');
        }

        if (this.cacheSupported && this.options.useCache) {
            this.ready = false;
            caches.open(this.options.cacheName).then(cache => {
                this.cache = cache;
                this.ready = true;
                this.deploy();
            });
        } else {
            this.deploy();
        }


    }

    parseDataAttributes(node) {
        let props = [
                'bgcolor',
                'scale', 'rotate', 'crop',
                'pixelate', 'outline', 'outline-color', 'outline-mode'
            ],
            dataset = node.dataset,
            attributes = Object.keys(dataset).filter(key => key.substr(0, 5) === 'emoji'),
            emoji = dataset.emoji,
            parsed = {emoji};

        if (attributes.length === 1) {
            return emoji;
        }

        props.forEach(prop => {
            const camelCasedProp = 'emoji' + prop.replace(/(^\w)|-(\w)/g, m => m.slice(-1).toUpperCase());
            if (attributes.indexOf(camelCasedProp) > -1) {
                let objectProp = String(camelCasedProp).replace(/^emoji/, '').replace(/^\w/, m => m.toLowerCase());
                parsed[objectProp] = dataset[camelCasedProp];
            }
        });

        return parsed;
    }

    deploy() {
        if (this.timings.length === 0) {
            this.timings[0] = Date.now();
        }
        if (!this.ready) {
            console.log('helper not ready... most likely some cache issue, waiting for cache to become ready');
            return setTimeout(this.deploy.bind(this), 15);
        }

        this.options.targetNode.querySelectorAll('[data-emoji]').forEach(node => {
            if (node.dataset.emojikey) {
                return true;
            }

            const emoji = this.renderer.normalizeInput(this.parseDataAttributes(node)),
                key = this.renderer.normalize(emoji),
                selector = `${this.options.selectorPrefix}[data-emojikey="${key}"]${this.options.selectorSuffix}`;

            node.dataset.emojikey = key;

            if (key in this.processedEmojis) {
                return true;
            }

            this.processedEmojis[key] = true;

            if (key === 'PARSE_ERROR') {
                node.dataset.originalEmoji = node.dataset.emoji;
                node.dataset.emoji = 'PARSE_ERROR';
            }
            if (this.options.useCache && this.cacheSupported && key !== 'PARSE_ERROR') {
                this.cache.match(this.cacheURI(key))
                    .then(response => response.blob())
                    .then(blob => {
                        this.createCSSRule(selector, URL.createObjectURL(blob));
                        const eventPayload = {
                            instance: this,
                            key: key,
                            cached: true,
                            renderer: this.renderer
                        };
                        if (this.options.onRender) {
                            this.options.onRender(eventPayload);
                        }

                        this.options.targetNode.dispatchEvent(new CustomEvent('emoji:rendered', {
                            detail: eventPayload,
                            bubbles: true
                        }));
                    })
                    .catch((e) => {
                        this.createEmojiBitmap(selector, emoji, key);
                    });
            } else {
                this.createEmojiBitmap(selector, emoji, key);
            }
        });
    }


    createEmojiBitmap(selector, emoji, key) {

        this.renderer.render(emoji).toBlob(blob => {

            this.setCache(key, blob);
            this.createCSSRule(selector.trim(), URL.createObjectURL(blob));

            const eventPayload = {
                instance: this,
                key: key,
                cached: false,
                renderer: this.renderer,
                canvas: this.renderer.canvasCache[key]
            };

            if (this.options.onRender) {
                this.options.onRender(eventPayload);
            }

            this.options.targetNode.dispatchEvent(new CustomEvent('emoji:rendered', {
                detail: eventPayload,
                bubbles: true
            }));
        });

    }

    createCSSRule(selector, blobURI) {
        if (!this.styleNode) {
            this.styleNode = document.createElement('style');
            this.options.styleParentNode.appendChild(this.styleNode);
        }

        if (this.options.setDimensions) {
            const img = document.createElement('img');
            img.addEventListener('load', (function (selector, defaultProperty, sheet, done) {
                return function (e) {
                    sheet.insertRule(`${selector}{ ${defaultProperty}; width : ${e.target.width}px; height : ${e.target.height}px; }`);
                    done();
                }
            })(selector, this.options.propertyGenerator(blobURI), this.styleNode.sheet, this.emitDeployEvent.bind(this)));
            img.setAttribute('src', blobURI);
        } else {
            this.styleNode.sheet.insertRule(`${selector}{${this.options.propertyGenerator(blobURI)}}`);
            this.emitDeployEvent();
        }
    }

    emitDeployEvent() {
        let ruleTargetLength = Object.keys(this.processedEmojis).length;

        if (this.styleNode.sheet.cssRules.length < ruleTargetLength) {
            return;
        }

        this.timings.push(Date.now());
        if (this.options.logTiming) {
            console.log(
                `last deploy() call took ${this.timings.slice(-1) - this.timings.slice(-2, -1)}ms`
            );
        }

        const eventPayload = {
            instance: this,
            timings: this.timings
        };

        if (this.options.onDeploy) {
            this.options.onRender(eventPayload);
        }
        this.options.targetNode.dispatchEvent(new CustomEvent('emoji:deployed', {detail: eventPayload, bubbles: true}));

        this.timings = [];
    }

    setCache(key, blob) {
        if (key === 'PARSE_ERROR' || !this.options.useCache || !this.cacheSupported) {
            return false;
        }

        //todo cache dimensions jsons
        this.cache.put(this.cacheURI(key), new Response(blob));
    }

    cacheURI(key) {
        const uri = window.location.pathname,
            extension = this.options.imageFormat.split('/').pop();
        return uri.substring(0, uri.lastIndexOf("/")) + '/emoji/' + key + '.' + extension;
    }
}

exports.CSSHelper = CSSHelper;
