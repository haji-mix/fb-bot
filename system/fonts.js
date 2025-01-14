const text = require("fontstyles");

const fonts = [
    "thin", "italic", "bold", "underline", "strike", "monospace",
    "roman", "bubble", "squarebox", "origin"
].reduce((acc, style) => ({
        ...acc,
        [style]: msg => text[style](msg)
    }), {});
    
module.exports = {
    fonts
}