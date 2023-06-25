#!/usr/bin/env node

const gitmd = require("./index.js");

const docdir = process.argv.slice(2)[0] || process.cwd();

gitmd(docdir)
