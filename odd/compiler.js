"use strict";

import Util from "util";
import { overwrite, capitalise, wait } from "../util.js";
import Path from "path";
import Pipeline from "../Pipeline/Pipeline.js";
import File from "../File/File.js";
import Url from 'url';
import metalexer from "./metalexer.js";
import metaparser from "./metaparser.js";
import stringify from "./stringify.js";
import fs from "fs";

const hyphenLike = /^[-–]/; // Some terminals/hosts replace hyphens with en/em-dashes... wtf???
const files = process.argv
	.slice(2)
	.filter(arg => !hyphenLike.test(arg));

if (!files.length) {
	console.error("No target file specified.");
	process.exit(1);
}

const pathFromHere = url =>
	"file://"
	+ Path.resolve(
			Path.dirname(
				Url.fileURLToPath(import.meta.url)),
		url);

const pipes = [
	new Pipeline()
		.stage("reading file",
			() => File.readStream(pathFromHere(files[0])))
		.stage("generating lexer lexer",
			stream => metalexer.lex(stream))
		.stage("parsing parser parser",
			tokens => metaparser.parse(tokens))
		.stage("generating parser",
			result => stringify(result.AST()))
		.stage("saving parser",
			data => File.writeStream(pathFromHere("../TEST.js"), data))
		.stage("parsing original file with generated parser",
			async () => {
				const parser = (await import(pathFromHere("../TEST.js"))).default;
				const tokens = metalexer.lex(File.readStream(pathFromHere(files[0])));
				const program = await parser.parse(tokens);
				console.log(program.AST());
			})
		.stage("cleanup",
			async () => await fs.promises.unlink(Url.fileURLToPath(pathFromHere("../TEST.js"))))
];

Object.assign(Util.inspect.styles, {
	bigint: "magenta",
	boolean: "magenta",
	null: "magenta",
	undefined: "magenta",
	number: "magenta",
	date: "cyan",
	symbol: "cyan",
	string: "yellow",
	regexp: "yellow"
});

const inspect = result => console.log(Util.inspect(result, false, Infinity, true));

pipes.map(
	pipe => pipe
		.process()
		.then(result => inspect(result))
		.catch(error => overwrite(
			`❌ ${capitalise(error.name || "Internal")} ERROR: ${(error?.message?.stack) ? error.message.stack.split("\n").filter(ln => !(/internal\//.test(ln))).join("\n") : error.message || error}`)));