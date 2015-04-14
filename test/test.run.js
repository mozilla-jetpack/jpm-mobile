/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var fs = require("fs");
var child_process = require("child_process");
var Promise = require("bluebird");
var extend = require("lodash").extend;

var jpm = require.resolve("../bin/jpm-mobile");
var simpleExample = path.join(__dirname, "..", "examples", "simple");

var binary = process.env.JPM_FIREFOX_BINARY || "fennec";  // fennec is nightly

describe("jpm run", function () {
  it("simple example", function (done) {
    process.chdir(simpleExample);

    var options = {
      cwd: simpleExample
    };
    run("run", options, process).then(done);
  });
});


function spawn (cmd, options) {
  options = options || {};
  var env = extend({}, options.env, process.env);

  return child_process.spawn("node", [
    jpm, cmd, "-v",
    "-b", options.binary || env.JPM_FIREFOX_BINARY || "fennec",
    // TODO: this default is hardcoded for travis need to fix!
    "--adb", options.adb || env.JPM_ADB_PATH || "/usr/local/android-sdk/platform-tools/adb"
  ], {
    cwd: options.cwd,
    env: env
  });
}

function run (cmd, options) {
  return new Promise(function(resolve) {
    var output = [];
    var proc = spawn(cmd, options);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.stdout.on("data", function (data) {
      output.push(data);
      return null;
    });
    proc.on("close", function(code) {
      var out = output.join("");
      var noTests = /No tests were run/.test(out);
      var hasFailure = /There were test failures\.\.\./.test(out);
      expect(code).to.equal(hasFailure ? 1 : 0);
      expect(hasFailure).to.equal(false);
      expect(noTests).to.equal(false);
      resolve();
    });
  });
}
