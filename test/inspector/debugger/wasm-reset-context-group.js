// Copyright 2018 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

InspectorTest.log('Checks resetting context group with wasm.');

utils.load('test/mjsunit/wasm/wasm-module-builder.js');

var builder = new WasmModuleBuilder();

// wasm_B calls wasm_A <param0> times.
builder.addFunction('wasm_func', kSig_i_i)
    .addBody([
      // clang-format off
        kExprGetLocal, 0,
        kExprI32Const, 1,
        kExprI32Sub,
      // clang-format on
    ])
    .exportAs('main');


var module_bytes = builder.toArray();

function instantiate(bytes) {
  var buffer = new ArrayBuffer(bytes.length);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < bytes.length; ++i) {
    view[i] = bytes[i] | 0;
  }

  var module = new WebAssembly.Module(buffer);
  // Set global variable.
  instance = new WebAssembly.Instance(module);
}

var contextGroup1 = new InspectorTest.ContextGroup();
var session1 = contextGroup1.connect();
session1.setupScriptMap();

let contextGroup2 = new InspectorTest.ContextGroup();
let session2 = contextGroup2.connect();
session2.setupScriptMap();

(async function test() {
  await session1.Protocol.Debugger.enable();
  await session2.Protocol.Debugger.enable();

  session1.Protocol.Runtime.evaluate({
    expression: `var instance;(${instantiate.toString()})(${JSON.stringify(module_bytes)})`});

  session2.Protocol.Runtime.evaluate({
    expression: `var instance;(${instantiate.toString()})(${JSON.stringify(module_bytes)})`});

  contextGroup2.reset();

  await session1.Protocol.Debugger.onceScriptParsed(2);
  InspectorTest.logMessage(await session1.Protocol.Runtime.evaluate({expression: 'instance.exports.main(4)'}));
  InspectorTest.logMessage(await session2.Protocol.Runtime.evaluate({expression: 'instance.exports.main(5)'}));

  InspectorTest.completeTest();
})();
