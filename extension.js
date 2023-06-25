const vscode = require("vscode");
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const root = vscode.workspace.workspaceFolders[0].uri.toString();
  const cwd = root.replace("file://", "");
  console.log("states", cwd);
  const gitmd = require("./index")(cwd);
  gitmd.server().then((port) => {
    const link = "http://localhost:" + port;
    gitmd.worker();
    setTimeout(() => {
      vscode.commands.executeCommand("vscode.open", link);
    }, 1000);
  });

  const dispose = vscode.workspace.onDidSaveTextDocument(() => {
    gitmd.worker();
  });

  context.subscriptions.push(dispose);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
