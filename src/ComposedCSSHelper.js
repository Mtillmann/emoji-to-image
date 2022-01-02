import {CSSHelper} from "./CSSHelper";

export class ComposedCSSHelper extends CSSHelper {

    usedCompositionKeys = {};

    constructor(options = {}, renderer) {

        const defaultCompositionProperties = {
            ...{
                key: 'DEFAULT',
                width: 400,
                height: 600,
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
                useCache: false,
                deployOnConstruct: false,
                selectorGenerator: (emoji, key, prefix, suffix) => `${prefix}.emojicomp_${key}${suffix}, ${prefix}[data-compose-key="${key}"]${suffix}`,
                compositions: [],
                positionSnap : 0
            }, ...options, ...{
                defaultCompositionProperties,
                defaultEmojiProperties
            }
        }, renderer);

        this.deploy()
    }

    parseComposeDataAttributes(node) {
        let attributes = Object.keys(node.dataset).filter(key => key.substr(0, 7) === 'compose'),
            composition = {
                emojis: []
            }

        attributes.forEach(attr => {
            if (/\-\d+/.test(attr)) {
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
                        }))
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

        document.body.appendChild(canvas)

        canvas.toBlob(blob => {
            this.setCache(key, blob);
            this.createCSSRule(selector.trim(), URL.createObjectURL(blob));
        });

    }


}