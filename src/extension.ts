import * as vscode from 'vscode';

import { DepNodeProvider, TreePart } from './serverlessFunctions';
import { JsonOutlineProvider } from './jsonOutline';
import { FtpExplorer } from './ftpExplorer';
import { FileExplorer } from './fileExplorer';
import { TestView } from './testView';
import { fstat, openSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';

export const lambdaTestFile = 'lambda-tests.json';

export function activate(context: vscode.ExtensionContext) {

	// Samples of `window.registerTreeDataProvider`
	const nodeDependenciesProvider = new DepNodeProvider(vscode.workspace.workspaceFolders);
	vscode.window.registerTreeDataProvider('serverlessFunctions', nodeDependenciesProvider);
	vscode.commands.registerCommand('serverlessFunctions.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('serverlessFunctions.debug', debugTest);
	vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
	vscode.commands.registerCommand('serverlessFunctions.addTest', editTestCases);
	vscode.commands.registerCommand('serverlessFunctions.run', (node: TreePart) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	vscode.commands.registerCommand('serverlessFunctions.gotoFunction', gotoFunction);

	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('jsonOutline.renameNode', offset => jsonOutlineProvider.rename(offset));
	vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));

	// Samples of `window.createView`
	new FtpExplorer(context);
	new FileExplorer(context);

	// Test View
	new TestView(context);
}

function gotoFunction(element) {
	
}

function getTestData(element: TreePart, data: any = null) {
	const vsCodePath = element.yml.root + '/.vscode';
	const testFilePath = vsCodePath + '/' + lambdaTestFile;
	if(!data) {
		data = existsSync(testFilePath)? JSON.parse(readFileSync(testFilePath).toString('utf-8')) : null;
	}
	if(!data || !data[element.yml.path] || !data[element.yml.path].functions || !data[element.yml.path].functions[element.functionName] || !data[element.yml.path].functions[element.functionName].Tests[element.label]) {
		return;
	}
	return data[element.yml.path].functions[element.functionName].Tests[element.label];
}

function setTestData(element: TreePart, testName: string, dataToSet, data: any = null) {
	const vsCodePath = element.yml.root + '/.vscode';
	const testFilePath = vsCodePath + '/' + lambdaTestFile;
	if(!data) {
		data = existsSync(testFilePath)? JSON.parse(readFileSync(testFilePath).toString('utf-8')) : null;
	}
	let retval = data;
	if(!retval) {
		retval = {};
	}
	if(!data[element.yml.path]) {
		data[element.yml.path] = {};
	}
	if(!data[element.yml.path].functions) {
		data[element.yml.path].functions = {};
	}
	if(!data[element.yml.path].functions[element.functionName]) {
		data[element.yml.path].functions[element.functionName] = {};
	}
	if(!data[element.yml.path].functions[element.functionName].Tests) {
		data[element.yml.path].functions[element.functionName].Tests = {};
	}
	data[element.yml.path].functions[element.functionName].Tests[testName] = dataToSet;
}

async function debugTest(element: TreePart) {
	var isWin = process.platform === "win32";
	let serverlessPath = 'node_modules/.bin/serverless';
	let extension = isWin? '.cmd' : '.sh';
	if(existsSync(serverlessPath + extension)) {
		serverlessPath = "${workspaceFolder}/" + serverlessPath + extension;
	} else {
		if(process.env.NODE_PATH) {
			serverlessPath =  `${process.env.NODE_PATH}/node_modules/.bin/serverless${extension}`;
		} else {
			const root = (isWin? `${process.env.USERPROFILE}/AppData/Roaming/npm` : '/usr/local/lib/node_modules/.bin/serverless')
			serverlessPath =  `${root}/node_modules/serverless/bin/serverless.js`;
		}
	}
	
	const testData = getTestData(element);
	if(!testData) {
		return;
	}
	let dataString = JSON.stringify(testData);
	writeFileSync(element.workspace.uri.fsPath + '/.vscode/serverless.test.json', dataString);
	
	let serverlessFileDirPath = '${workspaceFolder}/' + element.yml.path;
	serverlessFileDirPath = serverlessFileDirPath.substr(0, serverlessFileDirPath.lastIndexOf('/'));

	const dataPath = serverlessFileDirPath.split('/').splice(0, 1).map(x => '../').join('') + '.vscode/serverless.test.json'
	const args = ['invoke', 'local', '--function', element.functionName, '--path', dataPath];
	
    const debugConfiguration: vscode.DebugConfiguration = {
      args,
	  console: 'internalConsole',
	  cwd: serverlessFileDirPath,
      internalConsoleOptions: "neverOpen",
      name: "vscode-serverless-adapter",
      program: serverlessPath,
      request: "launch",
      type: "node",
    };

	await vscode.debug.startDebugging(element.workspace, debugConfiguration);
	
	serverlessFileDirPath = serverlessFileDirPath;
}

async function editTestCases(element: TreePart) {
	const vsCodePath = element.yml.root + '/.vscode';
	const testFilePath = vsCodePath + '/' + lambdaTestFile;
	if(!existsSync(vsCodePath)) {
		mkdirSync(vsCodePath);
	}
	
	let data = existsSync(testFilePath)? JSON.parse(readFileSync(testFilePath).toString('utf-8')) : {};
	if(!getTestData(element)) {
		setTestData(element, "test 1", {
				"key1": "value1",
				"key2": "value2",
				"key3": "value3"
			}, data);
		writeFileSync(testFilePath, JSON.stringify(data, null, 4));
	}

	const line = JSON.stringify(data, null, 4).split('\n').findIndex(x => x === element.functionName);

	await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(testFilePath.startsWith('/')? testFilePath : '/' + testFilePath));
	await vscode.commands.executeCommand('vscode.revealLine ', { lineNumber: line, at: 'top'});
}