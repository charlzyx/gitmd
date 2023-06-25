#!/usr/bin/env node

const gitmd = require("./index.js");
const chokidar = require("chokidar");

const docdir = process.argv.slice(2)[0] || process.cwd();

gitmd(docdir).server()

chokidar.watch(docdir, { interval: 2000 }).on("all", () => {
  gitmd(docdir).worker();
});
