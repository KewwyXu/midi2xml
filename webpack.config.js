"use strict";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: "./index.ts",
  output: {
    filename: "midi2xml.js",
    path: path.resolve(__dirname, "build"),
    library: "MIDI2XML",
    libraryTarget: "umd",
    clean: true,
  },
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".html", ".css"],
    fallback: {
      path: "path-browserify",
      fs: 'browserify-fs',
      stream: "stream-browserify",
      buffer: "buffer",
      util: "util",
    },
  },
};
