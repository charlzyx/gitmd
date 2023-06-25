#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dirTree = require("directory-tree");
const chokidar = require("chokidar");
const { spawn, exec, execSync } = require("child_process");
const { rimrafSync } = require("rimraf");
const dayjs = require("dayjs");
var git = require("git-rev-sync");

const WORKING_DIR = path.join(__dirname, ".tmp");

const gitmd = (docdir) => {
  const docRoot = path.isAbsolute(docdir)
    ? docdir
    : path.resolve(process.cwd(), docdir);

  const helper = {
    getTitle: (file) => {
      if (!fs.existsSync(file)) return "";
      const content = fs.readFileSync(file).toString();
      const lines = content.split("\n");
      let title = "";
      for (let i = 0; i < lines.length; i++) {
        if (title) {
          break;
        } else {
          const line = lines[i];
          const isTitle = /^#\s/.test(line);
          if (isTitle) {
            title = line.replace("#", "");
          }
        }
      }
      if (!title) {
        const segs = file.splice(path.sep);
        const filename = segs[segs.length - 1].split(".");
        title = filename[0];
      }
      return title;
    },

    treeToSidebar: (tree, prefix) => {
      if (!tree) return tree;
      return tree
        .filter((item) => !/index\.md$/.test(item.path))
        .map((item) => {
          const isDir = item.children;
          return {
            text: isDir
              ? helper.getTitle(path.join(item.path, "index.md")) || item.name
              : helper.getTitle(item.path),
            link: isDir
              ? item.path.replace(prefix, "") + "/index"
              : item.path.replace(/\.md$/, "").replace(prefix, ""),
            items: isDir ? helper.treeToSidebar(item.children, prefix) : null,
          };
        });
    },
    hasGitBin: () => {
      try {
        execSync("git --version");
        return true;
      } catch (error) {
        return false;
      }
    },
  };

  const ignored = /(^|[\/\\])\..|node_modules/;

  const dotvitepress = path.join(WORKING_DIR, ".vitepress");

  const makeConfig = () => {
    const configfile = path.join(docRoot, "gitmd.js");

    delete require.cache[configfile];

    const config = fs.existsSync(configfile)
      ? require(configfile)
      : {
          title: "GitMD Memory",
          description: "Git MarkDown Notes",
          themeConfig: {
            // https://vitepress.dev/reference/default-theme-config
            nav: [{ text: "Home", link: "/" }],
            sidebar: [],
          },
        };

    const getSidebar = () => {
      const tree = dirTree(docRoot, { extensions: /\.md/, exclude: ignored });
      const sidebar = helper.treeToSidebar(tree.children, docRoot);
      return sidebar || [];
    };

    config.themeConfig = config.themeConfig || {};
    const sidebar = config.themeConfig.sidebar || [];
    config.themeConfig.sidebar = [...sidebar, ...getSidebar()].filter(Boolean);

    if (!fs.existsSync(dotvitepress)) {
      fs.mkdirSync(dotvitepress, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dotvitepress, "config.js"),
      `module.exports = ${JSON.stringify(config, null, 2)}`,
      "utf-8"
    );
  };

  const gitEnv = {
    gitDir: fs.existsSync(path.join(docRoot, ".git")),
    gitBin: helper.hasGitBin(),
    lastSync: 0,
  };

  const autogit = () => {
    if (!gitEnv.gitDir || !gitEnv.gitBin) {
      return;
    }
    const changed = git.hasUnstagedChanges();
    if (changed && +Date.now() - gitEnv.lastSync > 5 * 60 * 1000) {
      gitEnv.lastSync = +Date.now();
      const now = dayjs().format("YYYY/MM/DD HH:mm:ss");
      exec(
        `git add . && git commit -m 'autosave at ${now}' && git push `,
        {
          cwd: docRoot,
        },
        (err) => {
          if (err) {
            console.error("ERROR AT: git autosave " + err);
          } else {
            console.log("自动保存于:" + now);
          }
        }
      );
    }
  };

  const workhard = () => {
    rimrafSync(WORKING_DIR, {
      filter: (x) => !/\.vitepress/.test(x),
    });
    console.log("cp from, to ", docRoot, WORKING_DIR);
    fs.cpSync(docRoot, WORKING_DIR, {
      recursive: true,
      filter: (x) => ignored.test(x),
    });
    makeConfig();
    autogit();
  };

  return function run() {
    chokidar.watch(docRoot, { interval: 2000 }).on("all", () => {
      workhard();
    });

    spawn(
      "npx vitepress dev " + WORKING_DIR,
      {
        shell: true,
        stdio: "inherit",
      },
      (err, std) => {
        console.log(std);
      }
    );

    workhard();
  };
};

module.exports = gitmd;
