module.exports = {
    mode: 'development',//production,development
    watch: true,
    target: 'web',
    entry: {
        RTSPtoWEBPlayer:"./src/RTSPtoWEBPlayer.js"
    },
    output: {
        path:__dirname+'/dist',
        filename: "[name].js",
        library: '[name]',
        libraryExport: 'default',
        globalObject: 'this'
    },
    module: {
        rules:[{
            test: /\.js$/,
            loader:'babel-loader',
            options: {
                presets: [
                    ['@babel/preset-env', { targets: {
                            "safari":"11"
                        }
                    }]
                ],
                plugins: ['@babel/plugin-proposal-class-properties']
            }
        },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }]
    },
};