class CSSHelper {
    processedEmojis = [];
    options = {
        selectorPrefix: '',
        selectorSuffix: '',
        propertyGenerator: dataURL => `background-image:url("${dataURL}");`,
        selectorGenerator: (emoji, key, prefix, suffix) => `${prefix}[data-emojikey="${key}"]${suffix}`,
        selectorPropertyAttacher: (node, key) => {
            node.dataset.emojikey = key;
        },
        targetNode: document.body,
        styleParentNode: document.head,
        onRender: null,
        onDeploy: null,
        useCache: true,
        cacheName: 'emoji',
        imageFormat: 'image/png',
        imageQuality: 1,
        logTiming: false,
        setDimensions: false,
        emojis: [],
        deployOnConstruct: true,
        omitDOM : false
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
                if (this.options.deployOnConstruct) {
                    this.deploy();
                }
            });
        } else {
            if (this.options.deployOnConstruct) {
                this.deploy();
            }
        }


    }

    parseDataAttributes(node) {
        let props = [
                'bgcolor', 'color', 'font', 'target-width',
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

        let nodes = [];
        if (this.options.targetNode && !this.options.omitDOM) {
            nodes = Array.from(this.options.targetNode.querySelectorAll('[data-emoji]'));
        }

        this.options.emojis.forEach(emoji => {
            if (typeof emoji !== 'string') {
                emoji = JSON.stringify(emoji);
            }
            const node = document.createElement('div');
            node.dataset.emoji = emoji;
            nodes.push(node);
        });

        this.options.emojis = [];

        nodes.forEach(node => {
            if (node.dataset.emojikey) {
                return true;
            }

            const emoji = this.renderer.normalizeInput(this.parseDataAttributes(node)),
                key = this.renderer.normalize(emoji),
                selector = this.options.selectorGenerator(emoji, key, this.options.selectorPrefix, this.options.selectorSuffix);

            this.options.selectorPropertyAttacher(node, key);

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

                        (this.options.targetNode || window).dispatchEvent(new CustomEvent('emoji:rendered', {
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

            (this.options.targetNode || window).dispatchEvent(new CustomEvent('emoji:rendered', {
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
        (this.options.targetNode || window).dispatchEvent(new CustomEvent('emoji:deployed', {detail: eventPayload, bubbles: true}));

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

class ComposedCSSHelper extends CSSHelper {

    usedCompositionKeys = {};

    constructor(options = {}, renderer) {

        const defaultCompositionProperties = {
            ...{
                key: 'DEFAULT',
                width: 400,
                height: 400,
                bgmode: 'solid',
                bgcolor: '#ffffff'
            }, ...options.defaultCompositionProperties
        }, defaultEmojiProperties = {
            ...{
                emoji: 'e',
                top: '50%',
                left: '50%',
                translateX: '-50%',
                translateY: '-50%'
            }, ...options.defaultEmojiProperties
        };

        super({
            ...{
                localDeployOnConstruct : options.deployOnConstruct || true,
                selectorGenerator: (emoji, key, prefix, suffix) => `${prefix}.emojicomp_${key}${suffix}, ${prefix}[data-compose-key="${key}"]${suffix}`,
                compositions: [],
                positionSnap : 0
            }, ...options, ...{
                defaultCompositionProperties,
                defaultEmojiProperties,
                deployOnConstruct: false
            }
        }, renderer);

        if(this.options.localDeployOnConstruct){
            this.deploy();
        }
    }

    parseComposeDataAttributes(node) {
        let attributes = Object.keys(node.dataset).filter(key => key.substr(0, 7) === 'compose'),
            composition = {
                emojis: []
            };

        attributes.forEach(attr => {
            if (/-\d+/.test(attr)) {
                const parts = /\-(\d+)([\w\-]+)/.exec(attr),
                    index = parseInt(parts[1], 10),
                    prop = parts[2].replace(/^\w/, m => m[0].toLowerCase());

                if (!composition.emojis[index]) {
                    composition.emojis[index] = {};
                }

                if (prop === 'emoji' && node.dataset[attr].slice(0, 1) === '{') {
                    composition.emojis[index] = JSON.parse(node.dataset[attr]);
                } else {
                    composition.emojis[index][prop] = node.dataset[attr];
                }
            } else {
                composition[attr.substr(7).toLowerCase()] = node.dataset[attr];
            }
        });

        return this.expandComposition(composition);
    }

    expandComposition(composition) {

        if (!composition.key) {
            console.log(`composition key must not be empty. @${JSON.stringify(composition)}`);
            return false;
        }

        if (composition.key in this.usedCompositionKeys) {
            console.log(`composition key already used. @${composition.key}`);
            return false;
        }

        this.usedCompositionKeys[composition.key] = true;

        composition = {...this.options.defaultCompositionProperties, ...composition};
        composition.emojis = composition.emojis.map(emoji => {
            if (typeof emoji === 'string') {
                emoji = {emoji};
            }
            return {...this.options.defaultEmojiProperties, ...emoji}
        });

        return composition;
    }

    normalizePosition(input, dim) {
        const isString = typeof input === 'string',
            isPerc = isString && /%$/.test(input);

        let float = parseFloat(input);

        if (isPerc && Math.abs(float) > 1) {
            float = float * 0.01;
        } else if (!isPerc && Math.abs(float) > 1) {
            float = float / dim;
        }

        if(this.options.positionSnap > 0){
            return Math.floor((float * dim) / this.options.positionSnap) * this.options.positionSnap;
        }

        return float * dim;
    }

    deploy() {
        super.deploy();

        if (!this.ready) {
            return;
        }

        let compositions = Array.from(this.options.targetNode.querySelectorAll('[data-compose-key]')).map(node => this.parseComposeDataAttributes(node));
        this.options.compositions.forEach(inputCompo => compositions.push(this.expandComposition(inputCompo)));

        compositions = compositions.filter(i => !!i);

        compositions.forEach(composition => {
            const key = `${composition.key}`,
                selector = this.options.selectorGenerator(null, key, this.options.selectorPrefix, this.options.selectorSuffix);

            if (this.cache && this.options.useCache && this.cacheSupported) {
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
                        this.createComposition(selector, composition, key);
                    });
            } else {
                this.createComposition(selector, composition, key);
            }
        });


    }

    createComposition(selector, composition, key) {

        const canvas = document.createElement("canvas"),
            context = canvas.getContext('2d');

        canvas.setAttribute('width', composition.width);
        canvas.setAttribute('height', composition.height);

        if (composition.bgmode === 'solid') {
            context.beginPath();
            context.fillStyle = composition.bgcolor;
            context.fillRect(0, 0, composition.width, composition.height);
            context.fill();
            context.closePath();
        }

        composition.emojis.forEach(emoji => {
            const emojiCanvas = this.renderer.render({
                    ...emoji, ...{targetWidth: composition.width}
                }),
                w = parseInt(emojiCanvas.getAttribute('width'), 10),
                h = parseInt(emojiCanvas.getAttribute('height'), 10),
                x = this.normalizePosition(emoji.left, composition.width) + this.normalizePosition(emoji.translateX, w),
                y = this.normalizePosition(emoji.top, composition.height) + this.normalizePosition(emoji.translateY, h);

            context.drawImage(emojiCanvas, x, y);
        });

        canvas.toBlob(blob => {
            this.setCache(key, blob);
            this.createCSSRule(selector.trim(), URL.createObjectURL(blob));
        });
    }
}

export { ComposedCSSHelper };
