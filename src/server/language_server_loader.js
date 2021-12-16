import lang_server from "./language_server.js";
import lang_server_wasm from "./language_server.wasm";
import txt from "./language_server.worker.js";

var loader = function (reader, writer, extensionUri) {
  var messageQueue = [];

  //We need to start listening here, so we don't miss the initialize message - it is too late once the wasm module is loaded.
  // TODO: stop pushing to the messageQueue, once the wasm module is loaded. Right now, the messageQueue just overflows.
  reader.listen((x) => {
    console.log("queuing");
    console.log(x);
    messageQueue.push(x);
  });
  console.log("extensionUri:", extensionUri);
  console.log("LOADER RUNS");
  console.log(self.location.href);
  console.log(txt);
  const module = lang_server({
    locateFile(path) {
      console.log(path);
      if (path.endsWith(".wasm")) {
        //return "http://localhost:3000/static/devextensions/dist/web/925b03f301c1b80d946adee23fcde86f.wasm";
        console.log(lang_server_wasm);
        // The webpack emits the wasm file with some random file name (probably its some hash)
        // and then assigns the file name to to the lang_server_wasm.
        return extensionUri + '/' + lang_server_wasm;
      } else if (path.endsWith("language_server.worker.js")) {
        // For some reason, the original worker does not have rights to create new workers from http scripts, so we create a blob here.
        // The txt is created using webpack's raw-loader.
        var blobURL = URL.createObjectURL(
          new Blob([txt], { type: "application/javascript" })
        );
        return blobURL;
      }
      return path;
    },
    // mainScriptUrlOrBlob is used inside language_server.worker.js to get the main script - language_server.js
    // We copy the original language_server.js to the output for this reason, although language_server.js is already webpacked in server.js once.
    // However, it cannot be used by the worker if it is webpacked. Also, for some reason, the worker cannot be loaded from blob anymore, this has to be http URL. Blob violated security policy.
    mainScriptUrlOrBlob: extensionUri + "/dist/web/language_server.js",
    // We refer to the following variables from the emscripten_server_streams.cpp
    lspReader: reader,
    lspWriter: writer,
    lspQueue: messageQueue
  });
};
export default loader;
