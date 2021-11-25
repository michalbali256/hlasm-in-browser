/*
 * Copyright (c) 2021 Broadcom.
 * The term "Broadcom" refers to Broadcom Inc. and/or its subsidiaries.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Broadcom, Inc. - initial API and implementation
 */

import * as vscode from 'vscode';
import { BaseLanguageClient } from 'vscode-languageclient';

export class HLASMDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    


    constructor(private client: BaseLanguageClient) {}
    
    createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new HLASMDebugAdapter(this.client));
    }
}


class HLASMDebugAdapter implements vscode.DebugAdapter {
    private static next_session_id: number = 0;
    private static readonly registration_message_id: string = 'hlasm/dap_tunnel';

    private message_event = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
    private readonly session_id: number = HLASMDebugAdapter.next_session_id++;
    private readonly message_id: string = HLASMDebugAdapter.registration_message_id + '/' + this.session_id;

    constructor(private client: BaseLanguageClient) {
        this.client.sendNotification(HLASMDebugAdapter.registration_message_id, this.session_id);
        this.client.onReady().then(() => {
            client.onNotification(this.message_id, (msg: any) => {
                this.message_event.fire(msg);
            });
        });
    }
    onDidSendMessage(listener: (e: vscode.DebugProtocolMessage) => any, thisArgs?: any, disposables?: vscode.Disposable[]): vscode.Disposable {
        return this.message_event.event(listener, thisArgs, disposables);
    }

    handleMessage(message: vscode.DebugProtocolMessage): void {
        this.client.sendNotification(this.message_id, message);
    }

    dispose() {
        this.client.sendNotification(this.message_id);
        this.message_event.dispose();
    }

}
