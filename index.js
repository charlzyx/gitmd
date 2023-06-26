#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dirTree = require("directory-tree");
const { spawn, exec, execSync } = require("child_process");
const { rimrafSync } = require("rimraf");
const dayjs = require("dayjs");
const git = require("git-rev-sync");

const noop = () => {};
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

  const autogit = (onErr = noop) => {
    if (!gitEnv.gitDir || !gitEnv.gitBin) {
      return;
    }
    const pre = process.cwd();
    try {
      process.chdir(docRoot);
      const changed = git.hasUnstagedChanges();
      process.chdir(pre);
      if (!changed) return;
    } catch (error) {
      process.chdir(pre);
      onErr({ type: "gitsyncerr", message: error });
      return;
    }
    const now = dayjs().format("YYYY/MM/DD HH:mm:ss");
    // 2min
    if (+Date.now() - lastSync > 5 * 60 * 1000) {
      return;
    }
    lastSync = +Date.now();

    exec(
      `git add . && git commit -m 'autosave at ${now}' && git push `,
      {
        cwd: docRoot,
      },
      (err) => {
        if (err) {
          console.log("giterr ", err);
          onErr({ type: "git", message: err });
        } else {
          console.log("自动保存于:" + now);
        }
      }
    );
  };

  const workhard = (onErr = noop) => {
    rimrafSync(WORKING_DIR, {
      filter: (x) => !/\.vitepress/.test(x),
    });
    try {
      fs.cpSync(docRoot, WORKING_DIR, {
        recursive: true,
        filter: (x) => !ignored.test(x),
      });
    } catch (error) {
      onErr({ type: "fscopy", message: error.message });
      console.error("copy error", error);
    }

    makeConfig();
    autogit(onErr);
  };

  return {
    server(onErr = noop) {
      return require("portfinder")
        .getPortPromise()
        .then((port) => {
          const cli = `npx vitepress dev ${WORKING_DIR} --port=${port}`;
          spawn(
            cli,
            {
              shell: true,
              stdio: "inherit",
            },
            (err, std) => {
              if (err) {
                onErr({ type: "servererr", message: err });
              }
              console.log(err, std);
            }
          );
          return port;
        });
    },
    worker(onErr = noop) {
      workhard(onErr);
    },
  };
};

module.exports = gitmd;
