// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import * as vscodelc from 'vscode-languageclient/browser';

import lang_server from '../../server/language_server.js';
import lang_server_module from '../../server/language_server.wasm';

// Since webpack will change the name and potentially the path of the 
// `.wasm` file, we have to provide a `locateFile()` hook to redirect
// to the appropriate URL.
// More details: https://kripken.github.io/emscripten-site/docs/api_reference/module.html
const module = lang_server({
  locateFile(path:any) {
    if(path.endsWith('.wasm')) {
      return lang_server_module;
    }
    return path;
  }
});

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hello" is now active in the web extension host!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let command = vscode.commands.registerCommand('hello.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from hello in a web extension host!');
	});
	context.subscriptions.push(command);
	
	const clientOptions: vscodelc.LanguageClientOptions = {
        documentSelector: [{ language: 'hlasm' }],
    };
	
	vscodelc.LanguageClient
	
    const client = createWorkerLanguageClient(context, clientOptions);
	
	const disposable = client.start();
	
	context.subscriptions.push(disposable);

	client.onReady().then(() => {
		console.log('HLASMPLUGIN server is ready');
	});
}


function createWorkerLanguageClient(context: vscode.ExtensionContext, clientOptions: LanguageClientOptions) {
	
	//const lang_server_path = require.resolve('../../server/language_server.js')
	//console.log(lang_server_path);
	// Create a worker. The worker main file implements the language server.
	//const serverMain = vscode.Uri.joinPath(context.extensionUri, lang_server_path);
	//console.log(serverMain);
	
	
	const worker = new Worker(new URL('../../server/language_server.js', import.meta.url)); //@ts-ignore
	
	// create the language server client to communicate with the server running in the worker
	return new vscodelc.LanguageClient('lsp-web-extension-sample', 'LSP Web Extension Sample', clientOptions, worker);
}

// this method is called when your extension is deactivated
export function deactivate() {}
