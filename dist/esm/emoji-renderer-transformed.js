class BaseRenderer {

    measureCanvas;
    measureContext;
    canvasCache = {};
    measureCache = {};

    options = {
        targetWidth: 600,
        bgcolor: false,
        color: null,
        font: 'sans-serif',
        fontSize: null,
        alphaThreshold: 0
    }

    constructor(options = {}) {
        this.options = {...this.options, ...options};
        this.measureCanvas = document.createElement('canvas');
        this.measureContext = this.measureCanvas.getContext('2d');
    };

    measureCanvasContextContent(context, targetWidth, alphaThreshold = 0) {
        let bounds = {
                left: false,
                top: false,
                right: false,
                bottom: false
            },
            canvasWidth = parseInt(context.canvas.getAttribute('width'), 10),
            canvasHeight = parseInt(context.canvas.getAttribute('height'), 10),
            i;

        //brave fuzzes bytes to avoid fingerprinting, so it needs a special value
        const regularByteThreshold = navigator.brave ? 1 : 0,
            byteTest = (v, i) => ((i + 1) % 4 === 0) ? v > alphaThreshold : v > regularByteThreshold;
        //const byteTest = v => v > regularByteThreshold;

        for (i = 0; i < canvasWidth * .5; i++) {
            if (bounds.left && bounds.right) {
                break;
            }

            //sweep from left
            if (!bounds.left) {
                let col = context.getImageData(i, 0, 1, canvasHeight);
                if (col.data.filter(byteTest).length > 0) {
                    bounds.left = Math.max(0, i - 1);
                }
            }

            //from right
            if (!bounds.right) {
                let col = context.getImageData(canvasWidth - i, 0, 1, canvasHeight);
                if (col.data.filter(byteTest).length > 0) {
                    bounds.right = Math.min(canvasWidth, i - 1);
                }
            }
        }

        for (i = 0; i < canvasHeight * .5; i++) {
            if (bounds.top && bounds.bottom) {
                break;
            }

            //from top
            if (!bounds.top) {
                let row = context.getImageData(0, i, canvasWidth, 1);
                if (row.data.filter(byteTest).length > 0) {
                    //if (row.data.filter(v => v > 0).length > 0) {
                    bounds.top = Math.max(0, i - 1);
                }
            }

            //from bottom
            if (!bounds.bottom) {
                let row = context.getImageData(0, canvasHeight - i, canvasWidth, 1);
                if (row.data.filter(byteTest).length > 0) {
                    bounds.bottom = Math.min(canvasHeight, i - 1);
                }
            }
        }


        let actualHeight = canvasHeight - bounds.top - bounds.bottom,
            actualWidth = canvasWidth - bounds.right - bounds.left,
            width = targetWidth ? targetWidth : actualWidth,
            height = actualHeight,
            scaleFactor = ((width * height) / (actualWidth * actualHeight));

        if (targetWidth) {
            width = targetWidth;
            height = actualHeight * scaleFactor;
        }

        return {
            bounds,
            scaleFactor,
            dims: {
                width,
                height
            },
            actualDims: {
                width: actualWidth,
                height: actualHeight
            }
        }
    }

    measure(input) {

        const cacheKey = this.normalize(input);

        if (cacheKey in this.measureCache) {
            return this.measureCache[cacheKey];
        }

        const fontSize = parseInt(input.fontSize || 100, 10),
            dim = fontSize + fontSize * .5;



        this.measureCanvas.width = dim;
        this.measureCanvas.height = dim;

        this.measureContext.clearRect(0, 0, dim, dim);

        this.measureContext.font = fontSize + 'px ' + input.font;
        this.measureContext.textBaseline = 'middle';
        this.measureContext.textAlign = 'center';
        this.measureContext.fillText(input.emoji, dim * .5, dim * .5);

        let measurement = this.measureCanvasContextContent(this.measureContext, input.targetWidth, input.alphaThreshold),
            targetFontSize = measurement.scaleFactor * fontSize;

        if (input.fontSize) {
            targetFontSize = input.fontSize;
        }

        this.measureCache[cacheKey] = {
            width: measurement.dims.width,
            height: measurement.dims.height,
            targetFontSize,
            yOffset: ((dim * .5 - measurement.actualDims.height * .5) - measurement.bounds.top) / measurement.actualDims.height,
            xOffset: ((dim * .5 - measurement.actualDims.width * .5) - measurement.bounds.left) / measurement.actualDims.width
        };

        return this.measureCache[cacheKey];
    }

    render(input) {
        input = this.normalizeInput(input);

        const cacheKey = this.normalize(input);

        if (cacheKey in this.canvasCache) {
            return this.canvasCache[cacheKey];
        }

        let canvas = document.createElement('canvas');

        const context = canvas.getContext('2d'),
            measurement = this.measure(input);

        canvas.setAttribute('width', measurement.width);
        canvas.setAttribute('height', measurement.height);
        context.clearRect(0, 0, measurement.width, measurement.height);

        context.font = `${Math.round(measurement.targetFontSize)}px ${input.font}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const coordinates = {
            x: (measurement.width * .5) + (measurement.width * measurement.xOffset),
            y: (measurement.height * .5) + (measurement.height * measurement.yOffset)
        };

        if (input.color) {
            context.fillStyle = input.color;
        }

        context.fillText(input.emoji, coordinates.x, coordinates.y);

        if (this.constructor.name === 'BaseRenderer') {
            canvas = this.fillBackground(canvas, input.bgcolor);
        }

        this.canvasCache[cacheKey] = canvas;

        return this.canvasCache[cacheKey];
    }

    fillBackground(canvas, bgcolor) {
        if (!bgcolor || bgcolor === 'transparent' || bgcolor === '') {
            return canvas;
        }

        const bgCanvas = document.createElement('canvas'),
            bgContext = bgCanvas.getContext('2d'),
            w = canvas.getAttribute('width'),
            h = canvas.getAttribute('height');

        bgCanvas.setAttribute('width', w);
        bgCanvas.setAttribute('height', h);

        bgContext.beginPath();
        bgContext.fillStyle = bgcolor;
        bgContext.fillRect(0, 0, w, h);
        bgContext.fill();
        bgContext.closePath();

        bgContext.drawImage(canvas, 0, 0);

        return bgCanvas;
    }

    normalize(input) {
        input = this.normalizeInput(input);

        if (input.isError) {
            return 'PARSE_ERROR';
        }

        let identifier = input.emoji + '_',
            orderedMap = [];

        for (const key in input) {
            if (key === 'emoji') {
                continue;
            }
            orderedMap.push([key, input[key]]);
        }

        orderedMap.sort((a, b) => a[0] > b[0] ? 1 : -1);


        for (const [key, value] of orderedMap) {
            let str = /*key + */ String(value);
            [
                ['true', 't'],
                ['false', 'f'],
                ['null', 'n'],
                ['sans-serif', 'ss'],
                ['inside', 'is'],
                ['outside', 'os']
            ].forEach(pair => str = str.replace(pair[0], pair[1]));

            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                if ((char >= 48 && char <= 57) || (char >= 65 && char <= 90) || (char >= 61 && char <= 122)) {
                    identifier += str[i];
                } else {
                    identifier += str.charCodeAt(i).toString(16);
                }
            }
        }

        return identifier;
    }

    normalizeInput(input) {
        let output;
        if (typeof input === 'object') {
            output = input;
        } else if (input[0] === '{') {
            try {
                output = JSON.parse(input);
            } catch (e) {
                output = {
                    emoji: '�️',
                    isBasicEmoji: true,
                    isError: true
                };
                console.error('JSON PARSE failed on data-emoji=\'' + input + '\'');
            }
        } else {
            output = {
                isBasicEmoji: true,
                emoji: input
            };
        }

        output.targetWidth = output.targetWidth || this.options.targetWidth;
        for (const key in this.options) {
            if (!(key in output)) {
                output[key] = this.options[key];
            }
        }

        //todo key, should be put on here, avoid multiple calls
        //to the normalize method later on

        return output;
    }

}

class TransformedRenderer extends BaseRenderer {
    constructor(options = {}) {
        super({
            ...{
                scale: 1,
                rotate: null,
                crop: true
            }, ...options
        });
    }

    render(input) {
        input = this.normalizeInput(input);
        if (input.isError) {
            return super.render(input);
        }

        const cacheKey = this.normalize(input);
        if (cacheKey in this.canvasCache) {
            return this.canvasCache[cacheKey];
        }

        const sourceCanvas = super.render(input),
            scale = input.scale || 1,
            originalWidth = parseInt(sourceCanvas.getAttribute('width'), 10),
            originalHeight = parseInt(sourceCanvas.getAttribute('height'), 10),
            scaledWidth = originalWidth * scale,
            scaledHeight = originalHeight * scale;

        let destinationCanvas = document.createElement('canvas'),
            destinationContext = destinationCanvas.getContext('2d');


        destinationCanvas.setAttribute('width', scaledWidth);
        destinationCanvas.setAttribute('height', scaledHeight);


        if ('rotate' in input) {
            const radians = typeof input.rotate === 'string' ? parseFloat(input.rotate) * Math.PI / 180 : input.rotate,
                originalCoords = {
                    tl: {x: 0, y: 0},
                    tr: {x: scaledWidth, y: 0},
                    br: {x: scaledWidth, y: scaledHeight},
                    bl: {x: 0, y: scaledHeight}
                },
                rotatedCoords = {};

            for (const key in originalCoords) {
                const cx = scaledWidth * 0.5,
                    cy = scaledHeight * 0.5,
                    x = originalCoords[key].x,
                    y = originalCoords[key].y;
                rotatedCoords[key] = {
                    x: cx + (x - cx) * Math.cos(-radians) + (y - cy) * Math.sin(-radians),
                    y: cy - (x - cx) * Math.sin(-radians) + (y - cy) * Math.cos(-radians)
                };
            }

            const minX = Math.min(...[rotatedCoords.tl.x, rotatedCoords.tr.x, rotatedCoords.bl.x, rotatedCoords.br.x]),
                maxX = Math.max(...[rotatedCoords.tl.x, rotatedCoords.tr.x, rotatedCoords.bl.x, rotatedCoords.br.x]),
                minY = Math.min(...[rotatedCoords.tl.y, rotatedCoords.tr.y, rotatedCoords.bl.y, rotatedCoords.br.y]),
                maxY = Math.max(...[rotatedCoords.tl.y, rotatedCoords.tr.y, rotatedCoords.bl.y, rotatedCoords.br.y]),
                newWidth = scaledWidth + (maxX - scaledWidth) - minX,
                newHeight = scaledHeight + (maxY - scaledHeight) - minY;

            destinationCanvas.setAttribute('width', newWidth);
            destinationCanvas.setAttribute('height', newHeight);


            destinationContext.save();
            destinationContext.translate(newWidth * .5, newHeight * .5);
            destinationContext.rotate(radians);
            destinationContext.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight,
                scaledWidth * -0.5,
                scaledHeight * -0.5,
                scaledWidth, scaledHeight);
            destinationContext.restore();
        } else {
            destinationContext.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, scaledWidth, scaledHeight);
        }

        if (true === input.crop) {
            destinationCanvas = this.cropCanvas(destinationCanvas, input.targetWidth, input.alphaThreshold);
        }

        if (this.constructor.name === 'TransformedRenderer') {
            destinationCanvas = this.fillBackground(destinationCanvas, input.bgcolor);
        }

        this.canvasCache[cacheKey] = destinationCanvas;
        return this.canvasCache[cacheKey];
    }

    cropCanvas(sourceCanvas, targetWidth, alphaThreshold) {

        const sourceContext = sourceCanvas.getContext('2d'),
            measurement = this.measureCanvasContextContent(sourceContext, targetWidth, alphaThreshold),
            croppedCanvas = document.createElement('canvas'),
            croppedContext = croppedCanvas.getContext('2d');

        croppedCanvas.setAttribute('width', measurement.actualDims.width);
        croppedCanvas.setAttribute('height', measurement.actualDims.height);

        croppedContext.drawImage(
            sourceCanvas,
            measurement.bounds.left,
            measurement.bounds.top,
            measurement.actualDims.width,
            measurement.actualDims.height,
            0,
            0,
            measurement.actualDims.width,
            measurement.actualDims.height
        );

        return croppedCanvas;
    }


}

export { TransformedRenderer };
