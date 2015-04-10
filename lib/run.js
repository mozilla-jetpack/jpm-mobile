/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require('fs');
var path = require('path');
var Promise = require("bluebird");
var copy = require('fs-extra').copySync;
var profile = require("jpm/lib/profile");
var xpi = require("jpm/lib/xpi");
var includePrefs = require("jpm/lib/preferences").includePrefs;
var getID = require("jetpack-id");

var makeProfile = profile.makeProfile;
var addExtension = profile.addExtension;
var addPrefs = profile.addPrefs;

var adb = require("./adb");
var onClose = require("./process").onClose;
var fennec_prefs = require("./prefs.json");

var binary_map = require("./binaries.json");

var _INTENT_PREFIX = 'org.mozilla.';
var FENNEC_REMOTE_PATH = '/mnt/sdcard/jetpack-profile';

var mobile_utils = path.join(require.resolve("../mobile-utils/bootstrap.js"), "../..", "mobile-utils@mozilla.com.xpi");

function run(manifest, program) {
  var binary = program.binary || "";
  var binary_name = binary_map[binary] || binary || binary_map["nightly"];
  var intent = _INTENT_PREFIX + binary_name;

  var options = {
    adb: program.adb,
    cwd: process.cwd(),
    intent: intent
  };
  var profileDir;
  var xpiPath;
  var logcatP;
  var id = getID(manifest);
  console.log("jpm-mobile "+ program.command);

  var prefs_options = {
    command: program.command,
    verbose: program.verbose,
    prefs: fennec_prefs
  }

  prefs_options.prefs = includePrefs(id, prefs_options);

  return xpi(manifest, program).then(function (path) {
      xpiPath = path;
      console.log("Successfully created xpi at " + xpiPath);
    }).
    then(function() {
      console.log("Killing running Firefox instance ...");
      return onClose(adb.amForceStop(options));
    }).
    then(function() {
      console.log("Making a temporary profile");
      return makeProfile();
    }).
    then(function(profile) {
      console.log("Successfully created a temporary profile at " + profile.profileDir);
      profileDir = profile.profileDir;
      return addExtension(profile, { xpi: xpiPath });
    }).
    then(function(profile) {
      return addPrefs(profile, { prefs: fennec_prefs });
    }).
    then(function(profile) {
      console.log("Adding mobile-utils extension for better output.");
      copy(mobile_utils, path.join(profileDir, "extensions", "mobile-utils@mozilla.com.xpi"));
      return null;
    }).
    then(function() {
      console.log("Removing " + FENNEC_REMOTE_PATH);
      return onClose(adb.rm({
        adb: program.adb,
        cwd: process.cwd(),
        path: FENNEC_REMOTE_PATH
      }));
    }).
    then(function() {
      console.log("Copying profile from " + profileDir + " to " + FENNEC_REMOTE_PATH);
      return adb.push({
        adb: program.adb,
        cwd: process.cwd(),
        from: profileDir,
        to: FENNEC_REMOTE_PATH
      });
    }).
    then(function() {
      console.log("Pushed the addon to your device");
      return null;
    }).
    then(function() {
      //fs.unlinkSync(profileDir);
      fs.unlinkSync(xpiPath);
      return onClose(adb.setprop(options));
    }).
    then(function() {
      return onClose(adb.clearLogcat(options));
    }).
    then(function() {
      logcatP = adb.startLogcat(options);
      return null;
    }).
    then(function() {
      // run firefox
      console.log("Running Firefox instance ...");
      return onClose(adb.amStart({
        adb: program.adb,
        cwd: process.cwd(),
        intent: intent,
        profile: FENNEC_REMOTE_PATH
      }));
    }).
    then(function() {
      return new Promise(function(resolve) {
        logcatP.stdout.on("data", function(data) {
          if (/\d+\sof\s\d+\stests passed./.test(data)) {
            console.log("Done!");
            logcatP.kill('SIGHUP');
            resolve();
          }
        });
      })
    });
}
exports.run = run;
