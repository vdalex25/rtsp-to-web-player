module.exports = {
    printWidth: 100,
    bracketSpacing: false,
    useTabs: true,
    singleQuote: true,
    trailingComma: 'all',
    arrowParens: 'avoid',
    endOfLine: 'lf',
    overrides: [
        {
            files: "*.js",
            options: {
                parser: "flow"
            }
        }
    ]
};
