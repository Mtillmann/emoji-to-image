import {TransformedRenderer} from "./TransformedRenderer";

export class DecoratedRenderer extends TransformedRenderer {

    constructor(options = {}) {
        super({
            ...{
                pixelate: 0,
                outline: 0,
                outlineColor: '#ff0000',
                outlineMode: 'inside'
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
            pixelate = parseInt(input.pixelate) !== 0 ? Math.round(input.pixelate) : false,
            outlineWidth = input.pixelate ? pixelate * input.outline : input.outline;

        let destinationCanvas = document.createElement('canvas'),
            destinationContext = destinationCanvas.getContext('2d');

        destinationCanvas.setAttribute('width', sourceCanvas.getAttribute('width'));
        destinationCanvas.setAttribute('height', sourceCanvas.getAttribute('height'));

        if (pixelate > 1) {
            const scaledDownCanvas = document.createElement('canvas'),
                scaledDownContext = scaledDownCanvas.getContext('2d'),
                scaleDownFactor = 1 / Math.round(pixelate),
                currentWidth = parseInt(destinationCanvas.getAttribute('width'), 10),
                currentHeight = parseInt(destinationCanvas.getAttribute('height'), 10);

            let scaledWidth = currentWidth * scaleDownFactor,
                scaledHeight = currentHeight * scaleDownFactor,
                targetWidth = currentWidth,
                targetHeight = currentHeight;

            if (input.outline > 0 && input.outlineMode === 'inside') {
                scaledWidth -= input.outline * 2;
                scaledHeight -= input.outline * 2;
                targetHeight -= outlineWidth * 2;
                targetWidth -= outlineWidth * 2;
            }

            destinationContext.imageSmoothingEnabled = false;

            scaledDownCanvas.setAttribute('width', scaledWidth);
            scaledDownCanvas.setAttribute('height', scaledHeight);
            scaledDownContext.drawImage(sourceCanvas, 0, 0, currentWidth, currentHeight, 0, 0, scaledWidth, scaledHeight);

            destinationContext.clearRect(0, 0, currentWidth, currentHeight);
            destinationContext.drawImage(scaledDownCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, targetWidth, targetHeight)
        } else {
            destinationCanvas = sourceCanvas;
        }


        if (!!input.outline) {
            //width...
            const outlineCanvas = document.createElement('canvas'),
                outlineContext = outlineCanvas.getContext('2d'),
                outlineDrawOffsets = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
                width = parseInt(destinationCanvas.getAttribute('width'), 10) + outlineWidth * 2,
                height = parseInt(destinationCanvas.getAttribute('height'), 10) + outlineWidth * 2;

            outlineCanvas.setAttribute('width', width);
            outlineCanvas.setAttribute('height', height);

            // draw images at offsets from the array scaled by s
            for (let i = 0; i < outlineDrawOffsets.length; i += 2) {
                outlineContext.drawImage(destinationCanvas, outlineWidth + outlineDrawOffsets[i] * outlineWidth, outlineWidth + outlineDrawOffsets[i + 1] * outlineWidth);
            }

            // fill with color
            outlineContext.globalCompositeOperation = "source-in";
            outlineContext.fillStyle = input.outlineColor;
            outlineContext.fillRect(0, 0, width, height);

            // draw original image in normal mode
            outlineContext.globalCompositeOperation = "source-over";
            outlineContext.drawImage(destinationCanvas, outlineWidth, outlineWidth);

            destinationCanvas = outlineCanvas
        }

        //crop again after outline / pixelate has been applied
        if (input.crop) {
            destinationCanvas = this.cropCanvas(destinationCanvas, input.targetWidth, input.alphaThreshold)
        }


        if (this.constructor.name === 'DecoratedRenderer') {
            //do this here only if the
            destinationCanvas = this.fillBackground(destinationCanvas, input.bgcolor);
        }

        this.canvasCache[cacheKey] = destinationCanvas;
        return this.canvasCache[cacheKey];
    }

}