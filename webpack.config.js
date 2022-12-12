const path = require('path');

module.exports = {
    mode: 'production',//production,development
    watch: false,
    target: 'web',
    entry: {
        RTSPtoWEBPlayer:"./src/rtsp-to-web-player.js"
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
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
    },
};
