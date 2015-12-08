/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var cp = require("child_process");
var fs = require('fs');
var path = require('path');
var Promise = require("bluebird");

var onClose = require("./process").onClose;

var _INTENT_PREFIX = 'org.mozilla.';

function rm(options) {
  var p = cp.spawn(options.adb, [
                "shell",
                "rm", "-r", options.path
            ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.rm = rm;

function mkdir(options) {
  console.log("mkdir " + options.path);
  var p = cp.spawn(options.adb, [
                "shell",
                "mkdir", options.path
            ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.mkdir = mkdir;

function ls(options) {
  console.log("ls " + options.path);
  var p = cp.spawn(options.adb, [
                "shell",
                "ls", options.path, "-al"
            ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.ls = ls;

function amForceStop(options) {
  var p = cp.spawn(options.adb, [
              "shell",
              "am force-stop",
              options.intent
          ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.amForceStop = amForceStop;

function amStart(options) {
  console.log("Starting Firefox with " + options.profile);
  var p = cp.spawn(options.adb, [
              "shell",
              "am start",
              "-a",
              "android.activity.MAIN",
              "-n",
              options.intent + "/.App",
              "--es",
              "args",
              "'-profile " + options.profile + "'"
          ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.amStart = amStart;

function getPackages() {

}
exports.getPackages = getPackages;

function startLogcat(options) {
  var p = cp.spawn(options.adb, [
              "logcat",
              "stderr:V", "stdout:V", "GeckoConsole:V *:S"
          ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.startLogcat = startLogcat;

function clearLogcat(options) {
  var p = cp.spawn(options.adb, [
              "logcat",
              "-c"
          ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.clearLogcat = clearLogcat;

function push(options) {
  var from = options.from;
  var to = options.to;
  var folders = [];

  return onClose(mkdir({
      adb: options.adb,
      cwd: options.cwd,
      env: process.env,
      path: to
    })).
    then(function() {
      var files = fs.readdirSync(from);
      var promises = files.map(function(file) {
        var fullFromPath = path.resolve(from, file);
        var fullToPath = path.resolve(to, file);
        var stats = fs.statSync(fullFromPath);
        var isDirectory = stats.isDirectory();

        if (isDirectory) {
          folders.push({
            from: fullFromPath,
            to: fullToPath
          });
          return null;
        }
        else {
          return function() {
            console.log("push " + fullToPath);
            var p = cp.spawn(options.adb, [
                        "push",
                        fullFromPath,
                        fullToPath
                    ], makeOptions(options));
            p.stdout.pipe(process.stdout);
            p.stderr.pipe(process.stderr);
            return onClose(p);
          }
        }
      }).filter(function(func) {
        return !!func;
      });

      function doPromises() {
        if (promises.length <= 0)
          return null;
        return promises.pop()().then(doPromises);
      };

      // wait for files to be transferred
      return doPromises();
    }).
    then(function() {
      var promises = folders.map(function(folder) {
        return push({
          adb: options.adb,
          cwd: options.cwd,
          env: process.env,
          from: folder.from,
          to: folder.to
        });
      });

      // wait for folders to be transferred
      return Promise.all(promises);
    })
    .then(function() {
      return null;
    });
}
exports.push = push;

function setprop(options) {
  var p = cp.spawn(options.adb, [
                "shell",
                "setprop", "log.redirect-stdio", "false"
            ], makeOptions(options));
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  return p;
}
exports.setprop = setprop;

function getProcessPID(options) {
  return new Promise(function(resolve) {
    var p = cp.spawn(options.adb, [
                "shell",
                "ps"
            ], makeOptions(options));
    var lines = [];
    p.stdout.on("data", function (data) {
      lines.push(data.toString());
    });
    p.on("close", function () {
      for (var i = lines.length - 1; i >= 0; i--) {
        var words = lines[i].split(" ");
        var pid = words[0];
        var name = words[words.length - 1];
        if ((new RegExp(options.intent)).test(name)) {
          resolve(pid);
          return null;
        }
      }

      resolve(null);
      return null;
    });
  });
}
exports.getProcessPID = getProcessPID;

function makeOptions(options) {
  return {
    cwd: options.cwd,
    env: process.env
  };
}
