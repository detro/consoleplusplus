/*
This file is part of the Console++ by Ivan De Marino <http://ivandemarino.me>.

Copyright (c) 2012, Ivan De Marino <http://ivandemarino.me>
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Ensure this module can augment the global console object
export {};

// Moved Levels interface here
interface Levels {
    NONE: number;
    OFF: number;
    ERROR: number;
    WARN: number;
    WARNING: number;
    INFO: number;
    INFORMATION: number;
    DEBUG: number;
}

declare global {
    interface Console {
        LEVELS: Levels;
        setLevel(level: number): void;
        getLevel(): number;
        getLevelName(level?: number): string;
        getLevelColor(level?: number): string;
        isLevelVisible(levelToCompare: number): boolean;
        enableColor(): void;
        disableColor(): void;
        isColored(): boolean;
        enableMessageColor(): void;
        disableMessageColor(): void;
        isMessageColored(): boolean;
        enableLevelMsg(): void;
        disableLevelMsg(): void;
        isLevelMsgPrinted(): boolean;
        enableTimestamp(): void;
        disableTimestamp(): void;
        isTimestamped(): boolean;
        enableEqualSpacing(): void;
        disableEqualSpacing(): void;
        isEqualSpaced(): boolean;
        onOutput(callback: ((formattedMessage: string, levelName: string) => void) | null): void;
        str2clr(str: string): string;
        // Standard methods are already part of the Console interface
        // error(message?: any, ...optionalParams: any[]): void;
        // warn(message?: any, ...optionalParams: any[]): void;
        // info(message?: any, ...optionalParams: any[]): void;
        // debug(message?: any, ...optionalParams: any[]): void;
        // log(message?: any, ...optionalParams: any[]): void;
    }
}

if ((console as any).LEVELS) {
    // Already loaded. No need to manipulate the "console" further.
    module.exports = console;
} else {
    enum AnsiCodesEnum {
        reset = '[0m',
        bold = '[1m',
        italic = '[3m',
        underline = '[4m',
        blink = '[5m',
        black = '[30m',
        red = '[31m',
        green = '[32m',
        yellow = '[33m',
        blue = '[34m',
        magenta = '[35m',
        cyan = '[36m',
        white = '[37m',
        grey = '[90m'
    }
    type AnsiColor = keyof typeof AnsiCodesEnum;

    // Levels interface moved up

    const _LEVELS: Levels = {
        NONE: 0,
        OFF: 0,    //< alias for "NONE"
        ERROR: 1,
        WARN: 2,
        WARNING: 2,    //< alias for "WARN"
        INFO: 3,
        INFORMATION: 3,    //< alias for "INFO"
        DEBUG: 4
    };

    const _LEVELS_COLOR: string[] = [   //< _LEVELS_COLOR position matches the _LEVELS values
        "NOCOLOR", // For NONE level, though not used directly with #color{}
        "red",
        "yellow",
        "cyan",
        "green"
    ];

    const _LEVELS_NAME: string[] = [    //< _LEVELS_NAME position matches the _LEVELS values
        "NONE ", // Added space for consistency, will be trimmed if not isEqualSpaced
        "ERROR",
        "WARN ",
        "INFO ",
        "DEBUG"
    ];

    interface OriginalConsole {
        error: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        info: (...args: any[]) => void;
        debug: (...args: any[]) => void; // console.debug might not exist in all environments, node uses console.log for it
        log: (...args: any[]) => void;
    }

    const _console: OriginalConsole = {
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console),
        // Node's console.debug is often an alias for console.log.
        // Binding console.log to _console.debug for broader compatibility if console.debug is not standard.
        debug: (typeof console.debug === 'function') ? console.debug.bind(console) : console.log.bind(console),
        log: console.log.bind(console)
    };

    let _level: number = _LEVELS.DEBUG;
    let _colored: boolean = true;
    let _messageColored: boolean = false;
    let _printLevel: boolean = true;
    let _timed: boolean = true;
    let _onOutput: ((formattedMessage: string, levelName: string) => void) | null = null;
    let _spacing: boolean = true;

    const _applyColors = function(str: string): string {
        const tag = /#([a-z]+)\{|\}/;
        let cstack: string[] = [];
        let matches: RegExpExecArray | null = null;
        let orig: string | null = null;
        let name: string | null = null;
        let code: string | undefined = undefined;

        while (tag.test(str)) {
            matches = tag.exec(str);
            if (!matches) break; // Should not happen if tag.test is true, but good for safety
            orig = matches[0];

            if (console.isColored()) {
                if (orig === '}') {
                    cstack.pop();
                } else {
                    name = matches[1];
                    if (name in AnsiCodesEnum) {
                        code = AnsiCodesEnum[name as AnsiColor];
                        cstack.push(code);
                    }
                }
                // Ensure AnsiCodesEnum.reset is always available for the replacement
                str = str.replace(orig, AnsiCodesEnum.reset + cstack.join(''));
            } else {
                str = str.replace(orig, '');
            }
        }
        return str;
    };

    const _decorateArgs = function(argsArray: IArguments, level: number): any[] {
        const args: any[] = Array.prototype.slice.call(argsArray, 1);
        let msg: any = argsArray[0];
        let levelMsg: string;

        if (typeof msg !== 'string') { // If the first arg is not a string, don't try to color/format it.
             const allArgs = Array.prototype.slice.call(argsArray);
             if (console.isLevelMsgPrinted() || console.isTimestamped()) {
                let prefix = "";
                if (console.isColored()) {
                    levelMsg = console.getLevelName(level);
                    if (!console.isEqualSpaced()) levelMsg = levelMsg.trim();
                    levelMsg = _applyColors(`#${console.getLevelColor(level)}{${levelMsg}}`);
                } else {
                    levelMsg = console.getLevelName(level);
                }
                prefix = _formatMessage("", levelMsg).trimRight(); // Get formatted prefix
                allArgs.unshift(prefix);
             }
            return allArgs;
        }


        if (console.isColored()) {
            levelMsg = console.getLevelName(level);
            if (!console.isEqualSpaced()) {
                levelMsg = levelMsg.trim();
            }
            levelMsg = _applyColors(`#${console.getLevelColor(level)}{${levelMsg}}`);
            msg = _applyColors(msg as string);

            if (console.isMessageColored()) {
                msg = _applyColors(`#${console.getLevelColor(level)}{${msg as string}}`);
            }
        } else {
            levelMsg = console.getLevelName(level);
            if (!console.isEqualSpaced()) { // also trim if not colored
                levelMsg = levelMsg.trim();
            }
        }

        msg = _formatMessage(msg as string, levelMsg);
        args.splice(0, 0, msg);
        return args;
    };

    const _formatMessage = function(msg: string, levelMsg: string): string {
        const printLevelMsg: boolean = console.isLevelMsgPrinted();
        const printTimestamp: boolean = console.isTimestamped();
        let formatted: string;

        if (printLevelMsg && printTimestamp) {
            formatted = `[${levelMsg} - ${new Date().toJSON()}] ${msg}`;
        } else if (printLevelMsg) {
            formatted = `[${levelMsg}] ${msg}`;
        } else if (printTimestamp) {
            formatted = `[${new Date().toJSON()}] ${msg}`;
        } else {
            formatted = msg;
        }

        return formatted;
    };

    const _invokeOnOutput = function(msg: any, level: number): void {
        let formattedMessage: string;
        let levelName: string;

        if (_onOutput !== null && typeof(_onOutput) === "function") {
            levelName = console.getLevelName(level);
            // If msg is not a string, stringify it for the callback, or pass as is if that's desired.
            // For now, let's assume _formatMessage handles msg appropriately or it's already a string.
            // If _decorateArgs didn't process msg (because it wasn't a string), then
            // we might just pass the raw message or its string representation.
            // The original code passed the raw 'msg' to _invokeOnOutput, which could be non-string.
            // _formatMessage expects a string. This part might need refinement based on desired behavior for non-string messages.
            if (typeof msg !== 'string') {
                // Attempt to create a sensible string representation for non-string messages for the callback
                try {
                    formattedMessage = _formatMessage(String(msg), levelName);
                } catch (e) {
                    formattedMessage = _formatMessage("[non-string message]", levelName);
                }
            } else {
                 formattedMessage = _formatMessage(msg, levelName);
            }
            _onOutput.call(null, formattedMessage, levelName);
        }
    };

    console.LEVELS = _LEVELS;

    console.setLevel = function(level: number): void {
        _level = level;
    };
    console.getLevel = function(): number {
        return _level;
    };
    console.getLevelName = function(level?: number): string {
        const targetLevel = typeof(level) === "undefined" ? _level : level;
        // Ensure level is within bounds for _LEVELS_NAME
        if (targetLevel >= 0 && targetLevel < _LEVELS_NAME.length) {
            return _LEVELS_NAME[targetLevel];
        }
        return "UNKNOWN"; // Or handle error appropriately
    };
    console.getLevelColor = function(level?: number): string {
        const targetLevel = typeof(level) === "undefined" ? _level : level;
        // Ensure level is within bounds for _LEVELS_COLOR
        if (targetLevel >= 0 && targetLevel < _LEVELS_COLOR.length) {
             return _LEVELS_COLOR[targetLevel];
        }
        return "white"; // Default color or handle error
    };
    console.isLevelVisible = function(levelToCompare: number): boolean {
        return _level >= levelToCompare;
    };

    console.enableColor = function(): void {
        _colored = true;
    };
    console.disableColor = function(): void {
        _colored = false;
    };
    console.isColored = function(): boolean {
        return _colored;
    };

    console.enableMessageColor = function(): void {
        _messageColored = true;
    };
    console.disableMessageColor = function(): void {
        _messageColored = false;
    };
    console.isMessageColored = function(): boolean {
        return _messageColored;
    };

    console.enableLevelMsg = function(): void {
        _printLevel = true;
    };
    console.disableLevelMsg = function(): void {
        _printLevel = false;
    };
    console.isLevelMsgPrinted = function(): boolean {
        return _printLevel;
    };

    console.enableTimestamp = function(): void {
        _timed = true;
    };
    console.disableTimestamp = function(): void {
        _timed = false;
    };
    console.isTimestamped = function(): boolean {
        return _timed;
    };

    console.enableEqualSpacing = function(): void {
        _spacing = true;
    };
    console.disableEqualSpacing = function(): void {
        _spacing = false;
    };
    console.isEqualSpaced = function(): boolean {
        return _spacing;
    };

    console.onOutput = function(callback: ((formattedMessage: string, levelName: string) => void) | null): void {
        _onOutput = callback;
    };

    console.str2clr = function(str: string): string {
        return console.isColored() ? _applyColors(str) : str;
    };

    // Override console methods
    console.error = function(this: Console, msg?: any, ...optionalParams: any[]): void {
        if (arguments.length > 0 && this.isLevelVisible(_LEVELS.ERROR)) {
            _console.error.apply(this, _decorateArgs(arguments, _LEVELS.ERROR));
            _invokeOnOutput(msg, _LEVELS.ERROR);
        }
    }.bind(console);

    console.warn = function(this: Console, msg?: any, ...optionalParams: any[]): void {
        if (arguments.length > 0 && this.isLevelVisible(_LEVELS.WARN)) {
            _console.warn.apply(this, _decorateArgs(arguments, _LEVELS.WARN));
            _invokeOnOutput(msg, _LEVELS.WARN);
        }
    }.bind(console);

    console.info = function(this: Console, msg?: any, ...optionalParams: any[]): void {
        if (arguments.length > 0 && this.isLevelVisible(_LEVELS.INFO)) {
            _console.info.apply(this, _decorateArgs(arguments, _LEVELS.INFO));
            _invokeOnOutput(msg, _LEVELS.INFO);
        }
    }.bind(console);

    console.debug = function(this: Console, msg?: any, ...optionalParams: any[]): void {
        if (arguments.length > 0 && this.isLevelVisible(_LEVELS.DEBUG)) {
            _console.debug.apply(this, _decorateArgs(arguments, _LEVELS.DEBUG));
            _invokeOnOutput(msg, _LEVELS.DEBUG);
        }
    }.bind(console);

    // Keep original console.log behavior unless specifically overridden for leveled logging
    // The original code explicitly states: console.log = function(msg) { if (arguments.length > 0) { _console.log.apply(this, arguments); } };
    // This means console.log itself is not decorated by default.
    // To maintain this, we ensure it's bound correctly but not passed through _decorateArgs or _invokeOnOutput in the same way as error/warn/info/debug.
    console.log = function(this: Console, msg?: any, ...optionalParams: any[]): void {
        if (arguments.length > 0) {
            _console.log.apply(this, arguments as any); // Pass arguments directly
        }
    }.bind(console);

    module.exports = console;
}
