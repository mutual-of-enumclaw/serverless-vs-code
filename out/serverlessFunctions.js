"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const yaml_1 = require("yaml");
const extension_1 = require("./extension");
const fs_1 = require("fs");
const glob = require("glob");
class DepNodeProvider {
    constructor(workspaces) {
        this.workspaces = workspaces;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    createServerlessNode(label, yml) {
    }
    getChildren(element) {
        var _a;
        if (!this.workspaces) {
            vscode.window.showInformationMessage('No dependency in empty workspace');
            return Promise.resolve([]);
        }
        if (!element) {
            const treeItems = [];
            this.workspaces.forEach(w => {
                const rootyamls = glob.sync('serverless.yml', { cwd: this.getWorkspacePath(w), nodir: true });
                const yamls = glob.sync('**(!node_modules)/serverless.yml', { cwd: this.getWorkspacePath(w), nodir: true });
                yamls.push(...rootyamls);
                yamls.forEach(item => {
                    const label = this.getWorkspacePath(w);
                    const yml = label + "/" + item;
                    let content = null;
                    if (fs.existsSync(yml)) {
                        content = yaml_1.parse(fs.readFileSync(yml).toString('utf-8'));
                        content.root = label;
                        content.path = item;
                    }
                    treeItems.push(new TreePart(label, TreePartType.workspace, content, w, vscode.TreeItemCollapsibleState.Collapsed, '', null, item));
                });
            });
            return Promise.resolve(treeItems);
        }
        else if (element.type === TreePartType.workspace) {
            if (element.yml) {
                return Promise.resolve([new TreePart('functions', TreePartType.section, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Expanded)]);
            }
            else {
                return Promise.resolve([]);
            }
        }
        else if (element.type === TreePartType.section) {
            return Promise.resolve(Object.keys(element.yml.functions).map(key => {
                return new TreePart(key, TreePartType.function, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, key, { title: 'goto function', command: 'serverlessFunctions.gotoFunction' });
            }));
        }
        else if (element.type === TreePartType.function) {
            return Promise.resolve([
                new TreePart('Environment', TreePartType.functionSection, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, element.label),
                new TreePart('Tests', TreePartType.functionSection, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, element.label, { title: 'Add Test', command: 'serverlessFunctions.addTest' })
            ]);
        }
        else if (element.type === TreePartType.functionSection) {
            if (element.label === 'Environment') {
                let global = (_a = element.yml.provider) === null || _a === void 0 ? void 0 : _a.environment;
                if (!global) {
                    global = {};
                }
                let environment = element.yml.functions[element.functionName].environment;
                if (!environment) {
                    environment = global;
                }
                else {
                    Object.keys(environment).forEach(key => {
                        global[key] = environment[key];
                    });
                }
                return Promise.resolve(Object.keys(global).map(key => {
                    return new TreePart(key, TreePartType.env, element.yml, element.workspace, vscode.TreeItemCollapsibleState.None, element.functionName);
                }));
            }
            else if (element.label === 'Tests') {
                const vsCodePath = element.yml.root + '/.vscode';
                const testFilePath = vsCodePath + '/' + extension_1.lambdaTestFile;
                if (!fs_1.existsSync(vsCodePath)) {
                    fs_1.mkdirSync(vsCodePath);
                }
                const data = fs_1.existsSync(testFilePath) ? JSON.parse(fs_1.readFileSync(testFilePath).toString('utf-8')) : {};
                if (data[element.yml.path] && data[element.yml.path].functions && data[element.yml.path].functions[element.functionName] && data[element.yml.path].functions[element.functionName].Tests) {
                    return Promise.resolve(Object.keys(data[element.yml.path].functions[element.functionName].Tests).map(t => {
                        return new TreePart(t, TreePartType.test, element.yml, element.workspace, vscode.TreeItemCollapsibleState.None, element.functionName, { title: 'debug', command: 'serverlessFunctions.debug' });
                    }));
                }
            }
        }
    }
    getWorkspacePath(folder) {
        return (folder.uri.path.match(/\/[a-z]\:.*/)) ? folder.uri.path.substr(1) : folder.uri.path;
    }
}
exports.DepNodeProvider = DepNodeProvider;
var TreePartType;
(function (TreePartType) {
    TreePartType["workspace"] = "workspace";
    TreePartType["section"] = "section";
    TreePartType["function"] = "function";
    TreePartType["functionSection"] = "functionParts";
    TreePartType["env"] = "environmentVariable";
    TreePartType["test"] = "testCase";
})(TreePartType = exports.TreePartType || (exports.TreePartType = {}));
class TreePart extends vscode.TreeItem {
    constructor(label, type, yml, workspace, collapsibleState, functionName, command, subtext) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.yml = yml;
        this.workspace = workspace;
        this.collapsibleState = collapsibleState;
        this.functionName = functionName;
        this.command = command;
        this.subtext = subtext;
        this.contextValue = 'dependency';
        this.iconPath = null;
        let icon = '';
        switch (type) {
            case TreePartType.workspace:
                this.contextValue = label;
                icon = 'dependency.svg';
                break;
            case TreePartType.functionSection:
                this.contextValue = label;
                break;
            case TreePartType.section:
                this.contextValue = label;
                break;
            case TreePartType.function:
                this.contextValue = type.toString();
                icon = 'lambda.svg';
                break;
            case TreePartType.test:
                this.contextValue = type.toString();
                icon = 'pending.svg';
                break;
            case TreePartType.env:
                this.contextValue = type.toString();
                icon = 'string.svg';
                break;
            // default:
            // 	this.contextValue = type.toString();
            // 	icon = 'dependency.svg';
        }
        if (icon) {
            this.iconPath = {
                light: path.join(__filename, '..', '..', 'resources', 'light', icon),
                dark: path.join(__filename, '..', '..', 'resources', 'dark', icon)
            };
        }
    }
    get tooltip() {
        return `${this.label}`;
    }
    get description() {
        switch (this.type) {
            case TreePartType.section:
                return 'section';
            case TreePartType.workspace:
                return this.subtext;
            case TreePartType.function:
                return 'lambda function';
            default:
                return '';
        }
    }
}
exports.TreePart = TreePart;
//# sourceMappingURL=serverlessFunctions.js.map