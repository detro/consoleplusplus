require("./src/console++.js");

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
require("./src/console++.js");

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
