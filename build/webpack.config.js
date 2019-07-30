var webpack = require('webpack');
var TerserPlugin = require('terser-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin')

var pkg = require('../package.json');
var year = new Date().getFullYear();
var banner = '\
\n\
 CCBAR version ' + pkg.version + '\n\
 Copyright (c) 2014-' + year + ' JacketZeng\n\
\n\n\n';

module.exports = function (env) {
  var mode = env.buildType === 'min' ? 'production' : 'none';
  var mainDir = __dirname + '/../';

  var entry = {};
  entry['ccbar' + (env.buildType === 'min' ? '.min' : '')] = mainDir + '/src/index.ts';

  return {
    mode: mode,
    entry: entry,
    output: {
      path: mainDir + '/dist',
      filename: '[name].js',
      library: 'CCBAR',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: "ts-loader",
          options: {
            compilerOptions: {
              "declaration": false,
              "outDir": mainDir + "/dist"
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.d.ts', '.js']
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            output: {
              ascii_only: true
            }
          }
        })
      ]
    },
    plugins: [
      new CircularDependencyPlugin({
        // exclude detection of files based on a RegExp
        exclude: /a\.js|node_modules/,
        // add errors to webpack instead of warnings
        failOnError: true,
        // set the current working directory for displaying module paths
        cwd: process.cwd(),
      }),
      new webpack.BannerPlugin({
        banner: banner
      })
    ]
  };
}
