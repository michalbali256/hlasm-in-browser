import lang_server from "./language_server.js";
import lang_server_wasm from "./language_server.wasm";
import txt from "./language_server.worker.js";

var loader = function (reader, writer, extensionUri) {
  //we need to start listening to messages right away, so we dont miss any
  var messageQueue = [];

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
        return extensionUri + '/' + lang_server_wasm;
      } else if (path.endsWith("language_server.worker.js")) {
        var blobURL = URL.createObjectURL(
          new Blob([txt], { type: "application/javascript" })
        );
        return blobURL;
        //new URL("language_server.worker.js", import.meta.url);
      }
      return path;
    },
    monitorRunDependencies(numberOFDeps) {
      console.log("Number of Deps:", numberOFDeps);
    },
    mainScriptUrlOrBlob: extensionUri + "/dist/web/language_server.js",
    lspReader: reader,
    lspWriter: writer,
    lspQueue: messageQueue
  });
};
export default loader;

//module();
