// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import * as vscodelc from 'vscode-languageclient/browser';
import { HLASMDebugAdapterFactory } from './hlasmDebugAdapterFactory';
import { HLASMConfigurationProvider, getCurrentProgramName, getProgramName } from './debugProvider';

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
	
    const client = createWorkerLanguageClient(context, clientOptions);
	
	const disposable = client.start();
	
	context.subscriptions.push(disposable);
	
	//I experimented with macro tracer a bit, I think that once the debugging fix from pull request #211 is applied, it should work in browser as well.
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('hlasm', new HLASMConfigurationProvider()));
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('hlasm', new HLASMDebugAdapterFactory(client)));
	
	
	// register filename retrieve functions for debug sessions
	context.subscriptions.push(vscode.commands.registerCommand('extension.hlasm-plugin.getProgramName', () => getProgramName()));
	context.subscriptions.push(vscode.commands.registerCommand('extension.hlasm-plugin.getCurrentProgramName', () => getCurrentProgramName()));
		
	client.onReady().then(() => {
		console.log('HLASMPLUGIN server is ready');
	});
	
}


function createWorkerLanguageClient(context: vscode.ExtensionContext, clientOptions: LanguageClientOptions) {
	
	console.log(self.crossOriginIsolated);
	
	//const lang_server_path = require.resolve('../../server/language_server.js')
	//console.log(lang_server_path);
	// Create a worker. The worker main file implements the language server.
	const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/web/server.js');
	console.log(serverMain.toString());
	const worker = new Worker(serverMain.toString());
	worker.postMessage(context.extensionUri.toString())
	//const worker = new Worker('../../server/language_server_loader.js'); //@ts-ignore
	//const worker = new Worker(new URL('../../server/language_server.js', import.meta.url)); //@ts-ignore
	
	// create the language server client to communicate with the server running in the worker
	return new vscodelc.LanguageClient('lsp-web-extension-sample', 'LSP Web Extension Sample', clientOptions, worker);
}

// this method is called when your extension is deactivated
export function deactivate() {}
