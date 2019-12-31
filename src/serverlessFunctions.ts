import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { lambdaTestFile } from './extension';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import * as glob from 'glob';

export class DepNodeProvider implements vscode.TreeDataProvider<TreePart> {

	private _onDidChangeTreeData: vscode.EventEmitter<TreePart> = new vscode.EventEmitter<TreePart>();
	readonly onDidChangeTreeData: vscode.Event<TreePart> = this._onDidChangeTreeData.event;

	constructor(private workspaces: vscode.WorkspaceFolder[]) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TreePart): vscode.TreeItem {
		return element;
	}

	createServerlessNode(label: string, yml: string) {
		
	}
	getChildren(element?: TreePart): Thenable<TreePart[]> {
		if (!this.workspaces) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		if(!element) {
			const treeItems = [];
			this.workspaces.forEach(w => {
				const rootyamls = glob.sync('serverless.yml', { cwd: this.getWorkspacePath(w), nodir: true });
				const yamls = glob.sync('**(!node_modules)/serverless.yml', { cwd: this.getWorkspacePath(w), nodir: true });
				yamls.push(...rootyamls);
				yamls.forEach(item => {
					const label = this.getWorkspacePath(w);
					const yml = label + "/" + item;
					let content = null;
					if(fs.existsSync(yml))
					{
						content = parse(fs.readFileSync(yml).toString('utf-8'));
						content.root = label;
						content.path = item;
					}
					treeItems.push(new TreePart(label, TreePartType.workspace, content, w, vscode.TreeItemCollapsibleState.Collapsed, '', null, item));
				});
			});
			return Promise.resolve(treeItems);
		} else if(element.type === TreePartType.workspace) {
			if(element.yml) {
				return Promise.resolve([new TreePart('functions', TreePartType.section, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Expanded)]);
			} else {
				return Promise.resolve([]);
			}
		} else if (element.type === TreePartType.section) {
			return Promise.resolve(Object.keys(element.yml.functions).map(key => {
				return new TreePart(key, TreePartType.function, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, key, { title: 'goto function', command: 'serverlessFunctions.gotoFunction'});
			}));
		} else if (element.type === TreePartType.function) {
			return Promise.resolve([
				new TreePart('Environment', TreePartType.functionSection, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, element.label),
				new TreePart('Tests', TreePartType.functionSection, element.yml, element.workspace, vscode.TreeItemCollapsibleState.Collapsed, element.label, { title: 'Add Test', command: 'serverlessFunctions.addTest' })
			]);
		} else if(element.type === TreePartType.functionSection) {
			if(element.label === 'Environment') {
				let global = element.yml.provider?.environment;
				if(!global) {
					global = {};
				}
				let environment = element.yml.functions[element.functionName].environment
				if(!environment) {
					environment = global;
				} else {
					Object.keys(environment).forEach(key => {
						global[key] = environment[key];
					});
				}
				return Promise.resolve(Object.keys(global).map(key => {
					return new TreePart(key, TreePartType.env, element.yml, element.workspace, vscode.TreeItemCollapsibleState.None, element.functionName);
				}));
			} else if(element.label === 'Tests') {
				const vsCodePath = element.yml.root + '/.vscode';
				const testFilePath = vsCodePath + '/' + lambdaTestFile;
				if(!existsSync(vsCodePath)) {
					mkdirSync(vsCodePath);
				}
				const data = existsSync(testFilePath)? JSON.parse(readFileSync(testFilePath).toString('utf-8')) : {};
				if(data[element.yml.path] && data[element.yml.path].functions && data[element.yml.path].functions[element.functionName] && data[element.yml.path].functions[element.functionName].Tests) {
					return Promise.resolve(Object.keys(data[element.yml.path].functions[element.functionName].Tests).map(t => {
						return new TreePart(t, TreePartType.test, element.yml, element.workspace, vscode.TreeItemCollapsibleState.None, element.functionName, { title: 'debug', command: 'serverlessFunctions.debug'});
					}));
				}
			}
		}

	}

	getWorkspacePath(folder: vscode.WorkspaceFolder) {
		return (folder.uri.path.match(/\/[a-z]\:.*/))? folder.uri.path.substr(1) : folder.uri.path;
	}
}

export enum TreePartType {
	workspace = "workspace",
	section = "section",
	function = "function",
	functionSection = "functionParts",
	env = 'environmentVariable',
	test = "testCase"
}

export class TreePart extends vscode.TreeItem {
	contextValue = 'dependency';
	iconPath: { light: string, dark: string } = null;

	constructor(
		public readonly label: string,
		public readonly type: TreePartType,
		public readonly yml: any,
		public readonly workspace: vscode.WorkspaceFolder,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly functionName?: string,
		public readonly command?: vscode.Command,
		public readonly subtext?: string
	) {
		super(label, collapsibleState);
		let icon = '';
		switch(type) {
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

		if(icon) {
			this.iconPath = {
				light: path.join(__filename, '..', '..', 'resources', 'light', icon),
				dark: path.join(__filename, '..', '..', 'resources', 'dark', icon)
			};
		}
	}

	get tooltip(): string {
		return `${this.label}`;
	}

	get description(): string {
		switch(this.type) {
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
