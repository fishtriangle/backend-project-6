// @ts-check

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const mode = process.env.NODE_ENV || 'development';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode,
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist', 'public'),
  },
  devServer: {
    host: '0.0.0.0',
    publicPath: '/assets/',
    port: 8080,
    compress: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [new MiniCssExtractPlugin()],
};
