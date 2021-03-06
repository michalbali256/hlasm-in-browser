# HLASM Language Server running in browser environment

This extension is only for the purposes of development while I am trying to port HLASM Language Support to work with vscode.dev.

A published version can be found here: https://marketplace.visualstudio.com/items?itemName=mbali.hlasm-browser-dev. It should work in vscode.dev, if you start your browser with security disabled (see below).

# How to build WASM language server

First we need to build the language server into WASM using Emscripten. The WASM build like this is already commited in this repository in `src/server`.

I build the language server inside emscripten/emsdk:2.0.34 container. Newer versions might work as well.

The version of language server that works in browser is here: https://github.com/eclipse/che-che4z-lsp-for-hlasm/tree/mb/support-browser. Checkout it.

Start the container:
```
docker pull emscripten/emsdk:2.0.34
docker run -it --mount type=bind,source=C:\path\to\project\che-che4z-lsp-for-hlasm,target=/che-che4z-lsp-for-hlasm emscripten/emsdk:2.0.34
```

Inside the container, build the project using following commands:
```
sudo apt-get update && sudo apt-get install -y ninja-build maven
mkdir build && cd build
emcmake cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DDISCOVER_TESTS=Off -DWITH_LIBCXX=Off -DWITH_STATIC_CRT=Off -DCMAKE_EXE_LINKER_FLAGS="-s ENVIRONMENT=worker -s EXPORT_ES6=1 -s PTHREAD_POOL_SIZE=8 -s TOTAL_MEMORY=268435456 -s PROXY_TO_PTHREAD=1 -s EXIT_RUNTIME=1 --bind" -DCMAKE_CXX_FLAGS="-pthread -fexceptions" -DCMAKE_CROSSCOMPILING_EMULATOR="node;--experimental-wasm-threads;--experimental-wasm-bulk-memory" -Dgtest_disable_pthreads=On ../
cmake --build .
```

When it finishes, you should have three files in `che-che4z-lsp-for-hlasm/build/bin`:
```
language_server.js
language_server.wasm
language_server.worker.js
```

Notable differences from WASM build already running in CI.yml:
- Newer version of emscripten implemented warning "linker only arguments given to compiler", so some of the original CMAKE_CXX_FLAGS were moved to CMAKE_EXE_LINKER_FLAGS. It is necessary, since gtest builds with -Werror
- `ENVIRONMENT=worker` sets where the result will be run, other values are `node` and `web`
- `EXPORT_ES6` causes the `language_server.js` to be exported as ES6 module, making it easier to import and work with (code in `language_server_loader.js` depends on this)
- `DCMAKE_CROSSCOMPILING_EMULATOR="node;..."` is left unchanged, so far it has not caused any troubles.

# How to build and run the extension

First, copy the 3 files from previous section to `/src/server` of the hlasm-in-browser repository.

Then:
1. `npm install` to install dependencies.
2. `npm run compile-web` to compile the project using webpack and typescript.
 
3. `npm run run-in-browser` starts a web server on localhost:3000 and starts chromium with the address. Ignore the chromium window.
4. Find your chrome executable and run the following from its folder
   ```
   chrome --enable-features=SharedArrayBuffer --disable-web-security --user-data-dir="C:\path\to\empty\folder"
   ```
   It starts chrome with web security disabled, allowing the language server to use SharedArrayBuffer. See for example this: https://developer.chrome.com/blog/enabling-shared-array-buffer/. Cross-origin isolation is required in order to use SharedArrayBuffer, but right now, neither vscode.dev nor the testing web server serves the page with the correct headers.
   
   The `--user-data-dir` option causes the browser to be run alongside your other chrome sessions as if it was a fresh install of chrome.
   
   See also this issue to track progress of vscode: https://github.com/microsoft/vscode/issues/137884.
5. Open a new file and change the language to HLASM, the extension should be activated now.

## Running vscode from sources - workaround
At the time of writing this guide, the above steps do not work, since vscode-test-web 0.0.15 is not compatible with vscode 1.63. I have found a workaround with running vscode from sources. Download, compile and run vscode v1.62.3 using following commands:
```
git clone https://github.com/microsoft/vscode.git
cd vscode && git checkout 1.62.3 && yarn && yarn compile && yarn web
```
In the end, browser opens with localhost:8080. Ignore it.

Then, we must configure vscode-test-web to run from sources. Open `package.json` in hlasm-in-browser project and change the `run-in-browser` script to the following:
```
vscode-test-web --version=sources --browserType=chromium --extensionDevelopmentPath=. .
```
Possible values of `--version` are `sources`, `stable` and `insider`. The `sources` options causes the vscode-test-web to use vscode from localhost:8080 instead of the internet.
Then run the above steps (at least from step 3), it should be working now.


# Extension anatomy

 Important files:
- `src/web/extension.ts` - entrypoint of the extension. Activate is as in normal extensions, then it creates web Worker, where the language server runs. Sends `extensionUri` to the worker, so the worker knows where to find additional scripts
- `src/server/main.ts` - entrypoint to the language server. Imports `BrowserMessageReader` and `BrowserMessageWriter`, which are written in typescript, that is the main purpose of this typescript file. Accepts the message with `extensionUri`, then calls `language_server_loader.js`
- `src/server/language_server_loader.js` - imports the `language_server.js` module generated by emscripten.
- `webpack.config.js` - creates two main packs - `server.js` and `extension.js`. Also handles copying of `language_server.wasm` and `language_server.js` to the binary folder.



# How to debug WASM in browser

Follow this blog: https://developer.chrome.com/blog/wasm-debugging-2020/. It requires to download a chrome extensions from here https://chrome.google.com/webstore/detail/cc%20%20-devtools-support-dwa/pdcpmagijalfljmkmjngeonclgbbannb. And then switch on one experimental option in chrome developer tools- WebAssembly debugging.

Apart from that, we need to get a webassembly module built in debug mode with the correct paths to sources. The latter is a bit of a problem, since we are building the wasm in docker container. Anyway, I hacked it by mapping the che-che4z-lsp-for-hlasm project into the same path inside the container.
```
docker run -it --mount type=bind,source=C:\path\to\project\che-che4z-lsp-for-hlasm,target=/C:/path/to/project/che-che4z-lsp-for-hlasm emscripten/emsdk:2.0.34
```
Then, use the following cmake configure & build commands:
```
emcmake cmake -G Ninja -DCMAKE_BUILD_TYPE=Debug -DDISCOVER_TESTS=Off -DWITH_LIBCXX=Off -DWITH_STATIC_CRT=Off -DCMAKE_EXE_LINKER_FLAGS="-s ENVIRONMENT=worker -s EXPORT_ES6=1 -s PTHREAD_POOL_SIZE=8 -s TOTAL_MEMORY=268435456 -s PROXY_TO_PTHREAD=1 -s EXIT_RUNTIME=1 --bind" -DCMAKE_CXX_FLAGS="-g -pthread -fexceptions" -DCMAKE_CROSSCOMPILING_EMULATOR="node;--experimental-wasm-threads;--experimental-wasm-bulk-memory" -Dgtest_disable_pthreads=On ../
cmake --build .
```
Differences - `Debug` build type and `-g` for CMAKE_CXX_FLAGS

This goes well, except one command - on windows, where you have to map to path with `:`. When generating c++ code from the antlr grammar, we run a java command, something like `java -jar /C:/path/to/java_exe.jar <args>`. This command will fail, because java uses `:` as separator of different jars. We need to rewrite the command, so it does not need the absolute prefix `/C:/`. Then remove the command from cmake - it is the `add_custom_command` command in file `parser_library/src/parsing/grammar/CMakeLists.txt`. After rerunning the `cmake --build .`, the build should finish as expected.

There should be some tools which change dwarf paths, but I have not tried any. Or use linux when debugging wasm - then the hack is unnecessary.
