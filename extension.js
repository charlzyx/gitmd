const vscode = require("vscode");
const chokidar = require('chokidar');

const ignored = /(^|[\/\\])\..|node_modules/;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const root = vscode.workspace.workspaceFolders[0].uri.toString();
  const cwd = root.replace("file://", "");
  const gitmd = require("./index")(cwd);
  const onErr = (err) => {
    const { type, message } = err;
    vscode.window.showErrorMessage("GITMD ERROR: " + type + message);
  };
  gitmd.server().then(({ port, kill }) => {
    const link = "http://localhost:" + port;
    gitmd.worker(onErr);
    setTimeout(() => {
      vscode.commands.executeCommand("vscode.open", link);
    }, 1000);
    context.subscriptions.push(kill)
  });

  const dispose = vscode.workspace.onDidSaveTextDocument(() => {
    gitmd.worker(onErr);
  });

  const watcher = chokidar.watch(cwd, { interval: 2000, ignored: ignored }).on("all", () => {
    gitmd.worker(onErr);
  });

  context.subscriptions.push(dispose);
  context.subscriptions.push(() => {
    watcher.close()
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
