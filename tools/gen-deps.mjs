#!/usr/bin/env node
/*
 * Generates the deps.json manifest the website reads for its Installation section.
 *
 *   node tools/gen-deps.mjs ../lambda/gradle.properties > lambda-<version>-deps.json
 *
 * Publish the result next to the client jar on the maven, as classifier "deps" with
 * extension "json", so it lands at:
 *
 *   /releases/com/lambda/lambda/<version>/lambda-<version>-deps.json
 *
 * The site fetches that path for the newest release and fills in the version chips.
 * If it is missing the page silently keeps the fallbacks baked into index.html.
 */

import { readFileSync } from 'node:fs';

// gradle.properties key -> deps.json key
const KEY_MAP = {
    minecraftVersion: 'minecraft',
    javaVersion: 'java',
    fabricLoaderVersion: 'dependencies.fabricLoader',
    fabricApiVersion: 'dependencies.fabricApi',
    kotlinFabricVersion: 'dependencies.fabricKotlin',
    baritoneVersion: 'dependencies.baritone'
};

const path = process.argv[2];
if (!path) {
    console.error('usage: gen-deps.mjs <path to gradle.properties>');
    process.exit(1);
}

const properties = Object.fromEntries(
    readFileSync(path, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.includes('='))
        .map(line => {
            const index = line.indexOf('=');
            return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        })
);

const manifest = { dependencies: {} };
for (const [source, target] of Object.entries(KEY_MAP)) {
    let value = properties[source];
    if (!value) {
        console.error(`warning: ${source} not found in ${path}`);
        continue;
    }
    // Strip build metadata: "1.13.8+kotlin.2.3.0" -> "1.13.8", "0.139.5+1.21.11" -> "0.139.5"
    value = value.split('+')[0];

    const [group, key] = target.includes('.') ? target.split('.') : [null, target];
    if (group) manifest[group][key] = value;
    else manifest[key] = value;
}

process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
