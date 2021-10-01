module.exports = {
    apps: [
        {
            name: "SuggestionsAPI",
            script: "./mod.ts",
            interpreter: "deno",
            interpreterArgs: "run --allow-net",
        },
    ],
};