
import * as vscode from 'vscode';
import {BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';

let extensionUri : any = undefined;
let resolver: any = undefined;

// Wait for the message from extension.ts with extensionUri.

const messagePromise = new Promise((resolve) => resolver = resolve);

self.onmessage = async ({ data: payload }: { data: any }) => {
  extensionUri = payload;
  onmessage = null;
  resolver?.();
}

await messagePromise;


const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

import * as lang_server from './language_server_loader.js'

lang_server.default(messageReader, messageWriter, extensionUri.toString());