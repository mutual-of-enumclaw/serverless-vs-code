"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const serverlessFunctions_1 = require("./serverlessFunctions");
const jsonOutline_1 = require("./jsonOutline");
const ftpExplorer_1 = require("./ftpExplorer");
const fileExplorer_1 = require("./fileExplorer");
const testView_1 = require("./testView");
const fs_1 = require("fs");
exports.lambdaTestFile = 'lambda-tests.json';
function activate(context) {
    // Samples of `window.registerTreeDataProvider`
    const nodeDependenciesProvider = new serverlessFunctions_1.DepNodeProvider(vscode.workspace.workspaceFolders);
    vscode.window.registerTreeDataProvider('serverlessFunctions', nodeDependenciesProvider);
    vscode.commands.registerCommand('serverlessFunctions.refreshEntry', () => nodeDependenciesProvider.refresh());
    vscode.commands.registerCommand('serverlessFunctions.debug', debugTest);
    vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
    vscode.commands.registerCommand('serverlessFunctions.addTest', editTestCases);
    vscode.commands.registerCommand('serverlessFunctions.run', (node) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
    vscode.commands.registerCommand('serverlessFunctions.gotoFunction', gotoFunction);
    const jsonOutlineProvider = new jsonOutline_1.JsonOutlineProvider(context);
    vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
    vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
    vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
    vscode.commands.registerCommand('jsonOutline.renameNode', offset => jsonOutlineProvider.rename(offset));
    vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));
    // Samples of `window.createView`
    new ftpExplorer_1.FtpExplorer(context);
    new fileExplorer_1.FileExplorer(context);
    // Test View
    new testView_1.TestView(context);
}
exports.activate = activate;
function gotoFunction(element) {
}
function getTestData(element, data = null) {
    const vsCodePath = element.yml.root + '/.vscode';
    const testFilePath = vsCodePath + '/' + exports.lambdaTestFile;
    if (!data) {
        data = fs_1.existsSync(testFilePath) ? JSON.parse(fs_1.readFileSync(testFilePath).toString('utf-8')) : null;
    }
    if (!data || !data[element.yml.path] || !data[element.yml.path].functions || !data[element.yml.path].functions[element.functionName] || !data[element.yml.path].functions[element.functionName].Tests[element.label]) {
        return;
    }
    return data[element.yml.path].functions[element.functionName].Tests[element.label];
}
function setTestData(element, testName, dataToSet, data = null) {
    const vsCodePath = element.yml.root + '/.vscode';
    const testFilePath = vsCodePath + '/' + exports.lambdaTestFile;
    if (!data) {
        data = fs_1.existsSync(testFilePath) ? JSON.parse(fs_1.readFileSync(testFilePath).toString('utf-8')) : null;
    }
    let retval = data;
    if (!retval) {
        retval = {};
    }
    if (!data[element.yml.path]) {
        data[element.yml.path] = {};
    }
    if (!data[element.yml.path].functions) {
        data[element.yml.path].functions = {};
    }
    if (!data[element.yml.path].functions[element.functionName]) {
        data[element.yml.path].functions[element.functionName] = {};
    }
    if (!data[element.yml.path].functions[element.functionName].Tests) {
        data[element.yml.path].functions[element.functionName].Tests = {};
    }
    data[element.yml.path].functions[element.functionName].Tests[testName] = dataToSet;
}
function debugTest(element) {
    return __awaiter(this, void 0, void 0, function* () {
        var isWin = process.platform === "win32";
        let serverlessPath = 'node_modules/.bin/serverless';
        let extension = isWin ? '.cmd' : '.sh';
        if (fs_1.existsSync(serverlessPath + extension)) {
            serverlessPath = "${workspaceFolder}/" + serverlessPath + extension;
        }
        else {
            if (process.env.NODE_PATH) {
                serverlessPath = `${process.env.NODE_PATH}/node_modules/.bin/serverless${extension}`;
            }
            else {
                const root = (isWin ? `${process.env.USERPROFILE}/AppData/Roaming/npm` : '/usr/local/lib/node_modules/.bin/serverless');
                serverlessPath = `${root}/node_modules/serverless/bin/serverless.js`;
            }
        }
        const testData = getTestData(element);
        if (!testData) {
            return;
        }
        let dataString = JSON.stringify(testData);
        const args = ['invoke', 'local', '--function', element.functionName, '--data', dataString];
        let serverlessFileDirPath = '${workspaceFolder}/' + element.yml.path;
        serverlessFileDirPath = serverlessFileDirPath.substr(0, serverlessFileDirPath.lastIndexOf('/'));
        const debugConfiguration = {
            args,
            console: 'internalConsole',
            cwd: serverlessFileDirPath,
            internalConsoleOptions: "neverOpen",
            name: "vscode-serverless-adapter",
            program: serverlessPath,
            request: "launch",
            type: "node",
        };
        yield vscode.debug.startDebugging(element.workspace, debugConfiguration);
        serverlessFileDirPath = serverlessFileDirPath;
    });
}
function editTestCases(element) {
    return __awaiter(this, void 0, void 0, function* () {
        const vsCodePath = element.yml.root + '/.vscode';
        const testFilePath = vsCodePath + '/' + exports.lambdaTestFile;
        if (!fs_1.existsSync(vsCodePath)) {
            fs_1.mkdirSync(vsCodePath);
        }
        let data = fs_1.existsSync(testFilePath) ? JSON.parse(fs_1.readFileSync(testFilePath).toString('utf-8')) : {};
        if (!getTestData(element)) {
            setTestData(element, "test 1", {
                "key1": "value1",
                "key2": "value2",
                "key3": "value3"
            }, data);
            fs_1.writeFileSync(testFilePath, JSON.stringify(data, null, 4));
        }
        const line = JSON.stringify(data, null, 4).split('\n').findIndex(x => x === element.functionName);
        yield vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(testFilePath.startsWith('/') ? testFilePath : '/' + testFilePath));
        yield vscode.commands.executeCommand('vscode.revealLine ', { lineNumber: line, at: 'top' });
    });
}
//# sourceMappingURL=extension.js.map