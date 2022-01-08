import {BaseRenderer} from "./BaseRenderer";

export class TransformedRenderer extends BaseRenderer {
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
                }
            }

            const minX = Math.min(...[rotatedCoords.tl.x, rotatedCoords.tr.x, rotatedCoords.bl.x, rotatedCoords.br.x]),
                maxX = Math.max(...[rotatedCoords.tl.x, rotatedCoords.tr.x, rotatedCoords.bl.x, rotatedCoords.br.x]),
                minY = Math.min(...[rotatedCoords.tl.y, rotatedCoords.tr.y, rotatedCoords.bl.y, rotatedCoords.br.y]),
                maxY = Math.max(...[rotatedCoords.tl.y, rotatedCoords.tr.y, rotatedCoords.bl.y, rotatedCoords.br.y]),
                newWidth = scaledWidth + (maxX - scaledWidth) - minX,
                newHeight = scaledHeight + (maxY - scaledHeight) - minY;

            destinationCanvas.setAttribute('width', newWidth)
            destinationCanvas.setAttribute('height', newHeight)


            destinationContext.save();
            destinationContext.translate(newWidth * .5, newHeight * .5)
            destinationContext.rotate(radians);
            destinationContext.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight,
                scaledWidth * -0.5,
                scaledHeight * -0.5,
                scaledWidth, scaledHeight)
            destinationContext.restore()
        } else {
            destinationContext.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, scaledWidth, scaledHeight)
        }

        if (true === input.crop) {
            destinationCanvas = this.cropCanvas(destinationCanvas, input.targetWidth, input.alphaThreshold)
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