import {CSSHelper} from "./CSSHelper";

export class ComposedCSSHelper extends CSSHelper {

    examples = [{
        key: 'asdf',
        width: 400,
        height: 600,
        bgcolor: '#aaaaaa',
        emojis: [
            '🦽',
            {
                emoji: '🚗'
            }
        ]
    }]

    constructor(options = {}, renderer) {
        super({
            ...{}, ...options
        }, renderer);
    }

    parseComposerDataAttribute(node) {

        let defaultProp = {
                emoji: '',
                scale: 1,
                top: '50%',
                left: '50%',
                translateX: '-50%',
                translateY: '-50%',
                rotate: 0,
                pixelate: 0
            },
            props = Object.keys(node.dataset).filter(key => key.substr(0, 5) === 'emoji');

        props.forEach(prop => {
            const camelCasedProp = 'emoji' + prop.replace(/(^\w)|-(\w)/g, m => m.slice(-1).toUpperCase())
            if (attributes.indexOf(camelCasedProp) > -1) {
                let objectProp = String(camelCasedProp).replace(/^emoji/, '').replace(/^\w/, m => m.toLowerCase());
                parsed[objectProp] = dataset[camelCasedProp];
            }
        });

        return parsed;
    }

    deploy() {
        super.deploy();

        if (!this.ready) {
            return;
        }

        let nodes = Array.from(this.options.targetNode.querySelectorAll('[data-compose]'));

        this.examples.forEach(example => {
            if (typeof example !== 'string') {
                example = JSON.stringify(example);
            }
            const node = document.createElement('div');
            node.dataset.compose = example;
            nodes.push(node);
        });

        nodes.forEach(node => {

        })


    }

    parseDataAttributes(node) {

    }
}