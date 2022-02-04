const path = require('path')
const fs = require('fs')

var nodeModules = {};
fs.readdirSync(path.resolve(__dirname, 'node_modules'))
  .filter(x => ['.bin'].indexOf(x) === -1)
  .forEach(mod => { nodeModules[mod] = `commonjs ${mod}`; });

module.exports = {
    mode: "development",
    entry: {
        app: "./sources/src/app.js"
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', 'tsx', '.js'],
        fallback: {
            fs: false
          },
          alias: {
            webworkify: 'webworkify-webpack'
        }
          
    },
    devtool: 'source-map',
    plugins: [],
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/
        }]
    },
    target: 'web',
    // node: {
    //     fs: 'empty'
    // },
    // externals: nodeModules,
}