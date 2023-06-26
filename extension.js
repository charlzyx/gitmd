const vscode = require("vscode");
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
  gitmd.server().then((port) => {
    const link = "http://localhost:" + port;
    gitmd.worker(onErr);
    setTimeout(() => {
      vscode.commands.executeCommand("vscode.open", link);
    }, 1000);
  });

  const dispose = vscode.workspace.onDidSaveTextDocument(() => {
    gitmd.worker(onErr);
  });

  context.subscriptions.push(dispose);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
