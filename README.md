# jpm-mobile [![Dependency Status](https://david-dm.org/erikvold/jpm-mobile.png)](https://david-dm.org/erikvold/jpm-mobile)

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
