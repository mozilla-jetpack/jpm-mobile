**IMPORTANT UPDATE AS OF 2019-11-26**: The `jpm` package and its libraries are no longer maintained as Firefox no longer supports add-ons built with `jpm`. If you're building a new add-on, consider a
[WebExtension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions)
instead and check out the [web-ext](https://github.com/mozilla/web-ext)
tool which has all the same features as `jpm`. Here are some
[resources](https://wiki.mozilla.org/Add-ons/developer/communication#Migration_paths_for_developers_of_legacy_add-ons)
to help you migrate a legacy `jpm` built add-on.

<hr />

# jpm-mobile [![Dependency Status](https://david-dm.org/mozilla-jetpack/jpm-mobile.png)](https://david-dm.org/mozilla-jetpack/jpm-mobile)

## Usage

`jpm-mobile` will have two commands: `run` and `test` with details below. Some options are:

* `--adb <path>` Path to adb..
* `-b, --binary <name>` Name of Firefox binary to use (ex: nightly, beta, firefox).
* `-v, --verbose` Prints additional debugging information.

# Example

## Running An Add-on

    jpm-mobile run --adb /path/to/adb

## Test An Add-on

    jpm-mobile test --adb /path/to/adb
