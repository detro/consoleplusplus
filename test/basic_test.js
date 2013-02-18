require("../console++.js");

console.log("A (boring) console.log message");

console.debug("An (irrelevant) console.debug message");

console.info("A (somewhat important) console.info message");

console.warn("A (quite important) console.warning message");

console.error("A (critical!) console.error message");


var message = "#red{this} is #cyan{a} #yellow{nice} message";
console.debug(message);


function printLevels() {
    console.log("test");
    console.debug("debug "+console.str2clr("#cyan{verde}"));
    console.info("info");
    console.warn("warning #blink{blink}")
    console.error("error");
}

printLevels();

console.setLevel(console.LEVELS.DEBUG);
printLevels();

console.disableTimestamp();
console.setLevel(console.LEVELS.INFO);
printLevels();
console.enableTimestamp();
require("../console++.js");

console.setLevel(console.LEVELS.WARN);
console.disableColor();
printLevels();
console.enableColor();

console.enableMessageColor();
console.setLevel(console.LEVELS.ERROR);
printLevels();

for (i in console) {
    console.log(i + " " + typeof(console[i]));
}
