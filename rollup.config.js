const buildMode = process.env.BUILD || 'dev',
    umdNamespace = process.env.UMDNS || 'EMOJI',
    builds = [
        {
            input: 'src/DecoratedRenderer.js',
            output: {
                name: umdNamespace,
                file: 'dist/umd/emoji-renderer-decorated.js',
                format: 'umd',
                extend: true
            }
        },
        {
            input: 'src/CSSHelper.js',
            output: {
                name: umdNamespace,
                file: 'dist/umd/emoji-csshelper.js',
                format: 'umd',
                extend : true
            }
        },
        {
            input: 'src/ComposedCSSHelper.js',
            output: {
                name: umdNamespace,
                file: 'dist/umd/emoji-composed-csshelper.js',
                format: 'umd',
                extend : true
            }
        }
    ];

if (buildMode === 'build') {
    [
        ['src/TransformedRenderer.js', 'dist/umd/emoji-renderer-transformed.js'],
        ['src/BaseRenderer.js', 'dist/umd/emoji-renderer-base.js'],
    ].forEach(item => {
        const build = {
            input : item[0],
            output : {
                name : umdNamespace,
                file : item[1],
                format: 'umd',
                extend : true
            }
        };

        builds.push(build);
    });

    builds.forEach(e => {
        builds.push({
            input: e.input,
            output: [
                {file: e.output.file.replace(/umd/, 'cjs'), format: 'cjs'},
                {file: e.output.file.replace(/umd/, 'esm'), format: 'es'}
            ]
        });
    });
}

export default builds;