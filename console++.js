/**
 * Console++ - enhance your "console".
 */

if (console.LEVELS) {
    // Already loaded. No need to manipulate the "console" further.
    // NOTE: NodeJS already caches modules. This is just defensive coding.
    exports = console;
    return;
}

// private:
var _ANSICODES = {
        'reset'     : '\033[0m',
        'bold'      : '\033[1m',
        'italic'    : '\033[3m',
        'underline' : '\033[4m',
        'blink'     : '\033[5m',
        'black'     : '\033[30m',
        'red'       : '\033[31m',
        'green'     : '\033[32m',
        'yellow'    : '\033[33m',
        'blue'      : '\033[34m',
        'magenta'   : '\033[35m',
        'cyan'      : '\033[36m',
        'white'     : '\033[37m'
    },
    _LEVELS     = {
        ERROR       : 0,
        WARN        : 1,
        WARNING     : 1,    //< just to please my OCD
        INFO        : 2,
        INFORMATION : 2,    //< just to please my OCD
        DEBUG       : 3
    },
    _LEVELS_COLOR = [   //< _LEVELS_COLOR position matches the _LEVELS values
        "red",
        "yellow",
        "cyan",
        "green"
    ],
    _LEVELS_NAME = [    //< _LEVELS_NAME position matches the _LEVELS values
        "ERROR",
        "WARN ",
        "INFO ",
        "DEBUG"
    ],
    _console    = {
        error   : console.error,
        warn    : console.warn,
        info    : console.info,
        debug   : console.log,
        log     : console.log
    },
    _level = _LEVELS.DEBUG,
    _colored = true,
    _messageColored = false,
    _timed = true
    ;

/**
 * Take a string and apply console ANSI colors for expressions "#color{msg}"
 * NOTE: Does nothing if "console.colored === false".
 *
 * @param str Input String
 * @returns Same string but with colors applied
 */
var _applyColors = function(str) {
    var tag = /#([a-z]+)\{|\}/,
        cstack = [],
        matches = null,
        orig = null,
        name = null,
        code = null;

    while (tag.test(str)) {
        matches = tag.exec(str);
        orig = matches[0];

        if (console.isColored()) {
            if (orig === '}') {
                cstack.pop();
            } else {
                name = matches[1];
                if (name in _ANSICODES) {
                    code = _ANSICODES[name];
                    cstack.push(code);
                }
            }

            str = str.replace(orig, _ANSICODES.reset + cstack.join(''));
        } else {
            str = str.replace(orig, '');
        }
    }
    return str;
};

/**
 * Decorate the Arguments passed to the console methods we override.
 * First element, the message, is now colored, timed and more (based on config).
 *
 * @param argsArray Array of arguments to decorate
 * @param level Logging level to apply (regulates coloring and text)
 * @returns Array of Arguments, decorated.
 */
var _decorateArgs = function(argsArray, level) {
    var args = Array.prototype.slice.call(argsArray, 1),
        msg = argsArray[0],
        levelMsg;

    if (console.isColored()) {
        levelMsg = _applyColors("#" + console.getLevelColor(level) + "{" + console.getLevelName(level) + "}");
        if (console.isMessageColored()) {
            msg = _applyColors("#" + console.getLevelColor(level) + "{" + msg + "}");
        }
    } else {
        levelMsg = console.getLevelName(level);
    }

    if (console.isTimestamped()) {
        msg = "[" + levelMsg + " - " + new Date().toJSON() + "] " + msg;
    } else {
        msg = "[" + levelMsg + "] " + msg;
    }

    args.splice(0, 0, msg);

    return args;
};


// public:
// CONSTANT: Logging Levels
console.LEVELS  = _LEVELS;

// Set/Get Level
console.setLevel = function(level) {
    _level = level;
};
console.getLevel = function() {
    return _level;
};
console.getLevelName = function(level) {
    return _LEVELS_NAME[typeof(level) === "undefined" ? _level : level];
};
console.getLevelColor = function(level) {
    return _LEVELS_COLOR[typeof(level) === "undefined" ? _level : level];
};
console.isLevelVisible = function(levelToCompare) {
    return _level >= levelToCompare;
};

// Enable/Disable Colored Output
console.enableColor = function() {
    _colored = true;
};
console.disableColor = function() {
    _colored = false;
};
console.isColored = function () {
    return _colored;
};

// Enable/Disable Colored Message Output
console.enableMessageColor = function() {
    _messageColored = true;
};
console.disableMessageColor = function() {
    _messageColored = false;
};
console.isMessageColored = function() {
    return _messageColored;
};

// Enable/Disable Timestamped Output
console.enableTimestamp = function() {
    _timed = true;
};
console.disableTimestamp = function() {
    _timed = false;
};
console.isTimestamped = function() {
    return _timed;
};

// Decodes coloring markup in string
console.str2clr = function(str) {
    if (console.isColored) {
        return _applyColors(str);
    } else {
        return str;
    }
};

// Overrides some key "console" Object methods
console.error = function() {
    if (arguments.length > 0 && this.isLevelVisible(_LEVELS.ERROR)) {
        _console.error.apply(this, _decorateArgs(arguments, _LEVELS.ERROR));
    }
};
console.warn = function() {
    if (arguments.length > 0 && this.isLevelVisible(_LEVELS.WARN)) {
        _console.warn.apply(this, _decorateArgs(arguments, _LEVELS.WARN));
    }
};
console.info = function() {
    if (arguments.length > 0 && this.isLevelVisible(_LEVELS.INFO)) {
        _console.info.apply(this, _decorateArgs(arguments, _LEVELS.INFO));
    }
};
console.debug = function() {
    if (arguments.length > 0 && this.isLevelVisible(_LEVELS.DEBUG)) {
        _console.debug.apply(this, _decorateArgs(arguments, _LEVELS.DEBUG));
    }
};
console.log = function() {
    if (arguments.length > 0) {
        _console.log.apply(this, arguments);
    }
};

exports = console;
