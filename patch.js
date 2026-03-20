const fs = require('fs');
const lines = fs.readFileSync('main.js', 'utf8').split('\n');
const startIndex = lines.findIndex(l => l.startsWith('function renderHome() {'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.startsWith('function saveActivities() {'));

if(startIndex > -1 && endIndex > -1) {
    const pre = lines.slice(0, startIndex);
    const post = lines.slice(endIndex);
    const newUI = fs.readFileSync('new_ui.js', 'utf8');
    fs.writeFileSync('main.js', pre.join('\n') + '\n' + newUI + '\n' + post.join('\n'));
    console.log("Successfully patched main.js");
} else {
    console.log("Could not find bounds", startIndex, endIndex);
}
