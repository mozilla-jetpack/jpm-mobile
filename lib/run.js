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

var makeProfile = profile.makeProfile;
var addExtension = profile.addExtension;

var adb = require("./adb");
var onClose = require("./process").onClose;

var _INTENT_PREFIX = 'org.mozilla.';
var FENNEC_REMOTE_PATH = '/mnt/sdcard/jetpack-profile';

function run(manifest, program) {
  var options = {
    adb: program.adb,
    cwd: process.cwd(),
    intent: _INTENT_PREFIX + "fennec"
  };
  var profileDir;
  var xpiPath;
  var logcatP;

  return xpi(manifest, program).then(function (path) {
      xpiPath = path;
      console.log("Successfully created xpi at " + xpiPath);
      console.log("Making a temporary profile");
      return makeProfile();
    }).
    then(function(profile) {
      console.log("Successfully created a temporary profile at " + profile.profileDir);
      profileDir = profile.profileDir;
      return addExtension(profile, { xpi: xpiPath });
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
      console.log("Pushed the addon to your device")
      return onClose(adb.ls({
        adb: program.adb,
        cwd: process.cwd(),
        path: FENNEC_REMOTE_PATH
      }));
    }).
    then(function() {
      //fs.unlinkSync(profileDir);
      fs.unlinkSync(xpiPath);
      return onClose(adb.setprop(options));
    }).
    /*
    then(function() {
      return adb.getProcessPID(options);
    }).
    */
    then(function(pid) {
      console.log("Killing running Firefox instance ...");
      return onClose(adb.amForceStop(options));
    }).
    then(function() {
      return onClose(adb.clearLogcat(options));
    }).
    then(function() {
      logcatP = onClose(adb.startLogcat(options));
      return null;
    }).
    then(function() {
      // run firefox
      console.log("Running Firefox instance ...");
      return onClose(adb.amStart({
        adb: program.adb,
        cwd: process.cwd(),
        intent: _INTENT_PREFIX + "fennec",
        profile: FENNEC_REMOTE_PATH
      }));
    }).
    then(logcatP);
}
exports.run = run;
